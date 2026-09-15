/**
 * app/api/scans/[scanId]/route.ts
 *
 * GET /api/scans/[scanId] — Returns the full scan result by MongoDB scanId.
 * Used by Person 2 (Akhil)'s dashboard to poll for completion.
 */

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDb, Scan } from '@/lib/db';
import type { ScanResult } from '@/lib/types';

export async function GET(
  _request: Request,
  props: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await props.params;

    if (!scanId || !mongoose.Types.ObjectId.isValid(scanId)) {
      return NextResponse.json(
        { error: 'Invalid scan ID format.' },
        { status: 400 }
      );
    }

    await connectDb();

    const doc = await Scan.findById(scanId).lean();

    if (!doc) {
      return NextResponse.json(
        { error: `Scan not found with id: ${scanId}` },
        { status: 404 }
      );
    }

    const scanResult: ScanResult = {
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
    };

    return NextResponse.json(scanResult, { status: 200 });
  } catch (error) {
    console.error('[GET /api/scans/:scanId] Error fetching scan:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching scan.' },
      { status: 500 }
    );
  }
}
