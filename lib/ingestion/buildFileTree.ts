/**
 * lib/ingestion/buildFileTree.ts
 *
 * Walks a cloned repository, applies exclusion filters, and returns:
 *   - A human-readable indented tree string (for the LLM prompt).
 *   - A flat list of FileEntry objects (for selectKeyFiles).
 */

import fs from 'fs';
import path from 'path';
import { IngestionError } from '@/lib/errors';
import type { FileEntry } from '@/lib/types';

// ---------------------------------------------------------------------------
// Exclusion constants — define once, never scatter magic strings in the code.
// ---------------------------------------------------------------------------

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '__pycache__',
  '.cache',
  'vendor',
  'target',
  '.turbo',
  'out',
]);

const EXCLUDED_EXTENSIONS = new Set([
  '.lock',
  '.sum',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.exe',
  '.bin',
  '.pyc',
  '.class',
  '.map',
]);

// SVG is excluded from binary set but kept if it's small — skip entirely for LLM.
const EXCLUDED_FILENAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'poetry.lock',
  'Gemfile.lock',
  '.DS_Store',
  'Thumbs.db',
]);

const MAX_DEPTH = 8;

// ---------------------------------------------------------------------------
// Internal recursive walker
// ---------------------------------------------------------------------------

interface WalkResult {
  entries: FileEntry[];
  treeLines: string[];
}

function walkDirectory(
  dirPath: string,
  rootPath: string,
  depth: number
): WalkResult {
  if (depth > MAX_DEPTH) {
    return { entries: [], treeLines: ['  '.repeat(depth) + '... (max depth)'] };
  }

  let dirEntries: fs.Dirent[];
  try {
    dirEntries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return { entries: [], treeLines: [] };
  }

  // Sort: directories first, then files, both alphabetically.
  dirEntries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) {
      return a.isDirectory() ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  const entries: FileEntry[] = [];
  const treeLines: string[] = [];
  const indent = '  '.repeat(depth);

  for (const dirent of dirEntries) {
    if (dirent.isDirectory()) {
      if (EXCLUDED_DIRS.has(dirent.name)) continue;

      treeLines.push(`${indent}${dirent.name}/`);

      const sub = walkDirectory(
        path.join(dirPath, dirent.name),
        rootPath,
        depth + 1
      );
      entries.push(...sub.entries);
      treeLines.push(...sub.treeLines);
    } else if (dirent.isFile()) {
      const ext = path.extname(dirent.name).toLowerCase();
      if (EXCLUDED_EXTENSIONS.has(ext)) continue;
      if (EXCLUDED_FILENAMES.has(dirent.name)) continue;

      const absolutePath = path.join(dirPath, dirent.name);
      const relativePath = path.relative(rootPath, absolutePath);

      let sizeBytes = 0;
      try {
        sizeBytes = fs.statSync(absolutePath).size;
      } catch {
        // If we can't stat the file, skip it.
        continue;
      }

      treeLines.push(`${indent}${dirent.name}`);
      entries.push({ relativePath, sizeBytes, extension: ext });
    }
  }

  return { entries, treeLines };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FileTreeResult {
  /** Plain-text tree string used in the LLM prompt. */
  tree: string;
  /** Flat list of all non-excluded files. */
  entries: FileEntry[];
}

/**
 * Walks the cloned repo directory and builds the file tree representation.
 *
 * @param clonePath - Absolute path to the cloned repository root.
 * @throws IngestionError with code 'TREE_BUILD_FAILED' on filesystem errors.
 */
export function buildFileTree(clonePath: string): FileTreeResult {
  try {
    const repoName = path.basename(clonePath);
    const { entries, treeLines } = walkDirectory(clonePath, clonePath, 0);

    const tree = [`${repoName}/`, ...treeLines].join('\n');
    return { tree, entries };
  } catch (err) {
    throw new IngestionError(
      'TREE_BUILD_FAILED',
      `Failed to walk repo directory: ${String(err)}`
    );
  }
}
