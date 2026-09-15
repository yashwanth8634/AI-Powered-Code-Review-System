/**
 * lib/security/index.ts
 *
 * Public API for the security module.
 */

import { runSemgrep } from './runSemgrep';
import { explainFindings } from './explainFindings';
import type { SecurityFinding, ScanSettings } from '@/lib/types';

/**
 * Runs the full security analysis pass:
 *   1. Runs Semgrep against the cloned repo.
 *   2. Passes raw findings to GPT-4o for plain-language explanation + risk rank.
 *
 * Returns [] immediately if settings.skipSecurity is true.
 *
 * @param repoPath - Absolute path to the cloned repository.
 * @param settings - Optional per-repo scan settings.
 */
export async function runSecurityAnalysis(
  repoPath: string,
  settings?: ScanSettings
): Promise<SecurityFinding[]> {
  if (settings?.skipSecurity) {
    return [];
  }

  const rawFindings = await runSemgrep(repoPath);
  return explainFindings(rawFindings, settings);
}
