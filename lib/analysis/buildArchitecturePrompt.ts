/**
 * lib/analysis/buildArchitecturePrompt.ts
 *
 * Assembles the system and user prompts for the architecture analysis LLM call.
 * Pure function — no side effects, no I/O. Easy to test in isolation.
 */

import type { RepoContext, ScanSettings, KeyFile } from '@/lib/types';

const SYSTEM_PROMPT = `You are an expert software architect performing a structural code review.

You will receive:
1. A file tree showing the repository structure.
2. The contents of the most important source files.

Your task is to identify architectural problems. Focus on:
- Tight coupling between modules that should be independent
- Duplicated logic across multiple files that should be abstracted
- Inconsistent patterns (e.g. two different ways to handle the same concern)
- Missing separation of concerns (business logic mixed with I/O, UI mixed with data)
- Outdated, risky, or abandoned dependencies

Return a JSON object with a single key "findings" whose value is an array.
Each element in the array must match this exact schema:
{
  "severity": "high" | "medium" | "low",
  "category": "coupling" | "duplication" | "pattern" | "dependency" | "other",
  "title": "Short descriptive title (max 80 chars)",
  "explanation": "One to three sentences explaining the problem and why it matters.",
  "affectedFiles": ["relative/path/to/file.ts"]
}

Rules:
- Return ONLY the JSON object — no markdown fences, no prose before or after.
- If you find no problems, return {"findings": []}.
- Do not invent findings. Only report what you can support with evidence from the provided code.
- "affectedFiles" may be an empty array if you cannot pinpoint a specific file.`;

function formatKeyFiles(keyFiles: KeyFile[]): string {
  return keyFiles
    .map(
      (kf) =>
        `=== FILE: ${kf.relativePath} ===\n${kf.content}\n=== END: ${kf.relativePath} ===`
    )
    .join('\n\n');
}

export interface ArchitecturePrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Builds the LLM prompt pair for the architecture analysis pass.
 *
 * @param context  - The RepoContext produced by the ingestion module.
 * @param settings - Optional per-repo scan settings.
 * @returns systemPrompt + userPrompt ready to pass to callLLM().
 */
export function buildArchitecturePrompt(
  context: RepoContext,
  settings?: ScanSettings
): ArchitecturePrompt {
  const severityNote =
    settings?.minSeverity === 'high'
      ? '\nOnly report HIGH severity findings. Omit medium and low.'
      : settings?.minSeverity === 'medium'
      ? '\nOnly report HIGH and MEDIUM severity findings. Omit low.'
      : '';

  const userPrompt = [
    `Repository: ${context.ownerAndRepo}`,
    '',
    '--- FILE TREE ---',
    context.fileTree,
    '',
    '--- KEY SOURCE FILES ---',
    formatKeyFiles(context.keyFileContents),
    severityNote,
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
