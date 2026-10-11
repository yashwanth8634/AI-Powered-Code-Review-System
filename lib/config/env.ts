/**
 * Server-side environment access.
 *
 * Keeping environment reads here prevents infrastructure details from leaking
 * into domain and UI modules and gives every caller the same error message.
 */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export const env = {
  authSecret: () => required("AUTH_SECRET"),
  githubWebhookUrl: () => required("GITHUB_WEBHOOK_URL"),
  githubWebhookSecret: () => required("GITHUB_WEBHOOK_SECRET"),
  githubToken: () => process.env.GITHUB_TOKEN?.trim(),
  mongodbUri: () => required("MONGODB_URI"),
  openAiApiKey: () => required("OPENAI_API_KEY"),
  openAiBaseUrl: () => process.env.OPENAI_BASE_URL?.trim(),
  openAiModel: () => process.env.OPENAI_MODEL?.trim(),
  redisUrl: () => required("REDIS_URL"),
  workerConcurrency: () => {
    const value = Number(process.env.WORKER_CONCURRENCY ?? "2");
    return Number.isInteger(value) && value > 0 ? value : 2;
  },
};
