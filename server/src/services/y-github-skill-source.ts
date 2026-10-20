/**
 * Remote skill source scanner — discovers, audits, and inventories skill
 * packages from GitHub repositories (backed by a git snapshot).
 *
 * ## Architecture
 *
 * The scan pipeline runs in sequential phases:
 *
 *   1. **Connect** — validate the repository URL and authenticate
 *   2. **Resolve** — fetch repository metadata and pin to an immutable commit
 *   3. **Download** — acquire a git tree snapshot
 *   4. **Index** — walk the tree to find SKILL.md roots and assign file ownership
 *   5. **Audit** — read each package's files, run security audit, inspect frontmatter
 *   6. **Complete** — (repository mode only) aggregate files into a single package
 *
 * Each phase reports progress so the caller can surface live status to the user.
 *
 * ## Security
 *
 * - Every file is audited before inclusion — unsafe files trigger errors
 * - File size, total byte, and package count limits prevent resource exhaustion
 * - Paths are validated to prevent traversal outside the package directory
 * - The caller's auth context flows through from {@link YGithubRead}
 *
 * @module y-github-skill-source
 */

import path from 'node:path';
import { MAX_REPOSITORY_BYTES, MAX_REPOSITORY_FILES, repositoryPackageInspection } from './skill-repository-package.js';
import type {
  CompanySkillVersionFileInventoryEntry,
  SkillSourceCandidate,
  SkillSourceDiscovery,
  SkillSourcePreviewRequest,
  SkillSourceFilePreview,
  SkillSourceScanUpdate,
  SkillSourceScanProgress,
} from '@paperclipai/shared';
import {
  parseFrontmatterMarkdown,
  parseGitHubRepositoryUrl,
  type SkillSourceKind,
} from '@paperclipai/shared';
import { notFound, unprocessable } from '../errors.js';
import { assertSkillSnapshotPath, snapshotFile, skillFileBytes } from './skill-snapshot.js';
import { indexSkillPackagePaths, inspectSkillPackage } from './skill-package-inspection.js';
import { auditSkillSnapshot, classifyInventoryKind } from './company-skills.js';

import type { GitSkillSnapshot, GitSkillSnapshotOptions, GitSkillTreeEntry as TreeEntry } from './skill-source-git-snapshot.js';

// ── Public types ───────────────────────────────────────────────────────

/**
 * Abstracted GitHub read capability provided by the auth / access layer.
 *
 * The read function fetches REST API paths. `openSnapshot` provides a
 * streaming git tree download. `withScan` wraps the operation in a
 * rate-limited lease when available.
 */
export interface YGithubRead {
  /** Fetch a GitHub REST API path (e.g. `/repos/org/repo`). */
  (apiPath: string, signal?: AbortSignal): Promise<unknown>;
  /** Rate-limit the scan operation under a company + caller lease. */
  withScan?: <T>(operation: () => Promise<T>) => Promise<T>;
  /** Open a git tree snapshot for the given repository and ref. */
  openSnapshot: (
    input: { repositoryUrl: string; ref: string; commitSha?: string },
    options?: GitSkillSnapshotOptions,
  ) => Promise<GitSkillSnapshot>;
  /** Connection id that was actually authorized for this scan. */
  readonly connectionId?: string | null;
}

/** A fully-inventoried skill discovered during scanning. */
export type DiscoveredSkill = SkillSourceCandidate & {
  files: CompanySkillVersionFileInventoryEntry[];
};

/** Complete scan result including raw discovered skills. */
export type ScannedSkillSource = SkillSourceDiscovery & {
  /** Where the source was discovered (github, skills-sh). */
  sourceKind?: SkillSourceKind;
  /** Original skills.sh URL for provenance tracking. */
  originalSkillsShUrl?: string;
  skills: DiscoveredSkill[];
  defaultBranch: string;
  repositoryFiles?: CompanySkillVersionFileInventoryEntry[];
};

// ── Scan limits ────────────────────────────────────────────────────────

/** Maximum size of a single file in a skill package. */
const MAX_FILE_BYTES = 1_024 * 1_024; // 1 MB
/** Maximum total bytes across all scanned packages. */
const MAX_SCAN_BYTES = 100 * 1_024 * 1_024; // 100 MB
/** Maximum number of skill packages in one repository. */
const MAX_SCAN_PACKAGES = 1_000;
/** Maximum number of files across all skill packages. */
const MAX_SCAN_FILES = 10_000;
/** Maximum path length for any entry. */
const MAX_PATH_LENGTH = 4_096;
/** Maximum directory depth. */
const MAX_PATH_DEPTH = 64;

