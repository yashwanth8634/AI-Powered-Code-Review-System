import http from 'node:http';

export interface WorkerHealthState {
  isRunning: () => boolean;
  isPaused: () => boolean;
}

export interface WorkerHealthResponse {
  status: 'healthy' | 'unhealthy';
  service: 'scan-worker';
  queue: string;
  uptimeSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  timestamp: string;
}

export function buildWorkerHealthPayload(
  worker: WorkerHealthState,
  queueName: string,
): { statusCode: number; body: WorkerHealthResponse } {
  const isRunning = worker.isRunning();
  const isPaused = worker.isPaused();
  const healthy = isRunning && !isPaused;

  return {
    statusCode: healthy ? 200 : 503,
    body: {
      status: healthy ? 'healthy' : 'unhealthy',
      service: 'scan-worker',
      queue: queueName,
      uptimeSeconds: Math.round(process.uptime()),
      isRunning,
      isPaused,
      timestamp: new Date().toISOString(),
    },
  };
}

export function createWorkerHealthServer(
  worker: WorkerHealthState,
  queueName: string,
): http.Server {
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
      const { statusCode, body } = buildWorkerHealthPayload(worker, queueName);
      res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });
      res.end(JSON.stringify(body, null, 2));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });
}
