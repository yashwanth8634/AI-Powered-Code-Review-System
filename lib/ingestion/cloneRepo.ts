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
 * @throws IngestionError with code 'CLONE_FAILED' on any git error.
 */
export async function cloneRepo(repoUrl: string): Promise<CloneResult> {
  let tmpDir: { path: string; cleanup: () => void };

  try {
    // unsafeCleanup: remove the dir even if it contains files (it will).
    tmpDir = await makeTmpDir({ prefix: 'ai-review-', unsafeCleanup: true });
  } catch (err) {
    throw new IngestionError(
      'CLONE_FAILED',
      `Failed to create temp directory: ${String(err)}`
    );
  }

  try {
    await simpleGit().clone(repoUrl, tmpDir.path, ['--depth', '1']);
  } catch (err) {
    // Ensure we clean up the temp dir even when clone fails.
    tmpDir.cleanup();
    throw new IngestionError(
      'CLONE_FAILED',
      `git clone failed for ${repoUrl}: ${String(err)}`
    );
  }

  return {
    clonePath: tmpDir.path,
    cleanup: async () => {
      tmpDir.cleanup();
    },
  };
}
