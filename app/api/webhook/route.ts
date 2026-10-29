/**
 * app/api/webhook/route.ts
 *
 * POST /api/webhook — Handles incoming GitHub webhook push events.
 * Validates HMAC signature, filters for default branch pushes,
 * and enqueues a full pipeline scan job.
 */

import { NextResponse } from 'next/server';
import { validateWebhookSignature } from '@/lib/github';
import { connectDb, Scan, Repo } from '@/lib/db';
import { addScanJob } from '@/lib/queue';
import type { GitHubPushPayload } from '@/lib/types';
import { env } from '@/lib/config/env';

export async function POST(request: Request) {
  try {
    // 1. Must read raw body as text for HMAC-SHA256 signature verification.
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const githubEvent = request.headers.get('x-github-event') ?? 'push';

    // 2. Validate webhook HMAC signature
    const isValid = validateWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or missing signature.' },
        { status: 401 }
      );
    }

    // Handle GitHub ping event during webhook registration
    if (githubEvent === 'ping') {
      return NextResponse.json({ message: 'pong' }, { status: 200 });
    }

    if (githubEvent !== 'push') {
      return NextResponse.json(
        { message: `Ignored event: ${githubEvent}` },
        { status: 200 }
      );
    }

    // 3. Parse push payload
    let payload: GitHubPushPayload;
    try {
      payload = JSON.parse(rawBody) as GitHubPushPayload;
    } catch {
      return NextResponse.json(
        { error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    const { ref, repository } = payload;
    if (!repository || !repository.clone_url) {
      return NextResponse.json(
        { error: 'Missing repository information in payload.' },
        { status: 400 }
      );
    }

    // 4. Only trigger scan for pushes to the repository's default branch
    const defaultBranchRef = `refs/heads/${repository.default_branch}`;
    if (ref !== defaultBranchRef) {
      return NextResponse.json(
        {
          message: `Ignored push to non-default branch (${ref}). Default is ${defaultBranchRef}.`,
        },
        { status: 200 }
      );
    }

    await connectDb();

    // 5. Look up repo settings if connected
    const repoDocs = await Repo.find({
      ownerAndRepo: repository.full_name,
    }).lean();

    if (repoDocs.length === 0) {
      return NextResponse.json(
        { message: 'Repository is not connected to an account.' },
        { status: 202 }
      );
    }

    const scanIds: string[] = [];
    const queuedScanIds: string[] = [];
    for (const repoDoc of repoDocs) {
      const scanDoc = await Scan.create({
        userId: String(repoDoc.userId),
        repoId: repoDoc._id,
        repoUrl: repository.clone_url,
        ownerAndRepo: repository.full_name,
        triggeredBy: 'webhook',
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
      scanIds.push(scanId);

      try {
        await addScanJob({
          userId: String(repoDoc.userId),
          repoUrl: repository.clone_url,
          triggeredBy: 'webhook',
          settings: repoDoc.settings,
          scanId,
          githubAccessToken: env.githubToken(),
        });
        queuedScanIds.push(scanId);
      } catch (queueErr) {
        console.error(
          `[POST /api/webhook] Failed to enqueue scan ${scanId}:`,
          queueErr
        );

        await Scan.findByIdAndUpdate(scanId, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          errorMessage: 'Failed to enqueue webhook scan job into Redis queue.',
        });
      }
    }

    if (queuedScanIds.length === 0) {
      return NextResponse.json(
        { error: 'Queue service unavailable.' },
        { status: 503 }
      );
    }

    // Return 200 fast to avoid GitHub webhook timeouts
    return NextResponse.json(
      {
        message: 'Push webhook processed and scan queued.',
        scanIds,
        queuedScanIds,
        repo: repository.full_name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[POST /api/webhook] Internal server error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
