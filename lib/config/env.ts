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

function boundedInteger(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isInteger(value) && value >= minimum && value <= maximum
    ? value
    : fallback;
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
  // Conservative defaults fit Groq's 8K TPM free tier while remaining
  // configurable for models and accounts with larger request budgets.
  llmMaxUserPromptChars: () =>
    boundedInteger('LLM_MAX_USER_PROMPT_CHARS', 14_000, 1_000, 1_000_000),
  llmMaxCompletionTokens: () =>
    boundedInteger('LLM_MAX_COMPLETION_TOKENS', 1_024, 128, 32_768),
  redisUrl: () => required("REDIS_URL"),
  workerConcurrency: () => {
    // A single worker is the safe default for low-TPM LLM provider tiers.
    // Deployments with a larger provider budget can opt in to more parallelism.
    const value = Number(process.env.WORKER_CONCURRENCY ?? "1");
    return Number.isInteger(value) && value > 0 ? value : 1;
  },
};