// ── URL parsing (backward compatible) ──────────────────────────────────

/**
 * Parse and validate a GitHub repository URL.
 *
 * @throws {Error} When the URL is not a valid HTTPS GitHub repository URL.
 */
export function parseSkillRepository(url: string): {
  fullName: string;
  repositoryUrl: string;
  trackingRef?: string;
} {
  return parseGitHubRepositoryUrl(url);
}

// ── Scan options ───────────────────────────────────────────────────────

export interface SkillScanOptions {
  /** Abort signal to cancel an in-progress scan. */
  signal?: AbortSignal;
  /** Live progress callback — receives phase updates and per-candidate results. */
  onProgress?: (event: SkillSourceScanUpdate) => void | Promise<void>;
  /**
   * When false (the default), discovered files are retained in the result.
   * Set to true for discovery-only scans (e.g. the source preview flow)
   * to save memory by omitting file contents from the response.
   */
  retainFiles?: boolean;
}

// ── Scan input ─────────────────────────────────────────────────────────

type SkillScanInput = {
  packageMode?: 'skills' | 'repository';
  repositoryUrl: string;
  trackingRef?: string;
  commitSha?: string;
  onlySkillPath?: string;
  /** Source provenance — propagated from the URL parser. */
  sourceKind?: SkillSourceKind;
  /** Original skills.sh URL preserved for metadata. */
  originalSkillsShUrl?: string;
};

// ── Main entry point ───────────────────────────────────────────────────

/**
 * Scan a GitHub repository for skill packages.
 *
 * Wraps the internal scanner in a rate-limited lease when the read provider
 * supports it (board / agent access layers both do).
 *
 * @param input — repository URL and optional branch/commit/mode
 * @param providerRead — authenticated GitHub read capability
 * @param options — signal, progress callback, retainFiles toggle
 * @returns complete scan result with discovered skills and metadata
 */
export function scanYGithubSkills(
  input: SkillScanInput,
  providerRead: YGithubRead,
  options: SkillScanOptions = {},
): Promise<ScannedSkillSource> {
  const scan = () => scanRepository(input, providerRead, options);
  return providerRead.withScan ? providerRead.withScan(scan) : scan();
}

// ── Core scanner ───────────────────────────────────────────────────────

