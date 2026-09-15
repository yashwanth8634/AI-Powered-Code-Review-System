/**
 * lib/pipeline/runFullScan.ts
 *
 * The orchestrator — the only place where all modules are wired together.
 * Sequence: ingest → architecture analysis → security analysis → persist → cleanup.
 *
 * KEY INVARIANT: cleanup() is always called in the finally block,
 * even if any step throws. No temp directories are ever left on disk.
 */

import { ingestRepo } from '@/lib/ingestion';
import { runArchitectureAnalysis } from '@/lib/analysis';
import { runSecurityAnalysis } from '@/lib/security';
import { connectDb, Scan } from '@/lib/db';
import type {
  ScanResult,
  ScanSummary,
  ArchitectureFinding,
  SecurityFinding,
  ScanSettings,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeSummary(
  architectureFindings: ArchitectureFinding[],
  securityFindings: SecurityFinding[]
): ScanSummary {
  const archCount = (sev: 'high' | 'medium' | 'low') =>
    architectureFindings.filter((f) => f.severity === sev).length;

  const secCount = (sev: 'critical' | 'high' | 'medium' | 'low') =>
    securityFindings.filter((f) => f.severity === sev).length;

  const architectureHigh = archCount('high');
  const architectureMedium = archCount('medium');
  const architectureLow = archCount('low');
  const securityCritical = secCount('critical');
  const securityHigh = secCount('high');
  const securityMedium = secCount('medium');
  const securityLow = secCount('low');

  return {
    architectureHigh,
    architectureMedium,
    architectureLow,
    securityCritical,
    securityHigh,
    securityMedium,
    securityLow,
    totalIssues:
      architectureHigh +
      architectureMedium +
      architectureLow +
      securityCritical +
      securityHigh +
      securityMedium +
      securityLow,
  };
}

function toScanResult(doc: { _id: unknown } & Partial<ScanResult>): ScanResult {
  return {
    id: String(doc._id),
    repoUrl: doc.repoUrl ?? '',
    ownerAndRepo: doc.ownerAndRepo ?? '',
    triggeredBy: doc.triggeredBy ?? 'on-demand',
    startedAt: doc.startedAt ?? new Date().toISOString(),
    completedAt: doc.completedAt ?? new Date().toISOString(),
    status: doc.status ?? 'failed',
    errorMessage: doc.errorMessage,
    architectureFindings: doc.architectureFindings ?? [],
    securityFindings: doc.securityFindings ?? [],
    summary: doc.summary ?? {
      architectureHigh: 0,
      architectureMedium: 0,
      architectureLow: 0,
      securityCritical: 0,
      securityHigh: 0,
      securityMedium: 0,
      securityLow: 0,
      totalIssues: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RunFullScanOptions {
  repoUrl: string;
  triggeredBy: 'on-demand' | 'webhook';
  settings?: ScanSettings;
  scanId?: string;
}

/**
 * Runs the complete scan pipeline for a single repository.
 *
 * 1. Creates or uses a 'pending' Scan record in MongoDB (so the client can poll immediately).
 * 2. Clones the repo, runs architecture analysis, runs Semgrep + LLM explanation.
 * 3. Updates the Scan record to 'complete' with all findings.
 * 4. On any error: marks the record 'failed' with an error message.
 * 5. Always: deletes the temp clone directory.
 *
 * @returns The final ScanResult (complete or failed).
 */
export async function runFullScan(options: RunFullScanOptions): Promise<ScanResult> {
  const { repoUrl, triggeredBy, settings } = options;
  const startedAt = new Date().toISOString();

  await connectDb();

  // Step 1: Use provided scanId or create a pending record immediately.
  let scanId = options.scanId;
  if (!scanId) {
    const scanDoc = await Scan.create({
      repoUrl,
      ownerAndRepo: repoUrl, // Will be overwritten with the parsed value after ingestion.
      triggeredBy,
      startedAt,
      status: 'pending',
      architectureFindings: [],
      securityFindings: [],
      summary: {},
    });
    scanId = String(scanDoc._id);
  }

  // Step 2: Mark running.
  await Scan.findByIdAndUpdate(scanId, { status: 'running' });

  let cleanup: (() => Promise<void>) | null = null;

  try {
    // Step 3: Ingestion.
    const ingestResult = await ingestRepo(repoUrl);
    cleanup = ingestResult.cleanup;
    const { context } = ingestResult;

    // Update ownerAndRepo now that we have the parsed value.
    await Scan.findByIdAndUpdate(scanId, { ownerAndRepo: context.ownerAndRepo });

    // Step 4: Run both analysis passes (architecture + security) concurrently.
    const [architectureFindings, securityFindings] = await Promise.all([
      runArchitectureAnalysis(context, settings),
      runSecurityAnalysis(context.clonePath, settings),
    ]);

    const completedAt = new Date().toISOString();
    const summary = computeSummary(architectureFindings, securityFindings);

    // Step 5: Persist complete result.
    const updated = await Scan.findByIdAndUpdate(
      scanId,
      {
        ownerAndRepo: context.ownerAndRepo,
        status: 'complete',
        completedAt,
        architectureFindings,
        securityFindings,
        summary,
      },
      { new: true }
    ).lean();

    return toScanResult({ _id: scanId, ...updated } as Parameters<typeof toScanResult>[0]);
  } catch (err) {
    // Step 6: Persist failure.
    await Scan.findByIdAndUpdate(scanId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    const failed = await Scan.findById(scanId).lean();
    return toScanResult({ _id: scanId, ...failed } as Parameters<typeof toScanResult>[0]);
  } finally {
    // Step 7: Always clean up the temp directory — even if the LLM threw.
    if (cleanup) {
      await cleanup().catch((e) =>
        console.error('[runFullScan] Cleanup failed:', e)
      );
    }
  }
}
