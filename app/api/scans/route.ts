/**
 * app/api/scans/route.ts
 *
 * GET /api/scans — Lists recent scans, optionally filtered by repository.
 * Query params:
 *   - repo: "owner/repo" (optional)
 *   - limit: max records to return (default 20, max 100)
 */

import { NextResponse } from 'next/server';
import { connectDb, Scan } from '@/lib/db';
import type { ScanResult } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const repoParam = searchParams.get('repo');
    const limitParam = parseInt(searchParams.get('limit') ?? '20', 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 100);

    await connectDb();

    const query = repoParam ? { ownerAndRepo: repoParam } : {};

    const docs = await Scan.find(query)
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();

    const scans: ScanResult[] = docs.map((doc) => ({
      id: String(doc._id),
      repoUrl: doc.repoUrl,
      ownerAndRepo: doc.ownerAndRepo,
      triggeredBy: doc.triggeredBy,
      startedAt: doc.startedAt,
      completedAt: doc.completedAt ?? '',
      status: doc.status,
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
    }));

    return NextResponse.json(scans, { status: 200 });
  } catch (error) {
    console.error('[GET /api/scans] Failed to list scans:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve scan history.' },
      { status: 500 }
    );
  }
}