async function scanRepository(
  input: SkillScanInput,
  providerRead: YGithubRead,
  options: SkillScanOptions,
): Promise<ScannedSkillSource> {
  // ── Setup: signal-aware read + progress tracker ────────────────────
  const read = createSignalAwareReader(providerRead, options.signal);
  const progress = createProgressTracker(options);

  await progress.report();

  // ── Phase 1: Connect — validate URL + fetch repo metadata ──────────
  const { repo, canonical, trackingRef, resolvedCommit } =
    await resolveRepositoryAndCommit(input, read, progress, options);

  // ── Phase 2: Download — acquire git tree snapshot ──────────────────
  progress.setPhase('downloading');
  await progress.report();
  const snapshot = await providerRead.openSnapshot(
    {
      repositoryUrl: canonical.repositoryUrl,
      ref: trackingRef,
      commitSha: resolvedCommit.sha,
    },
    {
      signal: options.signal,
      onDownload: async (download) => {
        progress.state.download = download;
        await progress.report();
      },
    },
  );

  try {
    // Validate the snapshot's own commit SHA
    const commit = { sha: snapshot.commitSha };
    if (!/^[a-f0-9]{40}$/i.test(commit.sha)) {
      throw unprocessable('Git did not return an immutable commit.');
    }

    // ── Phase 3: Index — find SKILL.md roots and build file inventories ──
    progress.setPhase('listing');
    delete progress.state.download;
    await progress.report();

    const repositoriesAndInventories = buildPackageInventories(
      snapshot.entries,
      input,
    );
    const {
      roots,
      rootsByDirectory,
      selectedRoots,
      inventories,
      warnings,
      repositoryInventory,
      repositoryPaths,
      readable,
    } = repositoriesAndInventories;

    // ── Pre-fetch repository-mode blobs in one batch ──────────────────
    const preloadedBlobs: Map<string, Buffer> | undefined =
      readable && snapshot.readBlobs
        ? await snapshot.readBlobs(readable, options.signal)
        : undefined;

    // ── Phase 4: Audit — read files, audit each package ──────────────
    progress.setPhase('checking');
    progress.state.totalSkills = selectedRoots.length;
    progress.state.currentPath = null;
    await progress.report();

    const { skills, blobs } = await scanSkillPackages(
      selectedRoots,
      rootsByDirectory,
      inventories,
      snapshot,
      repo,
      commit,
      repositoryPaths,
      progress,
      options,
      preloadedBlobs,
    );

    // ── Phase 5: Repository mode (optional) ─────────────────────────
    let repositoryFiles: CompanySkillVersionFileInventoryEntry[] | undefined;
    let repositoryPackage: ReturnType<typeof repositoryPackageInspection> | undefined;

    if (input.packageMode === 'repository') {
      const result = await scanRepositoryMode(
        repositoryInventory!,
        snapshot,
        blobs,
        roots,
        repositoryFiles,
        warnings,
        skills,
        rootsByDirectory,
        options,
        commit,
        progress,
      );
      repositoryFiles = result.repositoryFiles;
      repositoryPackage = result.repositoryPackage;
      // skills may have been mutated (repo mode re-audits with omitted files)
    }

    // ── Phase 6: Assemble result ────────────────────────────────────
    return {
      ...(input.packageMode ? { packageMode: input.packageMode } : {}),
      ...(input.sourceKind ? { sourceKind: input.sourceKind } : {}),
      ...(input.originalSkillsShUrl ? { originalSkillsShUrl: input.originalSkillsShUrl } : {}),
      ...(repositoryPackage ? { repositoryPackage } : {}),
      ...(repositoryFiles && options.retainFiles !== false ? { repositoryFiles } : {}),
      connectionId: providerRead.connectionId ?? null,
      repositoryId: String(repo.id),
      repositoryUrl: `https://github.com/${repo.full_name.toLowerCase()}`,
      fullName: repo.full_name,
      trackingRef,
      commitSha: commit.sha,
      defaultBranch: repo.default_branch,
      candidates: skills.map(({ files: _files, ...candidate }) => candidate),
      warnings,
      skills,
    };
  } finally {
    await snapshot.release();
  }
}

// ── Phase 1: Repository resolution ─────────────────────────────────────

interface ResolvedRepository {
  repo: { id: number; full_name: string; default_branch: string };
  canonical: ReturnType<typeof parseSkillRepository>;
  trackingRef: string;
  resolvedCommit: { sha: string };
}

/**
 * Validate the repository URL, fetch repo metadata from GitHub, and
 * resolve the tracking ref (branch/tag) to an immutable commit SHA.
 *
 * Moving branches are re-resolved on every scan so that repeated
 * discovery can reuse cached bytes without hiding new commits.
 */
async function resolveRepositoryAndCommit(
  input: SkillScanInput,
  read: ReturnType<typeof createSignalAwareReader>,
  progress: ReturnType<typeof createProgressTracker>,
  options: SkillScanOptions,
): Promise<ResolvedRepository> {
  const parsed = parseSkillRepository(input.repositoryUrl);
  const repo = (await read(`/repos/${parsed.fullName}`)) as {
    id: number;
    full_name: string;
    default_branch: string;
  };

  if (!repo.id || !repo.full_name || !repo.default_branch) {
    throw unprocessable('GitHub returned incomplete repository information.');
  }

  const canonical = parseSkillRepository(
    `https://github.com/${repo.full_name}`,
  );

  const requestedRef = input.trackingRef || parsed.trackingRef;
  const trackingRef =
    !requestedRef || requestedRef === 'HEAD'
      ? repo.default_branch
      : requestedRef;

  // Resolve moving branches to an immutable commit for caller-scoped
  // cache lookup. Repeated discovery reuses bytes without hiding new commits.
  const resolvedCommit = input.commitSha
    ? { sha: input.commitSha }
    : ((await read(
        `/repos/${canonical.fullName}/commits/${encodeURIComponent(trackingRef)}`,
      )) as { sha: string });

  if (!/^[a-f0-9]{40}$/i.test(resolvedCommit.sha)) {
    throw unprocessable('GitHub did not return an immutable commit.');
  }

  return { repo, canonical, trackingRef, resolvedCommit };
}

