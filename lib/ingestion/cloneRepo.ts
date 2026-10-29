/**
 * lib/ingestion/cloneRepo.ts
 *
 * Shallow-clones a GitHub repository into a managed temp directory.
 * Returns the clone path AND a cleanup function.
 * The caller MUST call cleanup() in a finally block — no exceptions.
 */

import { dir as makeTmpDir } from 'tmp-promise';
import simpleGit from 'simple-git';
import { IngestionError } from '@/lib/errors';
import { classifyCloneFailure, redactGitDiagnostic } from './cloneFailure';

export interface CloneResult {
  clonePath: string;
  /** Remove the temp directory. Always call this in a finally block. */
  cleanup: () => Promise<void>;
}

/**
 * Performs a depth-1 clone of the given GitHub URL into a temp directory.
 *
 * @param repoUrl - Full HTTPS GitHub URL (e.g. "https://github.com/owner/repo")
 * @returns CloneResult with the clone path and a cleanup function.
 * @throws IngestionError with a specific `CLONE_*` code on authentication,
 * network, workspace, Git installation, or generic clone failures.
 */
export async function cloneRepo(
  repoUrl: string,
  githubAccessToken?: string,
): Promise<CloneResult> {
  const accessToken = githubAccessToken?.trim();
  if (!accessToken || /[\r\n]/.test(accessToken)) {
    throw new IngestionError(
      'CLONE_AUTH_REQUIRED',
      'GitHub authorization is required to analyze this repository. Sign in again and reconnect it.',
    );
  }

  let tmpDir: { path: string; cleanup: () => Promise<void> };

  try {
    // unsafeCleanup: remove the dir even if it contains files (it will).
    tmpDir = await makeTmpDir({ prefix: 'ai-review-', unsafeCleanup: true });
  } catch (err) {
    console.error('[cloneRepo] Failed to create temporary workspace', {
      event: 'repository_clone_workspace_failed',
      repoUrl,
      diagnostic: redactGitDiagnostic(String(err)),
    });
    throw new IngestionError(
      'CLONE_WORKSPACE_FAILED',
      'The scan service could not prepare a temporary workspace. Please try again shortly.',
    );
  }

  try {
    // GitHub HTTPS Git operations use the token as a Basic-auth password; the
    // username is required syntactically but ignored by GitHub. simple-git's
    // config option prefixes `git -c` before `clone`, so this one-command
    // header is never written to the temporary repository's .git/config.
    const basicCredentials = Buffer.from(
      `x-access-token:${accessToken}`,
      'utf8',
    ).toString('base64');
    const git = simpleGit({
      config: [`http.extraHeader=Authorization: Basic ${basicCredentials}`],
    });
    await git.clone(repoUrl, tmpDir.path, ['--depth', '1']);
  } catch (err) {
    // Ensure we clean up the temp dir even when clone fails.
    await tmpDir.cleanup().catch((cleanupError: unknown) => {
      console.error('[cloneRepo] Failed to clean up temporary workspace', {
        event: 'repository_clone_cleanup_failed',
        repoUrl,
        diagnostic: redactGitDiagnostic(String(cleanupError)),
      });
    });

    const failure = classifyCloneFailure(err);
    console.error('[cloneRepo] Git clone failed', {
      event: 'repository_clone_failed',
      repoUrl,
      code: failure.code,
      hasGithubAccessToken: true,
      diagnostic: failure.diagnostic,
    });

    throw new IngestionError(
      failure.code,
      failure.userMessage,
    );
  }

  return {
    clonePath: tmpDir.path,
    cleanup: async () => {
      await tmpDir.cleanup();
    },
  };
}
