/**
 * lib/security/parseSemgrepOutput.ts
 *
 * Parses and validates raw Semgrep JSON output into SemgrepRawFinding[].
 * Caps results at MAX_FINDINGS to avoid overwhelming the LLM explanation pass.
 */

import { z } from 'zod';
import path from 'path';
import { SemgrepError } from '@/lib/errors';
import type { SemgrepRawFinding } from '@/lib/types';

/** Cap findings sent to the LLM to avoid a massive prompt. */
const MAX_FINDINGS = 50;

// Zod schema for one entry in Semgrep's results[] array.
const SemgrepResultSchema = z.object({
  check_id: z.string(),
  path: z.string(),
  start: z.object({ line: z.number() }),
  end: z.object({ line: z.number() }),
  extra: z.object({
    message: z.string(),
    severity: z.string().default('WARNING'),
  }),
});

const SemgrepOutputSchema = z.object({
  results: z.array(z.unknown()).default([]),
});

/**
 * Parses the stdout string from the Semgrep subprocess.
 *
 * - Malformed JSON → throws SemgrepError 'SEMGREP_PARSE_FAILED'.
 * - Individual invalid result entries are skipped with a warning.
 * - Results are capped at MAX_FINDINGS (50).
 *
 * @param rawOutput - The stdout string from Semgrep.
 */
export function parseSemgrepOutput(rawOutput: string): SemgrepRawFinding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawOutput);
  } catch {
    throw new SemgrepError(
      'SEMGREP_PARSE_FAILED',
      `Semgrep output is not valid JSON: ${rawOutput.slice(0, 200)}`
    );
  }

  const top = SemgrepOutputSchema.safeParse(parsed);
  if (!top.success) {
    throw new SemgrepError(
      'SEMGREP_PARSE_FAILED',
      `Semgrep output missing "results" array.`
    );
  }

  const findings: SemgrepRawFinding[] = [];

  for (const raw of top.data.results.slice(0, MAX_FINDINGS)) {
    const result = SemgrepResultSchema.safeParse(raw);
    if (!result.success) {
      console.warn(
        '[parseSemgrepOutput] Skipping invalid result:',
        JSON.stringify(raw).slice(0, 150)
      );
      continue;
    }

    const { check_id, path: filePath, start, end, extra } = result.data;

    findings.push({
      ruleId: check_id,
      // Normalise to forward slashes for cross-platform consistency.
      filePath: filePath.split(path.sep).join('/'),
      startLine: start.line,
      endLine: end.line,
      message: extra.message,
      severity: extra.severity,
    });
  }

  return findings;
}