// ── Phase 3: Package inventory building ────────────────────────────────

interface PackageInventories {
  roots: TreeEntry[];
  rootsByDirectory: Map<string, TreeEntry[]>;
  selectedRoots: TreeEntry[];
  inventories: Map<string, TreeEntry[]>;
  warnings: string[];
  repositoryInventory: TreeEntry[] | null;
  repositoryPaths: ReturnType<typeof indexSkillPackagePaths>;
  /** Pre-filtered readable entries for batch blob pre-fetch in repository mode. */
  readable?: TreeEntry[];
}

/**
 * Walk the git tree to find SKILL.md entrypoints, assign each file to
 * its nearest package root, and enforce scan limits.
 *
 * File-to-package ownership is computed once via memoized ancestors —
 * this avoids a full-tree pass for every individual skill package.
 */
function buildPackageInventories(
  entries: TreeEntry[],
  input: SkillScanInput,
): PackageInventories {
  // Validate every entry path
  for (const entry of entries) {
    assertSkillSnapshotPath(entry.path);
    if (
      entry.path.length > MAX_PATH_LENGTH ||
      entry.path.split('/').length > MAX_PATH_DEPTH
    ) {
      throw unprocessable(
        `Repository paths exceed the ${MAX_PATH_LENGTH.toLocaleString()} character or ${MAX_PATH_DEPTH}-level scan limit.`,
      );
    }
  }

  const repositoryPaths = indexSkillPackagePaths(
    entries.map((e) => e.path),
  );

  // Find all SKILL.md files
  const roots = entries.filter(
    (e) =>
      e.type === 'blob' &&
      /(^|\/)skill\.md$/i.test(e.path) &&
      ['100644', '100755'].includes(e.mode),
  );

  // Group roots by directory (detect duplicates)
  const rootsByDirectory = new Map<string, TreeEntry[]>();
  for (const root of roots) {
    const dir = path.posix.dirname(root.path);
    const siblings = rootsByDirectory.get(dir) ?? [];
    siblings.push(root);
    rootsByDirectory.set(dir, siblings);
  }

  // Filter to selected roots
  const selectedRoots = roots
    .filter(
      (root) =>
        input.packageMode === 'repository' ||
        !input.onlySkillPath ||
        root.path === input.onlySkillPath,
    )
    .sort((a, b) => a.path.localeCompare(b.path));

  if (selectedRoots.length > MAX_SCAN_PACKAGES) {
    throw unprocessable(
      `Repository exceeds the ${MAX_SCAN_PACKAGES.toLocaleString()} skill package scan limit.`,
    );
  }

  // Build file-to-owner index with memoized ancestors
  const owners = new Map<string, string | null>(
    [...rootsByDirectory.keys()].map((dir) => [dir, dir]),
  );
  const inventories = new Map<string, TreeEntry[]>();
  const selectedDirectories = new Set(
    selectedRoots.map((root) => path.posix.dirname(root.path)),
  );

  for (const entry of entries) {
    if (entry.type === 'tree') continue;
    let dir = path.posix.dirname(entry.path);
    const ancestors: string[] = [];
    while (!owners.has(dir)) {
      ancestors.push(dir);
      if (dir === '.') {
        owners.set(dir, null);
        break;
      }
      dir = path.posix.dirname(dir);
    }
    const owner = owners.get(dir) ?? null;
    for (const ancestor of ancestors) owners.set(ancestor, owner);
    if (owner !== null && selectedDirectories.has(owner)) {
      const inventory = inventories.get(owner) ?? [];
      inventory.push(entry);
      inventories.set(owner, inventory);
    }
  }

  // Enforce file and byte limits before reading
  let expandedFiles = 0;
  let declaredBytes = 0;
  for (const root of selectedRoots) {
    const inventory =
      inventories.get(path.posix.dirname(root.path)) ?? [];
    expandedFiles += inventory.length;
    if (expandedFiles > MAX_SCAN_FILES) {
      throw unprocessable(
        `Skill packages exceed the ${MAX_SCAN_FILES.toLocaleString()} file scan limit.`,
      );
    }
    for (const entry of inventory) {
      if (
        entry.type === 'blob' &&
        ['100644', '100755'].includes(entry.mode) &&
        (entry.size ?? 0) <= MAX_FILE_BYTES
      ) {
        declaredBytes += entry.size ?? 0;
      }
    }
    if (declaredBytes > MAX_SCAN_BYTES) {
      throw unprocessable(
        'Skill packages exceed the 100 MB scan limit.',
      );
    }
  }

  // Collect structural warnings (symlinks, submodules)
  const warnings = entries
    .filter((e) => e.mode === '120000' || e.type === 'commit')
    .map(
      (e) =>
        `${e.path} — ${e.mode === '120000' ? 'Symlink' : 'Submodule'} couldn’t be included.`,
    );

  // Repository mode inventory
  const repositoryInventory =
    input.packageMode === 'repository'
      ? entries.filter((entry) => entry.type !== 'tree')
      : null;

  if (
    repositoryInventory &&
    repositoryInventory.length > MAX_REPOSITORY_FILES
  ) {
    throw unprocessable(
      `Repository package exceeds the ${MAX_REPOSITORY_FILES.toLocaleString()} file limit.`,
    );
  }

  const readable = repositoryInventory?.filter(
    (entry) =>
      entry.type === 'blob' &&
      ['100644', '100755'].includes(entry.mode) &&
      (entry.size ?? 0) <= MAX_FILE_BYTES,
  );

  if (
    readable &&
    readable.reduce((sum, entry) => sum + (entry.size ?? 0), 0) >
      MAX_REPOSITORY_BYTES
  ) {
    throw unprocessable(
      'Repository package exceeds the 61 MB runtime limit.',
    );
  }

  return {
    roots,
    rootsByDirectory,
    selectedRoots,
    inventories,
    warnings,
    repositoryInventory,
    repositoryPaths,
    /** Pre-filtered readable entries for batch blob pre-fetch in repository mode. */
    readable: readable ?? undefined,
  };
}

