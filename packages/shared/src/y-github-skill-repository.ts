/**
 * Remote skill source URL parsing and normalization.
 *
 * Handles all supported remote skill source formats:
 *   - GitHub HTTPS URLs: https://github.com/org/repo[/tree/branch]
 *   - GitHub shorthand: org/repo
 *   - skills.sh URLs: https://skills.sh/org/repo[/skill]
 *   - skills.sh key-style: org/repo/skill
 *   - npx skills add commands
 *
 * The canonical representation is always a GitHub HTTPS URL, because all
 * remote skill sources ultimately resolve to a git repository on GitHub.
 * skills.sh URLs are resolved to their backing GitHub repos with provenance
 * preserved for source tracking in the company skill metadata.
 */

// ── Types ──────────────────────────────────────────────────────────────

/** Classification of a remote skill source. */
export type SkillSourceKind = 'github' | 'skills-sh';

/** Fully-parsed remote skill source with canonical GitHub URL and provenance. */
export interface ParsedRemoteSkillSource {
  /** Source registry or platform classification. */
  kind: SkillSourceKind;
  /** Canonical GitHub HTTPS URL for repository cloning and scanning. */
  githubUrl: string;
  /** Repository full name (org/repo, lowercase). */
  fullName: string;
  /** Optional branch, tag, or commit SHA to pin. */
  trackingRef?: string;
  /** When a specific skill slug is targeted within a multi-skill repo. */
  skillSlug?: string;
  /** The raw user-provided input for diagnostics and error messages. */
  originalInput: string;
  /** Original skills.sh URL preserved for provenance tracking in skill metadata. */
  originalSkillsShUrl?: string;
  /** Non-fatal warnings accumulated during parsing. */
  warnings: string[];
}

// ── Constants ──────────────────────────────────────────────────────────

const TRACKING_REF_MAX_LENGTH = 255;
const TRACKING_REF_FORBIDDEN = /[\x00-\x20\x7f~^:?*\[\\]/;
const GITHUB_HOST = 'github.com';
const SKILLS_SH_HOST = 'skills.sh';
const GITHUB_REPO_PATH = /^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/tree\/(.+?))?\/?$/;
const SKILLS_SH_PATH = /^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?\/?$/i;
const KEY_STYLE_THREE_PART = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const KEY_STYLE_TWO_PART = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const NPX_SKILLS_ADD = /^npx\s+skills\s+add\s+/i;

// ── Unified parser ─────────────────────────────────────────────────────

/**
 * Parse any remote skill source input into canonical form.
 *
 * Accepts:
 *   - `https://github.com/org/repo[/tree/branch]` — direct GitHub URLs
 *   - `org/repo` — GitHub shorthand
 *   - `org/repo/skill` — skills.sh key-style shorthand
 *   - `https://skills.sh/org/repo[/skill]` — skills.sh registry URLs
 *   - `npx skills add <url> [--skill <name>]` — CLI commands
 *
 * @throws {SkillSourceParseError} when input is empty, non-HTTPS, or otherwise invalid
 * @param rawInput — user-provided source string
 * @returns parsed source with canonical GitHub URL and provenance metadata
 */
