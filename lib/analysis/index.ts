/**
 * lib/analysis/index.ts
 *
 * Public API for the architecture analysis module.
 */

import { buildArchitecturePrompt } from './buildArchitecturePrompt';
import { callLLM } from './callLLM';
import { parseArchitectureResponse } from './parseArchitectureResponse';
import type { RepoContext, ArchitectureFinding, ScanSettings } from '@/lib/types';

export { callLLM } from './callLLM';

/**
 * Runs the full architecture analysis pass:
 *   1. Builds the LLM prompt from the RepoContext.
 *   2. Calls GPT-4o.
 *   3. Parses and validates the JSON response.
 *
 * Returns an empty array if `settings.skipArchitecture` is true.
 *
 * @param context  - RepoContext produced by the ingestion module.
 * @param settings - Optional per-repo scan settings.
 */
export async function runArchitectureAnalysis(
  context: RepoContext,
  settings?: ScanSettings
): Promise<ArchitectureFinding[]> {
  if (settings?.skipArchitecture) {
    return [];
  }

  const { systemPrompt, userPrompt } = buildArchitecturePrompt(context, settings);
  const rawText = await callLLM(systemPrompt, userPrompt);
  return parseArchitectureResponse(rawText, settings);
}
