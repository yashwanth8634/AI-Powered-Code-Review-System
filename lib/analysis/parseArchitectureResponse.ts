/**
 * lib/analysis/parseArchitectureResponse.ts
 *
 * Parses and validates the raw JSON text returned by the architecture LLM call.
 * Invalid individual findings are filtered out with a warning (not thrown),
 * so a partially malformed response still yields useful results.
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';
import { LLMError } from '@/lib/errors';
import type { ArchitectureFinding, ScanSettings } from '@/lib/types';

// ---------------------------------------------------------------------------
// Zod schema — mirrors the ArchitectureFinding interface.
// ---------------------------------------------------------------------------

const FindingSchema = z.object({
  severity: z.enum(['high', 'medium', 'low']),
  category: z.enum(['coupling', 'duplication', 'pattern', 'dependency', 'other']),
  title: z.string().min(1).max(200),
  explanation: z.string().min(1),
  affectedFiles: z.array(z.string()).default([]),
});

const ResponseSchema = z.object({
  findings: z.array(z.unknown()),
});

// ---------------------------------------------------------------------------
// Severity ordering for the minSeverity filter.
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function meetsMinSeverity(
  severity: string,
  minSeverity: ScanSettings['minSeverity']
): boolean {
  return (SEVERITY_RANK[severity] ?? 0) >= (SEVERITY_RANK[minSeverity] ?? 0);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses the raw LLM JSON response into a typed ArchitectureFinding array.
 *
 * - Malformed top-level JSON → throws LLMError 'LLM_PARSE_FAILED'.
 * - Individual invalid findings → filtered out with a console warning.
 * - Each valid finding receives a UUID as its `id`.
 *
 * @param rawText  - Raw string returned by callLLM().
 * @param settings - Optional settings for severity filtering.
 */
export function parseArchitectureResponse(
  rawText: string,
  settings?: Partial<ScanSettings>
): ArchitectureFinding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new LLMError(
      'LLM_PARSE_FAILED',
      `Architecture response is not valid JSON: ${rawText.slice(0, 200)}`
    );
  }

  const topLevel = ResponseSchema.safeParse(parsed);
  if (!topLevel.success) {
    throw new LLMError(
      'LLM_PARSE_FAILED',
      `Architecture response missing "findings" array: ${rawText.slice(0, 200)}`
    );
  }

  const findings: ArchitectureFinding[] = [];

  for (const raw of topLevel.data.findings) {
    const result = FindingSchema.safeParse(raw);
    if (!result.success) {
      console.warn(
        '[parseArchitectureResponse] Skipping invalid finding:',
        JSON.stringify(raw).slice(0, 150)
      );
      continue;
    }

    const { severity, category, title, explanation, affectedFiles } = result.data;

    if (settings?.minSeverity && !meetsMinSeverity(severity, settings.minSeverity)) {
      continue;
    }

    findings.push({
      id: randomUUID(),
      severity,
      category,
      title,
      explanation,
      affectedFiles,
    });
  }

  return findings;
}