// ── Phase 4: Per-package scanning ──────────────────────────────────────

interface ScanSkillPackagesResult {
  skills: DiscoveredSkill[];
  blobs: Map<string, Buffer>;
}

/**
 * Scan each selected skill package: read its files from the git snapshot,
 * audit for security issues, extract frontmatter metadata, and build
 * the package inspection manifest.
 */
async function scanSkillPackages(
  selectedRoots: TreeEntry[],
  rootsByDirectory: Map<string, TreeEntry[]>,
  inventories: Map<string, TreeEntry[]>,
  snapshot: GitSkillSnapshot,
  repo: { full_name: string },
  commit: { sha: string },
  repositoryPaths: ReturnType<typeof indexSkillPackagePaths>,
  progress: ReturnType<typeof createProgressTracker>,
  options: SkillScanOptions,
  /** Pre-fetched blobs from repository mode to avoid redundant downloads. */
  preloadedBlobs?: Map<string, Buffer>,
): Promise<ScanSkillPackagesResult> {
  // Start with any pre-fetched blobs; on-demand reads fill the rest.
  const blobs: Map<string, Buffer> = preloadedBlobs ?? new Map();

  let totalBytes = 0;

  const readBlob = async (entry: TreeEntry): Promise<Buffer | null> => {
    if ((entry.size ?? 0) > MAX_FILE_BYTES) return null;
    let bytes = blobs.get(entry.sha);
    if (!bytes) {
      options.signal?.throwIfAborted();
      bytes = await snapshot.readBlob(entry, options.signal);
      if (bytes.length > MAX_FILE_BYTES) return null;
      blobs.set(entry.sha, bytes);
    }
    // Reused blobs still count toward the total (each package gets a copy)
    totalBytes += bytes.length;
    if (totalBytes > MAX_SCAN_BYTES) {
      throw unprocessable('Skill packages exceed the 100 MB scan limit.');
    }
    return bytes;
  };

  const skills: DiscoveredSkill[] = [];

  for (const root of selectedRoots) {
    const discovered = await scanSingleSkillPackage(
      root,
      rootsByDirectory,
      inventories,
      readBlob,
      repo,
      commit,
      repositoryPaths,
      progress,
      options,
    );
    skills.push(discovered);
    options.signal?.throwIfAborted();
  }

  return { skills, blobs };
}

/**
 * Read, audit, and inspect a single skill package rooted at a SKILL.md file.
 */
