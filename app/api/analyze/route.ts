/**
 * app/api/analyze/route.ts
 *
 * POST /api/analyze — Kicks off an on-demand code review scan.
 * Enqueues the job into BullMQ and immediately returns HTTP 202 with scanId.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDb, Scan } from '@/lib/db';
import { addScanJob } from '@/lib/queue';
import { parseGitHubUrl } from '@/app/utils/validateGitUrl';

const AnalyzeBodySchema = z.object({
  gitUrl: z.string().min(1, 'gitUrl is required'),
  settings: z
    .object({
      skipArchitecture: z.boolean().optional().default(false),
      skipSecurity: z.boolean().optional().default(false),
      minSeverity: z.enum(['high', 'medium', 'low']).optional().default('low'),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Invalid JSON request body.' },
        { status: 400 }
      );
    }

    // Accept both gitUrl or repoUrl aliases
    const normalizedBody = {
      gitUrl: rawBody.gitUrl ?? rawBody.repoUrl,
      settings: rawBody.settings,
    };

    const parsed = AnalyzeBodySchema.safeParse(normalizedBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed.',
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { gitUrl, settings } = parsed.data;

    // Validate GitHub repo URL syntax
    const parsedRepo = parseGitHubUrl(gitUrl);
    if (!parsedRepo) {
      return NextResponse.json(
        {
          error:
            'Invalid GitHub URL. Must be in the format: https://github.com/owner/repo',
        },
        { status: 400 }
      );
    }

    await connectDb();

    // Create a pending Scan record in MongoDB immediately so clients can poll.
    const scanDoc = await Scan.create({
      repoUrl: parsedRepo.normalizedUrl,
      ownerAndRepo: parsedRepo.fullName,
      triggeredBy: 'on-demand',
      startedAt: new Date().toISOString(),
      status: 'pending',
      architectureFindings: [],
      securityFindings: [],
      summary: {
        architectureHigh: 0,
        architectureMedium: 0,
        architectureLow: 0,
        securityCritical: 0,
        securityHigh: 0,
        securityMedium: 0,
        securityLow: 0,
        totalIssues: 0,
      },
    });

    const scanId = String(scanDoc._id);

    // Enqueue background scan job
    try {
      await addScanJob({
        repoUrl: parsedRepo.normalizedUrl,
        triggeredBy: 'on-demand',
        settings,
        scanId,
      });
    } catch (queueErr) {
      console.error('[POST /api/analyze] Failed to enqueue job:', queueErr);

      await Scan.findByIdAndUpdate(scanId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        errorMessage: 'Failed to enqueue scan job into Redis queue.',
      });

      return NextResponse.json(
        {
          error:
            'Scan queue is currently unavailable. Ensure Redis is running and REDIS_URL is configured.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        scanId,
        message: 'Scan queued successfully.',
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[POST /api/analyze] Internal server error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