export function parseSkillSourceInput(rawInput: string): ParsedRemoteSkillSource {
  const trimmed = rawInput.trim();
  const warnings: string[] = [];

  if (!trimmed) {
    throw new SkillSourceParseError(
      'Skill source is required. Enter a GitHub URL, skills.sh URL, or org/repo shorthand.',
    );
  }

  let source = trimmed;
  let requestedSkillSlug: string | null = null;

  // ── Step 1: Unwrap npx skills add commands ──────────────────────────
  if (NPX_SKILLS_ADD.test(trimmed)) {
    const result = unwrapNpxSkillsAdd(trimmed);
    source = result.source;
    requestedSkillSlug = result.skillSlug;
    if (result.warning) warnings.push(result.warning);
  }

  const normalized = source.trim();
  if (!normalized) {
    throw new SkillSourceParseError('No source URL found in the npx skills add command.');
  }

  // ── Step 2: Normalize remote URLs ──────────────────────────────────
  const isUrl = /^https?:\/\//i.test(normalized);
  const canonicalSource = isUrl ? normalizeRemoteUrl(normalized) : normalized;

  // ── Step 3: URL-based detection ────────────────────────────────────
  if (isUrl) {
    const parsed = tryParseUrl(canonicalSource);
    if (parsed) {
      // skills.sh: https://skills.sh/org/repo[/skill]
      if (parsed.hostname === SKILLS_SH_HOST || parsed.hostname === `www.${SKILLS_SH_HOST}`) {
        const match = SKILLS_SH_PATH.exec(parsed.pathname);
        if (match) {
          const [, owner, repo, skillSlugRaw] = match;
          validateOwnerRepo(owner!, repo!);
          return {
            kind: 'skills-sh',
            githubUrl: canonicalGitHubUrl(owner!, repo!),
            fullName: `${owner}/${repo}`.toLowerCase(),
            skillSlug: normalizeSkillSlug(skillSlugRaw ?? null) || requestedSkillSlug || undefined,
            originalInput: trimmed,
            originalSkillsShUrl: canonicalSource,
            warnings,
          };
        }
      }

      // GitHub: https://github.com/org/repo[/tree/branch]
      if (parsed.hostname === GITHUB_HOST) {
        const match = GITHUB_REPO_PATH.exec(parsed.pathname);
        if (match) {
          const [, owner, repo, ref] = match;
          validateOwnerRepo(owner!, repo!);
          const trackingRef = ref ? decodeURIComponent(ref) : undefined;
          if (trackingRef && !isValidTrackingRef(trackingRef)) {
            throw new SkillSourceParseError(
              `"${trackingRef}" is not a valid branch, tag, or commit reference.`,
            );
          }
          return {
            kind: 'github',
            githubUrl: canonicalGitHubUrl(owner!, repo!),
            fullName: `${owner}/${repo}`.toLowerCase(),
            trackingRef,
            skillSlug: normalizeSkillSlug(requestedSkillSlug ?? null) || undefined,
            originalInput: trimmed,
            warnings,
          };
        }
      }

      // Non-HTTPS protocols are rejected
      if (parsed.protocol !== 'https:') {
        throw new SkillSourceParseError(
          'Remote skill sources must use HTTPS. Enter a GitHub or skills.sh URL.',
        );
      }
    }
  }

  // ── Step 4: Key-style shorthand ────────────────────────────────────
  // org/repo/skill → skills.sh key-style
  if (KEY_STYLE_THREE_PART.test(canonicalSource)) {
    const [owner, repo, skillSlugRaw] = canonicalSource.split('/');
    validateOwnerRepo(owner!, repo!);
    return {
      kind: 'skills-sh',
      githubUrl: canonicalGitHubUrl(owner!, repo!),
      fullName: `${owner}/${repo}`.toLowerCase(),
      skillSlug: normalizeSkillSlug(skillSlugRaw!) || undefined,
      originalInput: trimmed,
      originalSkillsShUrl: `https://${SKILLS_SH_HOST}/${owner}/${repo}/${skillSlugRaw}`,
      warnings,
    };
  }

  // org/repo → GitHub shorthand
  if (KEY_STYLE_TWO_PART.test(canonicalSource)) {
    validateOwnerRepo(...canonicalSource.split('/') as [string, string]);
    return {
      kind: 'github',
      githubUrl: `https://${GITHUB_HOST}/${canonicalSource.toLowerCase()}`,
      fullName: canonicalSource.toLowerCase(),
      skillSlug: normalizeSkillSlug(requestedSkillSlug ?? null) || undefined,
      originalInput: trimmed,
      warnings,
    };
  }

  // ── Step 5: Reject non-HTTPS ──────────────────────────────────────
  if (isUrl && !/^https:\/\//i.test(canonicalSource)) {
    throw new SkillSourceParseError(
      'Remote skill sources must use HTTPS. Enter a GitHub or skills.sh URL.',
    );
  }

  throw new SkillSourceParseError(
    'Enter a valid GitHub repository URL (https://github.com/org/repo), skills.sh URL, or org/repo shorthand.',
  );
}

// ── Targeted parsers ───────────────────────────────────────────────────

/**
 * Parse a GitHub repository URL specifically, extracting the minimal
 * info needed for git operations and snapshot downloads.
 *
 * Only accepts `https://github.com/org/repo[/tree/branch]` — no shorthand,
 * no skills.sh. Use {@link parseSkillSourceInput} for user-facing input
 * that may contain shorthand or skills.sh URLs.
 *
 * @throws {SkillSourceParseError} when the URL is not a valid GitHub HTTPS repo URL
 */
export function parseGitHubRepositoryUrl(value: string): {
  fullName: string;
  repositoryUrl: string;
  trackingRef?: string;
} {
  const trimmed = value.trim();
  if (trimmed.includes('\\')) {
    throw new SkillSourceParseError('Repository URL must not contain backslashes.');
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new SkillSourceParseError('Enter a valid HTTPS GitHub repository URL.');
  }
  if (url.protocol !== 'https:' || url.hostname !== GITHUB_HOST || url.port) {
    throw new SkillSourceParseError('Only HTTPS GitHub repository URLs are accepted (https://github.com/org/repo).');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new SkillSourceParseError('Repository URL must not contain credentials, query strings, or fragments.');
  }
  const match = GITHUB_REPO_PATH.exec(url.pathname);
  if (!match) {
    throw new SkillSourceParseError('Repository URL must point to an org/repo path (https://github.com/org/repo).');
  }
  const owner = match[1]!;
  const repo = match[2]!.replace(/\.git$/, '');
  validateOwnerRepo(owner, repo);
  const trackingRef = match[3] ? decodeURIComponent(match[3]) : undefined;
  if (trackingRef && !isValidTrackingRef(trackingRef)) {
    throw new SkillSourceParseError(
      `"${trackingRef}" is not a valid branch, tag, or commit reference.`,
    );
  }
  const fullName = `${owner}/${repo}`;
  return {
    fullName,
    repositoryUrl: `https://${GITHUB_HOST}/${fullName.toLowerCase()}`,
    ...(trackingRef ? { trackingRef } : {}),
  };
}

