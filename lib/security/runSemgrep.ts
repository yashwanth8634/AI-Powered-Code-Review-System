/**
 * lib/security/runSemgrep.ts
 *
 * Spawns Semgrep as a subprocess against the cloned repository.
 * Uses execFile (not exec) to avoid shell injection.
 * If Semgrep is not installed, returns an empty array and logs a warning
 * instead of crashing the pipeline.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { SemgrepError } from '@/lib/errors';
import { parseSemgrepOutput } from './parseSemgrepOutput';
import type { SemgrepRawFinding } from '@/lib/types';

const execFileAsync = promisify(execFile);

/** Maximum time to wait for Semgrep to complete (3 minutes). */
const SEMGREP_TIMEOUT_MS = 180_000;

/**
 * Runs `semgrep --config=auto <repoPath> --json --quiet` and returns findings.
 *
 * @param repoPath - Absolute path to the cloned repository.
 * @throws SemgrepError with code 'SEMGREP_TIMEOUT' if Semgrep hangs.
 * @throws SemgrepError with code 'SEMGREP_PARSE_FAILED' if output is unparseable.
 * Returns [] with a warning if Semgrep is not installed.
 */
export async function runSemgrep(repoPath: string): Promise<SemgrepRawFinding[]> {
  let stdout: string;

  try {
    const result = await execFileAsync(
      'semgrep',
      ['--config=auto', repoPath, '--json', '--quiet'],
      {
        timeout: SEMGREP_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024, // 10 MB stdout buffer
        env: { ...process.env },     // inherit PATH so semgrep finds its rules
      }
    );
    stdout = result.stdout;
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException & { killed?: boolean; stdout?: string };

    // Not installed — degrade gracefully.
    if (error.code === 'ENOENT') {
      console.warn(
        '[runSemgrep] Semgrep binary not found. Security scan skipped. ' +
          'Install with: pip install semgrep'
      );
      return [];
    }

    // Semgrep exits with code 1 when it finds issues — that is not an error.
    // It exits with code 2+ for actual failures.
    // When killed due to timeout, error.killed === true.
    if (error.killed) {
      throw new SemgrepError(
        'SEMGREP_TIMEOUT',
        `Semgrep timed out after ${SEMGREP_TIMEOUT_MS}ms`
      );
    }

    // Non-zero exit but stdout may still contain valid JSON results.
    // Semgrep exits 1 when findings exist — attempt to parse anyway.
    stdout = error.stdout ?? '';
    if (!stdout) {
      console.warn(`[runSemgrep] Semgrep exited with error: ${String(err)}`);
      return [];
    }
  }

  return parseSemgrepOutput(stdout);
}
