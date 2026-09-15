/**
 * lib/ingestion/index.ts
 *
 * Public API for the ingestion module.
 * Chains: cloneRepo → buildFileTree → selectKeyFiles → assembles RepoContext.
 */

import { cloneRepo, type CloneResult } from './cloneRepo';
import { buildFileTree } from './buildFileTree';
import { selectKeyFiles } from './selectKeyFiles';
import type { RepoContext } from '@/lib/types';

/** Extracts "owner/repo" from a GitHub URL. */
function parseOwnerAndRepo(repoUrl: string): string {
  // Works for https://github.com/owner/repo and https://github.com/owner/repo.git
  const match = repoUrl.match(/github\.com\/([^/]+\/[^/.]+)/);
  return match ? match[1] : repoUrl;
}

export interface IngestResult {
  context: RepoContext;
  /** Always call this in a finally block to delete the temp clone directory. */
  cleanup: CloneResult['cleanup'];
}

/**
 * Fully ingests a GitHub repository:
 *   1. Shallow-clones it into a temp directory.
 *   2. Builds the file tree (excluding noise).
 *   3. Selects and reads the most important files for the LLM prompt.
 *
 * @param repoUrl - Full HTTPS GitHub URL.
 * @returns context + cleanup. The caller MUST call cleanup() in a finally block.
 */
export async function ingestRepo(repoUrl: string): Promise<IngestResult> {
  const { clonePath, cleanup } = await cloneRepo(repoUrl);

  const { tree, entries } = buildFileTree(clonePath);
  const keyFileContents = selectKeyFiles(entries, clonePath);

  const context: RepoContext = {
    repoUrl,
    ownerAndRepo: parseOwnerAndRepo(repoUrl),
    clonePath,
    fileTree: tree,
    keyFileContents,
    totalFileCount: entries.length + /* excluded approx */ 0,
    filteredFileCount: entries.length,
  };

  return { context, cleanup };
}
