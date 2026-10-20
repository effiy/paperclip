/**
 * GitHub access layer for remote skill source scanning.
 *
 * Provides authenticated GitHub API read capability tailored to the caller
 * (board user or running agent). Handles:
 *
 *   - **Agent auth** — resolves GitHub credentials from the agent's
 *     active run via {@link resolveGitHubOperationCredentials}.
 *   - **Board auth** — iterates the user's authorized GitHub connections
 *     and grants via {@link toolAccessService}, with automatic 401 retry
 *     (token refresh).
 *   - **Public access** — falls back to unauthenticated requests for
 *     public repositories when no connection is required.
 *   - **Rate limiting** — enforces per-company, per-caller scan leases
 *     to prevent concurrent scan storms.
 *   - **Git snapshot** — delegates git tree downloads to
 *     {@link openGitSkillSnapshot} with cache scoping.
 *
 * ## Auth candidate ordering
 *
 * For board users with multiple GitHub connections, candidates are tried
 * in priority order: the most recently successful connection first, then
 * remaining connections, and finally unauthenticated access as the last
 * resort.
 *
 * ## Error handling
 *
 * HTTP errors are classified with specific error codes so callers can
 * distinguish transient failures (rate limits, auth expiry) from
 * permanent ones (repo not found, access denied).
 *
 * @module skill-source-y-github-access
 */

import type { Request } from 'express';
import type { Db } from '@paperclipai/db';
import { forbidden, unprocessable } from '../errors.js';
import { toolAccessService } from './tool-access.js';
import { resolveGitHubOperationCredentials } from './github-operation-credentials.js';
import type { YGithubRead } from './y-github-skill-source.js';
import { openGitSkillSnapshot } from './skill-source-git-snapshot.js';
import { createSkillSourceScanLimiter } from './skill-source-scan-limit.js';

// ── Constants ──────────────────────────────────────────────────────────

/** Per-company, per-caller scan rate limiter. */
const limitScans = createSkillSourceScanLimiter();

/** GitHub API request timeout. */
const API_TIMEOUT_MS = 30_000;

/** GitHub REST API accept header. */
const GITHUB_API_ACCEPT = 'application/vnd.github+json';
const GITHUB_API_VERSION = '2022-11-28';

// ── Types ──────────────────────────────────────────────────────────────

/** Internal auth state for one connection + grant pair. */
type Authorization = {
  connectionId: string | null;
  grantId?: string | null;
};

// ── Error helpers ──────────────────────────────────────────────────────

/**
 * Extract the upstream HTTP status from a thrown error's details.
 * Returns undefined for errors without a status code.
 */
function providerStatus(error: unknown): number | undefined {
  if (error instanceof Error && 'details' in error) {
    return (error.details as { status?: number })?.status;
  }
  return undefined;
}

/**
 * Build an actionable error message from a GitHub API HTTP status.
 *
 * Classifies responses into:
 *   - Rate limited (429, or 403 with depleted quota)
 *   - Not found (404)
 *   - Auth denied (401, 403)
 *   - Generic failure (everything else)
 */
function classifyGitHubError(status: number, headers: Headers): {
  message: string;
  code: string;
} {
  // Rate limiting: explicit 429, or 403 with depleted quota
  const rateLimited =
    status === 429 ||
    (status === 403 && headers.get('x-ratelimit-remaining') === '0');

  if (rateLimited) {
    const resetEpoch = headers.get('x-ratelimit-reset');
    const resetHint = resetEpoch
      ? ` Resets at ${new Date(Number(resetEpoch) * 1_000).toLocaleTimeString()}.`
      : '';
    return {
      message:
        `GitHub rate limit reached.${resetHint} Wait for the limit window to reset or use another GitHub connection.`,
      code: 'skill_source_github_rate_limited',
    };
  }

  if (status === 404) {
    return {
      message:
        'Repository, branch, or file is unavailable. Verify the URL is correct and the repository is accessible to your GitHub account.',
      code: 'skill_source_github_not_found',
    };
  }

  if (status === 401) {
    return {
      message:
        'GitHub authentication expired. Reconnect your GitHub account in Settings → Connections and try again.',
      code: 'skill_source_github_unauthorized',
    };
  }

  if (status === 403) {
    return {
      message:
        'GitHub denied access to this repository. Verify you have read permissions and that the GitHub App or token has not been revoked.',
      code: 'skill_source_github_forbidden',
    };
  }

  return {
    message: `GitHub returned an unexpected error (HTTP ${status}). Try again in a moment.`,
    code: 'skill_source_github_read_failed',
  };
}

// ── Main factory ───────────────────────────────────────────────────────

/**
 * Create a GitHub read capability for the authenticated caller.
 *
 * Automatic access considers only this caller's grants — never connection
 * management visibility (which would leak other users' connections).
 *
 * @param db — database handle
 * @param companyId — the company performing the scan
 * @param actor — the authenticated caller (board user or running agent)
 * @param connectionId — optional specific connection to use (when omitted,
 *   all authorized connections are tried in priority order)
 * @returns a fully wired {@link YGithubRead} implementation
 */
