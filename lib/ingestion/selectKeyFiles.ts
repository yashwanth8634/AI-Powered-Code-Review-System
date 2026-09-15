/**
 * lib/ingestion/selectKeyFiles.ts
 *
 * Selects the most important files from a repo to include in the LLM prompt.
 *
 * Priority order:
 *   1. Config / manifest files (package.json, pyproject.toml, go.mod, etc.)
 *   2. Recognised entry-point filenames (index.ts, main.py, server.ts, etc.)
 *   3. Largest source files by size (most code = most context)
 *
 * Hard limits:
 *   - Individual files are truncated at FILE_TRUNCATE_BYTES.
 *   - The cumulative content budget is TOTAL_BUDGET_BYTES.
 */

import fs from 'fs';
import path from 'path';
import { IngestionError } from '@/lib/errors';
import type { FileEntry, KeyFile } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Individual file truncation limit (≈ 5,000 tokens at 4 chars/token).
 * Large files are truncated; a marker comment is appended.
 */
const FILE_TRUNCATE_BYTES = 20_000;

/**
 * Total byte budget across all key files (≈ 80,000 tokens).
 * Stays well within GPT-4o's 128k token window after the prompt wrapping.
 */
const TOTAL_BUDGET_BYTES = 320_000;

/** Max number of files from the "large source files" tier. */
const MAX_LARGE_FILES = 10;

const CONFIG_FILENAMES = new Set([
  'package.json',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'requirements.txt',
  'setup.py',
  'setup.cfg',
  'composer.json',
  'pom.xml',
  'build.gradle',
  'tsconfig.json',
  '.eslintrc.json',
  '.eslintrc.js',
  'next.config.ts',
  'next.config.js',
  'vite.config.ts',
  'vite.config.js',
  'webpack.config.js',
  'Makefile',
  'Dockerfile',
  'docker-compose.yml',
]);

const ENTRY_POINT_NAMES = new Set([
  'index.ts',
  'index.js',
  'index.tsx',
  'main.ts',
  'main.js',
  'main.py',
  'main.go',
  'main.rs',
  'app.ts',
  'app.js',
  'app.py',
  'server.ts',
  'server.js',
  '__init__.py',
]);

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.cs',
  '.rb',
  '.php',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFileSafe(absolutePath: string): string {
  try {
    const raw = fs.readFileSync(absolutePath, 'utf-8');
    if (Buffer.byteLength(raw, 'utf-8') > FILE_TRUNCATE_BYTES) {
      const truncated = Buffer.from(raw).slice(0, FILE_TRUNCATE_BYTES).toString('utf-8');
      return truncated + '\n// [truncated — file exceeds size limit]';
    }
    return raw;
  } catch (err) {
    throw new IngestionError(
      'FILE_READ_FAILED',
      `Cannot read file ${absolutePath}: ${String(err)}`
    );
  }
}

function toKeyFile(entry: FileEntry, clonePath: string): KeyFile {
  const absolutePath = path.join(clonePath, entry.relativePath);
  return {
    relativePath: entry.relativePath,
    content: readFileSafe(absolutePath),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Selects and reads the most important files for inclusion in the LLM prompt.
 * Files are deduped and ordered: config → entry points → large source files.
 *
 * @param entries  - FileEntry list from buildFileTree.
 * @param clonePath - Absolute path to the repo root (used to resolve absolute paths).
 */
export function selectKeyFiles(
  entries: FileEntry[],
  clonePath: string
): KeyFile[] {
  const selected: FileEntry[] = [];
  const seen = new Set<string>();

  const add = (entry: FileEntry): void => {
    if (seen.has(entry.relativePath)) return;
    seen.add(entry.relativePath);
    selected.push(entry);
  };

  // Tier 1: config / manifest files.
  for (const entry of entries) {
    const filename = path.basename(entry.relativePath);
    if (CONFIG_FILENAMES.has(filename)) add(entry);
  }

  // Tier 2: recognised entry-point filenames.
  for (const entry of entries) {
    const filename = path.basename(entry.relativePath);
    if (ENTRY_POINT_NAMES.has(filename)) add(entry);
  }

  // Tier 3: largest source files, up to MAX_LARGE_FILES.
  const sourceFiles = entries
    .filter(
      (e) => SOURCE_EXTENSIONS.has(e.extension) && !seen.has(e.relativePath)
    )
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
    .slice(0, MAX_LARGE_FILES);

  for (const entry of sourceFiles) add(entry);

  // Read files up to the total byte budget.
  const keyFiles: KeyFile[] = [];
  let bytesUsed = 0;

  for (const entry of selected) {
    if (bytesUsed >= TOTAL_BUDGET_BYTES) break;
    const kf = toKeyFile(entry, clonePath);
    bytesUsed += Buffer.byteLength(kf.content, 'utf-8');
    keyFiles.push(kf);
  }

  return keyFiles;
}
