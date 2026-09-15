/**
 * lib/queue/scanQueue.ts
 *
 * BullMQ queue definition for scan jobs.
 * The API route calls addScanJob() and immediately returns a scanId.
 * The worker (scanWorker.ts) processes jobs asynchronously.
 *
 * Why a queue?
 * Vercel serverless functions have a max execution time of 60s (300s on Pro).
 * A clone + 2 LLM calls + Semgrep easily takes 3–5 minutes.
 * The queue decouples request handling from the long-running work.
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { ScanSettings } from '@/lib/types';

export const QUEUE_NAME = 'scan-jobs';

/** Payload stored in each BullMQ job. */
export interface ScanJobPayload {
  repoUrl: string;
  triggeredBy: 'on-demand' | 'webhook';
  settings?: ScanSettings;
  scanId?: string;
}

// Singleton instances created lazily on first access.
let connection: IORedis | null = null;
let scanQueue: Queue<ScanJobPayload> | null = null;

export function getScanQueue(): Queue<ScanJobPayload> {
  if (scanQueue) {
    return scanQueue;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is not set. Add it to .env.local.');
  }

  connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });

  scanQueue = new Queue<ScanJobPayload>(QUEUE_NAME, { connection });
  return scanQueue;
}

/**
 * Adds a scan job to the queue and returns the BullMQ job ID.
 *
 * @param payload - Job data: which repo to scan and how.
 * @returns The BullMQ job ID string.
 */
export async function addScanJob(payload: ScanJobPayload): Promise<string> {
  const queue = getScanQueue();
  const job = await queue.add('scan', payload, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5_000, // 5s, 10s, 20s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });

  return String(job.id);
}
