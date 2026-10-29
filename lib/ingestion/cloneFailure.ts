import type { IngestionErrorCode } from '@/lib/errors';

type CloneFailureCode = Extract<
  IngestionErrorCode,
  | 'CLONE_AUTH_FAILED'
  | 'CLONE_ACCESS_DENIED'
  | 'CLONE_REPOSITORY_UNAVAILABLE'
  | 'CLONE_NETWORK_FAILED'
  | 'CLONE_GIT_UNAVAILABLE'
  | 'CLONE_WORKSPACE_FAILED'
  | 'CLONE_FAILED'
>;

export interface CloneFailure {
  code: CloneFailureCode;
  /** Safe to persist in the scan record and show to the signed-in user. */
  userMessage: string;
  /** Safe, redacted diagnostic intended only for server logs. */
  diagnostic: string;
}

const REDACTED = '[REDACTED]';
const MAX_DIAGNOSTIC_LENGTH = 2_000;

/**
 * Removes credentials from Git output before it is written to application logs.
 * Git errors can include the command line, request headers, or an authenticated
 * remote URL, so raw errors must never be persisted or returned to the browser.
 */
export function redactGitDiagnostic(value: string): string {
  return value
    .replace(
      /(Authorization:\s*(?:Bearer|Basic)\s+)[^\s'"\\]+/gi,
      `$1${REDACTED}`,
    )
    .replace(
      /(https?:\/\/[^\s/:@]+:)[^@\s/]+(@)/gi,
      `$1${REDACTED}$2`,
    )
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g, REDACTED)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DIAGNOSTIC_LENGTH);
}

function errorDiagnostic(error: unknown): string {
  if (error instanceof Error) {
    const gitError = error as Error & { stderr?: unknown; stdout?: unknown };
    const output = [
      gitError.message,
      typeof gitError.stderr === 'string' ? gitError.stderr : '',
      typeof gitError.stdout === 'string' ? gitError.stdout : '',
    ]
      .filter(Boolean)
      .join('\n');

    return redactGitDiagnostic(output || error.name);
  }

  return redactGitDiagnostic(String(error));
}

function failure(
  code: CloneFailureCode,
  userMessage: string,
  diagnostic: string,
): CloneFailure {
  return { code, userMessage, diagnostic };
}

/**
 * Maps common Git transport failures to a stable, user-actionable error.
 * GitHub intentionally returns 404 for some private repositories, so that
 * case stays deliberately vague and never reveals repository existence.
 */
export function classifyCloneFailure(error: unknown): CloneFailure {
  const diagnostic = errorDiagnostic(error);
  const normalized = diagnostic.toLowerCase();

  if (
    /could not create work tree dir|no space left on device|readonly file system|eacces/.test(
      normalized,
    )
  ) {
    return failure(
      'CLONE_WORKSPACE_FAILED',
      'The scan service could not prepare a temporary workspace. Please try again shortly.',
      diagnostic,
    );
  }

  if (
    /spawn git.*enoent|git: command not found|git executable.*not found/.test(
      normalized,
    )
  ) {
    return failure(
      'CLONE_GIT_UNAVAILABLE',
      'The scan service is not configured with Git. Please contact the application administrator.',
      diagnostic,
    );
  }

  if (
    /could not resolve host|couldn't resolve host|temporary failure in name resolution|failed to connect|could not connect|connection timed out|network is unreachable|proxy error|ssl certificate/.test(
      normalized,
    )
  ) {
    return failure(
      'CLONE_NETWORK_FAILED',
      'The scan service could not reach GitHub. Please try the scan again in a few minutes.',
      diagnostic,
    );
  }

  if (
    /authentication failed|authentication is required|invalid username or token|bad credentials|http basic: access denied|could not read username.*github|terminal prompts disabled|requested url returned error: 401/.test(
      normalized,
    )
  ) {
    return failure(
      'CLONE_AUTH_FAILED',
      'Your GitHub authorization has expired or is invalid. Sign out and sign in again, then reconnect this repository.',
      diagnostic,
    );
  }

  if (
    /repository(?:\s+['"`][^'"`]+['"`])?\s+not found|requested url returned error: 404/.test(
      normalized,
    )
  ) {
    return failure(
      'CLONE_REPOSITORY_UNAVAILABLE',
      'GitHub could not access this repository with your account. Confirm that you still have access, then reconnect it.',
      diagnostic,
    );
  }

  if (
    /remote: permission to|permission denied to|requested url returned error: 403|remote: access denied|remote: write access/.test(
      normalized,
    )
  ) {
    return failure(
      'CLONE_ACCESS_DENIED',
      'Your GitHub account does not have permission to read this repository. Grant repository access and reconnect it.',
      diagnostic,
    );
  }

  return failure(
    'CLONE_FAILED',
    'We could not clone this repository. Reconnect GitHub and try the scan again.',
    diagnostic,
  );
}