async function scanSingleSkillPackage(
  root: TreeEntry,
  rootsByDirectory: Map<string, TreeEntry[]>,
  inventories: Map<string, TreeEntry[]>,
  readBlob: (entry: TreeEntry) => Promise<Buffer | null>,
  repo: { full_name: string },
  commit: { sha: string },
  repositoryPaths: ReturnType<typeof indexSkillPackagePaths>,
  progress: ReturnType<typeof createProgressTracker>,
  options: SkillScanOptions,
): Promise<DiscoveredSkill> {
  const dir = path.posix.dirname(root.path);
  const prefix = dir === '.' ? '' : `${dir}/`;
  const inventory = inventories.get(dir) ?? [];

  progress.state.currentPath = root.path;
  progress.state.checkedFiles = 0;
  progress.state.totalFiles = inventory.length;
  await progress.report();

  const files: CompanySkillVersionFileInventoryEntry[] = [];
  const fileWarnings: string[] = [];
  let error: string | null =
    rootsByDirectory.get(dir)!.length > 1
      ? 'Multiple SKILL.md entrypoints share this package directory.'
      : null;

  for (const entry of inventory) {
    progress.state.currentPath = entry.path;
    await progress.report();
    progress.state.checkedFiles++;

    // Skip non-blob entries
    if (
      !['100644', '100755'].includes(entry.mode) ||
      entry.type !== 'blob'
    ) {
      fileWarnings.push(
        `${entry.path} — ${entry.mode === '120000' ? 'Symlink' : 'Submodule'} couldn’t be included.`,
      );
      continue;
    }

    const bytes = await readBlob(entry);
    if (!bytes) {
      fileWarnings.push(
        `${entry.path} — Exceeds the 1 MB file limit; not included.`,
      );
      continue;
    }

    const relative =
      entry.path === root.path
        ? 'SKILL.md'
        : entry.path.slice(prefix.length);
    const kind =
      relative !== 'SKILL.md' &&
      (entry.mode === '100755' ||
        bytes.subarray(0, 2).toString() === '#!')
        ? 'script'
        : classifyInventoryKind(relative);
    files.push(snapshotFile(relative, kind, bytes, entry.mode === '100755'));
  }

  // Extract SKILL.md frontmatter
  const markdown = files.find((f) => f.path === 'SKILL.md');
  if (!markdown) error = 'SKILL.md couldn’t be included.';

  const frontmatter =
    markdown && markdown.encoding !== 'base64'
      ? parseFrontmatterMarkdown(markdown.content).frontmatter
      : {};

  if (markdown?.encoding === 'base64') {
    error = 'SKILL.md must contain UTF-8 text.';
  }

  const name =
    typeof frontmatter.name === 'string' && frontmatter.name.trim()
      ? frontmatter.name.trim()
      : path.posix.basename(dir) || repo.full_name;

  const description =
    typeof frontmatter.description === 'string'
      ? frontmatter.description
      : null;

  // Security audit
  const findings = !error ? await auditSkillSnapshot(files) : [];
  error ??=
    findings
      .filter((f) => f.severity === 'error')
      .map((f) => `${f.path ?? root.path}: ${f.message}`)
      .join(' ') || null;

  const inspection = {
    ...inspectSkillPackage(
      root.path,
      files,
      repositoryPaths,
      frontmatter,
      findings,
    ),
    commitSha: commit.sha,
  };
  inspection.warnings.push(...fileWarnings);

  // Notify caller of this candidate
  await options.onProgress?.({
    type: 'candidate',
    candidate: {
      path: root.path,
      name,
      description,
      fileCount: inventory.length,
      error,
    },
  });

  progress.state.checkedSkills++;
  await progress.report();

  return {
    path: root.path,
    name,
    description,
    fileCount: inventory.length,
    error,
    warnings: inspection.warnings,
    inspection,
    files: options.retainFiles === false ? [] : files,
  };
}

// ── Phase 5: Repository mode ───────────────────────────────────────────

interface RepositoryModeResult {
  repositoryFiles: CompanySkillVersionFileInventoryEntry[] | undefined;
  repositoryPackage: ReturnType<typeof repositoryPackageInspection> | undefined;
}

/**
 * When the scan is in repository mode, aggregate all files into a single
 * package, run a security audit, and reconcile individual skill packages
 * against the repository-wide audit findings.
 */