/**
 * Non-throwing check: is the given value a valid GitHub HTTPS repository URL?
 *
 * Use this in Zod validators and client-side pre-checks where you need
 * a boolean result without catching exceptions.
 */
export function isValidGitHubRepositoryUrl(value: string): boolean {
  try {
    parseGitHubRepositoryUrl(value);
    return true;
  } catch {
    return false;
  }
}

// ── Public helpers ─────────────────────────────────────────────────────

/**
 * Build a canonical lowercase GitHub HTTPS URL from owner and repo.
 *
 * @example normalizeGitHubUrl('PaperclipAI', 'Agent-Skills')
 *   // => 'https://github.com/paperclipai/agent-skills'
 */
export function normalizeGitHubUrl(owner: string, repo: string): string {
  return canonicalGitHubUrl(owner, repo);
}

/**
 * Validate a git tracking reference (branch, tag, or commit SHA).
 * Returns the normalized reference or throws {@link SkillSourceParseError}.
 */
export function validateTrackingRef(ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed) throw new SkillSourceParseError('Branch, tag, or commit reference is required.');
  if (!isValidTrackingRef(trimmed)) {
    throw new SkillSourceParseError(
      `"${trimmed}" is not a valid branch, tag, or commit reference. ` +
      'Avoid spaces, backslashes, and special characters like ~ ^ : ? * [ ].',
    );
  }
  return trimmed;
}

// ── Error type ─────────────────────────────────────────────────────────

/** Typed parse error with an actionable user-facing message. */
export class SkillSourceParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillSourceParseError';
  }
}

// ── Internal helpers ───────────────────────────────────────────────────

function canonicalGitHubUrl(owner: string, repo: string): string {
  return `https://${GITHUB_HOST}/${owner.toLowerCase()}/${repo.toLowerCase().replace(/\.git$/, '')}`;
}

function validateOwnerRepo(owner: string, repo: string): void {
  const cleanRepo = repo.replace(/\.git$/, '');
  for (const [label, part] of [['Owner', owner], ['Repository', cleanRepo]] as const) {
    if (!part || part === '.' || part === '..') {
      throw new SkillSourceParseError(`${label} name "${part}" is not valid.`);
    }
    if (part.length > 100) {
      throw new SkillSourceParseError(`${label} name exceeds GitHub's 100-character limit.`);
    }
    if (!/^[A-Za-z0-9_.-]+$/.test(part)) {
      throw new SkillSourceParseError(
        `${label} name "${part}" contains invalid characters. Use only letters, digits, hyphens, underscores, and dots.`,
      );
    }
    if (part.startsWith('-') || part.endsWith('-')) {
      throw new SkillSourceParseError(
        `${label} name "${part}" cannot start or end with a hyphen.`,
      );
    }
    if (part.includes('--')) {
      throw new SkillSourceParseError(
        `${label} name "${part}" cannot contain consecutive hyphens.`,
      );
    }
  }
}

function isValidTrackingRef(ref: string): boolean {
  if (ref.length > TRACKING_REF_MAX_LENGTH) return false;
  if (TRACKING_REF_FORBIDDEN.test(ref)) return false;
  if (ref.includes('..')) return false;
  if (ref.includes('@{')) return false;
  if (ref === '@') return false;
  if (ref.endsWith('.lock')) return false;
  const parts = ref.split('/');
  for (const part of parts) {
    if (!part || part.startsWith('.') || part.endsWith('.')) return false;
  }
  return true;
}

function tryParseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.username || url.password || value.includes('\\')) return null;
    return url;
  } catch {
    return null;
  }
}

function normalizeRemoteUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4);
    }
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

function unwrapNpxSkillsAdd(command: string): {
  source: string;
  skillSlug: string | null;
  warning?: string;
} {
  const warning = 'Detected an `npx skills add` command. Using the embedded source URL.';
  const tokens = extractCommandTokens(command);
  const addIndex = tokens.findIndex(
    (token, index) =>
      token === 'add' &&
      index > 0 &&
      tokens[index - 1]?.toLowerCase() === 'skills',
  );

  let source = '';
  let skillSlug: string | null = null;

  if (addIndex >= 0) {
    source = tokens[addIndex + 1] ?? '';
    for (let i = addIndex + 2; i < tokens.length; i++) {
      const token = tokens[i]!;
      if (token === '--skill') {
        skillSlug = normalizeSkillSlug(tokens[i + 1] ?? null);
        i += 1;
        continue;
      }
      if (token.startsWith('--skill=')) {
        skillSlug = normalizeSkillSlug(token.slice('--skill='.length));
      }
    }
  }

  return { source: source.trim(), skillSlug, ...(warning ? { warning } : {}) };
}

function extractCommandTokens(raw: string): string[] {
  const matches = raw.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  return matches.map((token) => token.replace(/^['"]|['"]$/g, ''));
}

function normalizeSkillSlug(slug: string | null): string | null {
  if (!slug) return null;
  const trimmed = slug.trim();
  if (!trimmed || trimmed.length > 100) return null;
  const cleaned = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || null;
}