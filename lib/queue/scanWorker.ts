/**
 * lib/queue/scanWorker.ts
 *
 * BullMQ worker process — runs as a long-lived Node.js process SEPARATE from
 * the Next.js server. It picks up scan jobs from Redis and calls runFullScan().
 *
 * Start with: npx ts-node --project tsconfig.json lib/queue/scanWorker.ts
 * (Or compile and run: node dist/lib/queue/scanWorker.js)
 *
 * This file is NOT imported by any Next.js API route.
 * It is a standalone entry point.
 */

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { runFullScan } from '@/lib/pipeline';
import { QUEUE_NAME, type ScanJobPayload } from './scanQueue';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error('REDIS_URL is not set.');
}

/**
 * How many jobs to process in parallel.
 * Keep low (2) — each job makes 2 LLM API calls which are rate-limited.
 */
const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? '2');

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
});

const worker = new Worker<ScanJobPayload>(
  QUEUE_NAME,
  async (job) => {
    const { repoUrl, triggeredBy, settings, scanId } = job.data;

    console.log(
      `[worker] Starting job ${job.id}: ${repoUrl} (triggered by: ${triggeredBy})`
    );

    const result = await runFullScan({ repoUrl, triggeredBy, settings, scanId });

    console.log(
      `[worker] Finished job ${job.id}: status=${result.status} scanId=${result.id}`
    );

    return result.id;
  },
  { connection, concurrency: WORKER_CONCURRENCY }
);

worker.on('completed', (job, scanId) => {
  console.log(`[worker] Job ${job.id} completed → scanId: ${scanId}`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[worker] Worker error:', err);
});

console.log(
  `[worker] Scan worker started. Concurrency: ${WORKER_CONCURRENCY}. Listening on queue: ${QUEUE_NAME}`
);

// Graceful shutdown on SIGTERM / SIGINT (e.g. Docker stop, Ctrl+C).
const shutdown = async (signal: string) => {
  console.log(`[worker] Received ${signal}. Shutting down gracefully…`);
  await worker.close();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