async function scanRepositoryMode(
  inventory: TreeEntry[],
  snapshot: GitSkillSnapshot,
  blobs: Map<string, Buffer>,
  roots: TreeEntry[],
  _repositoryFiles: CompanySkillVersionFileInventoryEntry[] | undefined,
  warnings: string[],
  skills: DiscoveredSkill[],
  rootsByDirectory: Map<string, TreeEntry[]>,
  options: SkillScanOptions,
  commit: { sha: string },
  progress: ReturnType<typeof createProgressTracker>,
): Promise<RepositoryModeResult> {
  const packageWarnings = [...warnings];
  let totalBytes = 0;
  const repositoryFiles: CompanySkillVersionFileInventoryEntry[] = [];

  progress.state.currentPath = null;
  progress.state.checkedFiles = 0;
  progress.state.totalFiles = inventory.length;

  for (const entry of inventory) {
    options.signal?.throwIfAborted();
    if (
      !['100644', '100755'].includes(entry.mode) ||
      entry.type !== 'blob'
    ) {
      continue;
    }
    let bytes = blobs.get(entry.sha);
    if (!bytes) {
      bytes = await snapshot.readBlob(entry, options.signal);
      if (!bytes || bytes.length > MAX_FILE_BYTES) {
        packageWarnings.push(
          `${entry.path} — Exceeds the 1 MB file limit; not included.`,
        );
        continue;
      }
      blobs.set(entry.sha, bytes);
    }
    totalBytes += bytes.length;
    if (totalBytes > MAX_REPOSITORY_BYTES) {
      throw unprocessable(
        'Repository package exceeds the 61 MB runtime limit.',
      );
    }

    const kind =
      entry.mode === '100755' ||
      bytes.subarray(0, 2).toString() === '#!'
        ? 'script'
        : classifyInventoryKind(entry.path);

    repositoryFiles.push(
      snapshotFile(entry.path, kind, bytes, entry.mode === '100755'),
    );

    progress.state.currentPath = entry.path;
    progress.state.checkedFiles++;
    await progress.report();
  }

  // Audit the full repository
  const findings = await auditSkillSnapshot(repositoryFiles, false);
  const unsafe = findings.filter(
    (f) =>
      f.severity === 'error' &&
      ['remote_fetch_exec', 'secret_exfiltration'].includes(f.code),
  );

  if (unsafe.some((f) => !f.path)) {
    throw unprocessable(
      'Repository audit could not identify an unsafe file.',
    );
  }

  const omitted = new Map(
    unsafe.map((f) => [
      f.path!,
      `${f.path} — ${f.message} File not included.`,
    ]),
  );

  const safeRepositoryFiles = repositoryFiles.filter(
    (file) => !omitted.has(file.path),
  );

  const repositoryPackage = repositoryPackageInspection(
    safeRepositoryFiles,
    roots.map((root) => root.path),
    [
      ...new Set([
        ...packageWarnings,
        ...omitted.values(),
        ...findings
          .filter(
            (f) =>
              f.severity === 'error' && !omitted.has(f.path!),
          )
          .map((f) => `${f.path}: ${f.message}`),
      ]),
    ],
    null,
  );

  // Reconcile individual skill packages against repository audit
  const included = indexSkillPackagePaths(
    safeRepositoryFiles.map((file) => file.path),
  );
  const byPath = new Map(
    safeRepositoryFiles.map((file) => [file.path, file]),
  );

  for (const skill of skills) {
    if (!skill.inspection) continue;
    const dir = path.posix.dirname(skill.path);
    const repositoryPath = (relative: string) =>
      relative === 'SKILL.md'
        ? skill.path
        : path.posix.join(dir, relative);

    const omittedWarnings = skill.inspection.files.flatMap((file) => {
      const warning = omitted.get(repositoryPath(file.path));
      return warning ? [warning] : [];
    });

    if (omittedWarnings.length > 0) {
      const supported = skill.inspection.files.flatMap((file) => {
        const original = byPath.get(repositoryPath(file.path));
        return original
          ? [
              {
                ...original,
                path: file.path,
                kind:
                  file.path === 'SKILL.md'
                    ? ('skill' as const)
                    : original.kind === 'script'
                      ? ('script' as const)
                      : classifyInventoryKind(file.path),
              },
            ]
          : [];
      });

      const markdown = supported.find((f) => f.path === 'SKILL.md');
      const frontmatter =
        markdown && markdown.encoding !== 'base64'
          ? parseFrontmatterMarkdown(markdown.content).frontmatter
          : {};

      const remainingFindings =
        await auditSkillSnapshot(supported);

      skill.error =
        rootsByDirectory.get(dir)!.length > 1
          ? 'Multiple SKILL.md entrypoints share this package directory.'
          : remainingFindings
              .filter((f) => f.severity === 'error')
              .map((f) => `${f.path}: ${f.message}`)
              .join(' ') || null;

      const fileWarnings = skill.inspection.warnings.filter(
        (w) =>
          w.includes('not included') ||
          w.includes('couldn’t be included'),
      );

      skill.inspection = {
        ...inspectSkillPackage(
          skill.path,
          supported,
          included,
          frontmatter,
          remainingFindings,
        ),
        commitSha: commit.sha,
      };
      skill.inspection.warnings.push(
        ...fileWarnings,
        ...omittedWarnings,
      );
      skill.warnings = skill.inspection.warnings;
      skill.fileCount = supported.length;
      skill.files = options.retainFiles === false ? [] : supported;
    }

    if (skill.inspection) {
      skill.inspection.references = skill.inspection.references.filter(
        (ref) => !included.has(ref.resolvedPath),
      );
    }
  }

  return { repositoryFiles: safeRepositoryFiles, repositoryPackage };
}

