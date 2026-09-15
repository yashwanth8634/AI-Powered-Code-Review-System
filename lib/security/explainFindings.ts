/**
 * lib/security/explainFindings.ts
 *
 * Second LLM pass: takes raw Semgrep findings and asks GPT-4o to
 * rewrite them in plain language, assign real-world severity, and rank by risk.
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';
import { callLLM } from '@/lib/analysis/callLLM';
import { LLMError } from '@/lib/errors';
import type { SemgrepRawFinding, SecurityFinding, ScanSettings } from '@/lib/types';

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a senior application security engineer.
You will receive a list of static analysis findings from Semgrep.
Your task is to translate each finding into plain language and assess its real-world risk.

Return a JSON object with a single key "findings" whose value is an array.
Each element must match this exact schema:
{
  "ruleId": "<the ruleId from the input>",
  "severity": "critical" | "high" | "medium" | "low",
  "title": "Short descriptive title (max 80 chars)",
  "explanation": "2-3 sentences: what the vulnerability is, why it is dangerous, and how to fix it.",
  "filePath": "<the filePath from the input>",
  "startLine": <number>,
  "endLine": <number>,
  "riskRank": <integer, 1 = most dangerous overall>
}

Rules:
- Every input finding must appear in the output array.
- Return ONLY the JSON object — no markdown fences, no prose.
- severity must reflect real-world exploitability, not just Semgrep's label.
- riskRank must be unique integers starting at 1 (most dangerous).`;

function buildSecurityUserPrompt(findings: SemgrepRawFinding[]): string {
  const list = findings
    .map(
      (f, i) =>
        `[${i + 1}] ruleId=${f.ruleId} | file=${f.filePath}:${f.startLine}-${f.endLine}\n    ${f.message}`
    )
    .join('\n\n');

  return `Here are ${findings.length} Semgrep findings to explain:\n\n${list}`;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const ExplainedFindingSchema = z.object({
  ruleId: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string().min(1).max(200),
  explanation: z.string().min(1),
  filePath: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  riskRank: z.number().int().positive(),
});

const ExplainResponseSchema = z.object({
  findings: z.array(z.unknown()),
});

function parseExplainResponse(rawText: string): SecurityFinding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new LLMError(
      'LLM_PARSE_FAILED',
      `Security explanation response is not valid JSON: ${rawText.slice(0, 200)}`
    );
  }

  const top = ExplainResponseSchema.safeParse(parsed);
  if (!top.success) {
    throw new LLMError(
      'LLM_PARSE_FAILED',
      'Security explanation response missing "findings" array.'
    );
  }

  const results: SecurityFinding[] = [];

  for (const raw of top.data.findings) {
    const result = ExplainedFindingSchema.safeParse(raw);
    if (!result.success) {
      console.warn(
        '[explainFindings] Skipping invalid finding:',
        JSON.stringify(raw).slice(0, 150)
      );
      continue;
    }

    results.push({ id: randomUUID(), ...result.data });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sends raw Semgrep findings to GPT-4o for plain-language explanation and risk ranking.
 *
 * Returns [] immediately if settings.skipSecurity is true or there are no findings.
 *
 * @param findings - SemgrepRawFinding[] from parseSemgrepOutput.
 * @param settings - Optional per-repo scan settings.
 */
export async function explainFindings(
  findings: SemgrepRawFinding[],
  settings?: ScanSettings
): Promise<SecurityFinding[]> {
  if (settings?.skipSecurity || findings.length === 0) {
    return [];
  }

  const userPrompt = buildSecurityUserPrompt(findings);
  const rawText = await callLLM(SYSTEM_PROMPT, userPrompt);
  return parseExplainResponse(rawText);
}