export function skillSourceYGithubReader(
  db: Db,
  companyId: string,
  actor: Request['actor'],
  connectionId: string | null,
): YGithubRead {
  // ── State ──────────────────────────────────────────────────────────
  /** The connection + grant that ultimately succeeded — tracked for caching. */
  let chosen: Authorization | undefined;

  const access = toolAccessService(db);
  const localTrusted =
    actor.type === 'board' && actor.source === 'local_implicit';

  // ── Auth header resolution ──────────────────────────────────────────

  /**
   * Resolve the Authorization header for a specific candidate.
   *
   * @param authorization — candidate to populate with resolved ids
   * @param force — when true, force-refresh the token (used on 401 retry)
   * @returns HTTP headers to include in the GitHub API request
   */
  const headers = async (
    authorization: Authorization,
    force = false,
  ): Promise<Record<string, string>> => {
    // ── Agent path ────────────────────────────────────────────────
    if (actor.type === 'agent') {
      // Private repos require an authenticated run
      if (!actor.runId || !actor.agentId || actor.companyId !== companyId) {
        if (connectionId) {
          throw forbidden(
            'Private GitHub repositories require an authenticated agent run. Start a run from the Paperclip board.',
          );
        }
        // Public repos: proceed without auth
        return {};
      }

      const result = await resolveGitHubOperationCredentials(db, {
        companyId,
        agentId: actor.agentId,
        runId: actor.runId,
      });

      if (result.status === 'available') {
        if (
          connectionId &&
          result.connectionId !== connectionId
        ) {
          throw forbidden(
            'This run uses a different GitHub connection than the source requires. Open the source settings and choose the run’s authorized connection.',
          );
        }
        authorization.connectionId = result.connectionId ?? null;
        authorization.grantId = result.grantId;
        return { Authorization: `Bearer ${result.env.GH_TOKEN}` };
      }

      if (connectionId || result.status === 'unavailable') {
        throw forbidden(
          result.reason ??
            'GitHub authorization is unavailable for this run. Connect a GitHub account and restart the run.',
        );
      }

      // Public access for unauthenticated runs
      return {};
    }

    // ── Board path ─────────────────────────────────────────────────
    if (actor.type !== 'board') {
      throw forbidden(
        'Authentication is required to access GitHub. Sign in to Paperclip and connect a GitHub account.',
      );
    }

    if (!authorization.connectionId) {
      // No connection — public access only
      return {};
    }

    return access.githubReadHeaders(
      companyId,
      authorization.connectionId,
      actor.userId ?? null,
      localTrusted,
      force,
      authorization.grantId,
    );
  };

  // ── Auth candidate enumeration ─────────────────────────────────────

  /**
   * Build the ordered list of auth candidates to try.
   *
   * Ordering: the most recently successful connection + grant first,
   * then remaining grants, then remaining connections, and finally
   * unauthenticated access as the last resort.
   */
  const candidates = async (): Promise<Authorization[]> => {
    // Agents use a single implicit connection
    if (actor.type !== 'board') {
      return [{ connectionId }];
    }

    const ids = connectionId
      ? [connectionId]
      : await access.githubReadConnectionIds(
          companyId,
          actor.userId ?? null,
          localTrusted,
        );

    const result: Authorization[] = [];
    for (const id of ids) {
      for (const grantId of await access.githubReadGrantIds(
        companyId,
        id,
        actor.userId ?? null,
        localTrusted,
      )) {
        result.push({ connectionId: id, grantId });
      }
    }

    // Sort: most recently successful candidate first
    result.sort(
      (a, b) =>
        Number(
          b.connectionId === chosen?.connectionId &&
            b.grantId === chosen?.grantId,
        ) -
        Number(
          a.connectionId === chosen?.connectionId &&
            a.grantId === chosen?.grantId,
        ),
    );

    // Unauthenticated access as the last resort
    if (!connectionId) {
      result.push({ connectionId: null });
    }

    return result;
  };

  // ── Auth retry loop ─────────────────────────────────────────────────

  /**
   * Execute an operation with automatic auth candidate fallback.
   *
   * Tries each candidate in order. On 401 from a board connection,
   * retries once with a force-refreshed token. Candidates that return
   * 401/403/404 are skipped; other errors propagate immediately.
   *
   * @throws The last error if all candidates are exhausted, or the
   *   first non-skippable error encountered.
   */
  const authorized = async <T>(
    operation: (
      values: Record<string, string>,
      authorization: Authorization,
    ) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> => {
    signal?.throwIfAborted();
    let lastError: unknown;

    try {
      for (const authorization of await candidates()) {
        let operationStarted = false;

        try {
          const invoke = async (force = false): Promise<T> => {
            signal?.throwIfAborted();
            const values = await headers(authorization, force);
            signal?.throwIfAborted();
            operationStarted = true;
            return operation(values, authorization);
          };

          let result: T;
          try {
            result = await invoke();
          } catch (error) {
            // On 401 with a board connection, retry once with force-refresh
            if (
              providerStatus(error) !== 401 ||
              !authorization.connectionId ||
              actor.type !== 'board'
            ) {
              throw error;
            }
            result = await invoke(true);
          }

          // Success — remember this candidate for future prioritization
          chosen = authorization;
          return result;
        } catch (error) {
          signal?.throwIfAborted();

          // Preserve structured errors; wrap unexpected ones
          lastError =
            error instanceof Error && 'status' in error
              ? error
              : unprocessable(
                  'GitHub API request failed. Verify your connection is active and try again.',
                );

          const status = providerStatus(error);

          // Skip to next candidate for auth/permission errors
          // Propagate immediately for network or server errors
          if (
            operationStarted &&
            ![401, 403, 404].includes(status ?? 0)
          ) {
            throw lastError;
          }
        }
      }
    } catch (error) {
      signal?.throwIfAborted();
      if (error instanceof Error && 'status' in error) throw error;
      throw unprocessable(
        'GitHub API request failed. Verify your connection is active and try again.',
      );
    }

    // All candidates exhausted
    if (!lastError) {
      throw forbidden(
        'No authorized GitHub connection is available. Connect a GitHub account in Settings → Connections, or ensure the repository is public.',
      );
    }
    throw lastError;
  };

  // ── GitHub API read function ────────────────────────────────────────

  /**
   * Fetch a GitHub REST API path with automatic auth and error handling.
   *
   * Only `/repos/*` paths are allowed — arbitrary API access is blocked.
   */
  const read = (async (apiPath: string, signal?: AbortSignal) => {
    // Security: only allow repository API paths
    if (
      !apiPath.startsWith('/repos/') ||
      apiPath.includes('://') ||
      apiPath.startsWith('//')
    ) {
      throw unprocessable(
        'Invalid GitHub repository request. Only repository API paths are supported.',
      );
    }

    return authorized(async (authHeaders) => {
      const timeout = AbortSignal.timeout(API_TIMEOUT_MS);
      const response = await fetch(
        `https://api.github.com${apiPath}`,
        {
          headers: {
            Accept: GITHUB_API_ACCEPT,
            'X-GitHub-Api-Version': GITHUB_API_VERSION,
            ...authHeaders,
          },
          redirect: 'error',
          signal: signal
            ? AbortSignal.any([signal, timeout])
            : timeout,
        },
      );

      if (!response.ok) {
        const { message, code } = classifyGitHubError(
          response.status,
          response.headers,
        );
        throw unprocessable(message, {
          code,
          status: response.status,
        });
      }

      return response.json();
    }, signal);
  }) as YGithubRead;

  // ── Scan rate limiting ──────────────────────────────────────────────

  const callerId =
    actor.type === 'agent'
      ? `agent:${actor.agentId}`
      : `board:${actor.userId ?? actor.source}`;

  let scanLease: ReturnType<typeof limitScans> | undefined;

  read.withScan = async (operation) => {
    const lease = limitScans(companyId, callerId);
    scanLease = lease;
    try {
      return await operation();
    } finally {
      scanLease = undefined;
      lease.release();
    }
  };

  // ── Git snapshot download ───────────────────────────────────────────

  read.openSnapshot = async (input, options = {}) => {
    const ownsLease = !scanLease;
    const lease =
      scanLease ?? limitScans(companyId, callerId);

    try {
      const snapshot = await authorized(
        async (values, authorization) => {
          const header =
            values.Authorization ?? values.authorization;

          if (
            header &&
            !/^(Bearer|token)\s+\S+$/i.test(header)
          ) {
            throw unprocessable(
              'GitHub token format is invalid. Reconnect your GitHub account in Settings → Connections.',
            );
          }

          const token =
            header?.replace(/^(Bearer|token)\s+/i, '') ?? '';

          const cacheScope = JSON.stringify([
            companyId,
            actor.type,
            actor.type === 'agent'
              ? actor.agentId
              : actor.userId,
            actor.type === 'agent'
              ? actor.runId
              : actor.source,
            authorization.connectionId,
            authorization.grantId,
          ]);

          return openGitSkillSnapshot(
            { ...input, token, cacheScope },
            {
              ...options,
              beforeDownload: lease.beforeDownload,
            },
          );
        },
        options.signal,
      );

      return {
        ...snapshot,
        release: async () => {
          try {
            await snapshot.release();
          } finally {
            if (ownsLease) lease.release();
          }
        },
      };
    } catch (error) {
      if (ownsLease) lease.release();
      throw error;
    }
  };

  // ── Connection tracking ─────────────────────────────────────────────

  Object.defineProperty(read, 'connectionId', {
    get: () => chosen?.connectionId ?? null,
    enumerable: true,
    configurable: false,
  });

  return read;
}