// ── File preview ───────────────────────────────────────────────────────

/**
 * Re-authorize the caller and re-audit a single file from a skill package.
 *
 * Never trusts a client-supplied manifest — the file is re-read from the
 * git snapshot at the pinned commit and re-audited.
 *
 * @throws When the commit doesn't match, the skill is missing, or the file
 *   is not included in the package.
 */
export async function previewYGithubSkillFile(
  input: SkillSourcePreviewRequest,
  read: YGithubRead,
): Promise<SkillSourceFilePreview> {
  const scan = await scanYGithubSkills(
    { ...input, onlySkillPath: input.skillPath },
    read,
  );

  if (
    scan.commitSha.toLowerCase() !== input.commitSha.toLowerCase()
  ) {
    throw unprocessable(
      'The preview commit did not match the requested snapshot.',
    );
  }

  const skill = scan.skills.find(
    (candidate) => candidate.path === input.skillPath,
  );
  if (!skill) {
    throw notFound('Skill package not found at this commit.');
  }

  const file =
    input.packageMode === 'repository'
      ? scan.repositoryFiles
      : skill.files;
  const manifest =
    input.packageMode === 'repository'
      ? scan.repositoryPackage?.files
      : skill.inspection?.files;

  const matchedFile = file?.find((f) => f.path === input.filePath);
  const matchedManifest = manifest?.find(
    (f) => f.path === input.filePath,
  );

  if (!matchedFile || !matchedManifest) {
    throw notFound('File is not included in this skill package.');
  }

  const bytes = skillFileBytes(matchedFile);
  const limit = 64 * 1_024; // 64 KB preview limit

  return {
    file: matchedManifest,
    content:
      matchedManifest.encoding === 'base64'
        ? null
        : bytes.subarray(0, limit).toString('utf8'),
    truncated:
      matchedManifest.encoding !== 'base64' && bytes.length > limit,
    commitSha: scan.commitSha,
  };
}

// ── Internal helpers ───────────────────────────────────────────────────

/**
 * Create a signal-aware wrapper around the GitHub read function.
 * Every call checks the abort signal before and after the fetch.
 */
function createSignalAwareReader(
  providerRead: YGithubRead,
  signal?: AbortSignal,
) {
  return async (apiPath: string): Promise<unknown> => {
    signal?.throwIfAborted();
    const result = await providerRead(apiPath, signal);
    signal?.throwIfAborted();
    return result;
  };
}

/**
 * Progress tracker that accumulates scan state and reports to the caller.
 */
function createProgressTracker(options: SkillScanOptions) {
  const state: SkillSourceScanProgress = {
    type: 'progress',
    phase: 'connecting',
    totalSkills: null,
    checkedSkills: 0,
    currentPath: null,
    checkedFiles: 0,
    totalFiles: null,
  };

  const report = async () => {
    options.signal?.throwIfAborted();
    await options.onProgress?.({ ...state });
  };

  const setPhase = (
    phase: SkillSourceScanProgress['phase'],
  ) => {
    state.phase = phase;
  };

  return { state, report, setPhase };
}