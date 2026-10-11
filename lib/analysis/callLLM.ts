/**
 * lib/analysis/callLLM.ts
 *
 * Thin, retrying wrapper around the OpenAI SDK.
 * Supports OpenAI (gpt-4o), Groq (llama-3.3-70b-versatile), and OpenAI-compatible providers.
 * All LLM calls in this project go through this function.
 * No business logic here — just reliability: retries, timeout, and error mapping.
 */

import OpenAI from 'openai';
import { LLMError } from '@/lib/errors';
import { env } from '@/lib/config/env';

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes
/** Keep room for the model's response across providers with smaller contexts. */
const MAX_USER_PROMPT_CHARS = 180_000;
const MAX_COMPLETION_TOKENS = 4_096;

export interface LLMCallOptions {
  maxRetries?: number;
  timeoutMs?: number;
}

function getClientAndModel() {
  const apiKey = env.openAiApiKey();

  // Auto-detect Groq keys (gsk_...) or use custom base URL
  const isGroq =
    apiKey.startsWith('gsk_') ||
    env.openAiBaseUrl()?.includes('groq.com');

  const baseURL =
    env.openAiBaseUrl() ??
    (isGroq ? 'https://api.groq.com/openai/v1' : undefined);

  const model =
    env.openAiModel() ??
    (isGroq ? 'openai/gpt-oss-120b' : 'gpt-4o');

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  return { client, model };
}

function limitPrompt(prompt: string): string {
  if (prompt.length <= MAX_USER_PROMPT_CHARS) return prompt;

  return `${prompt.slice(
    0,
    MAX_USER_PROMPT_CHARS
  )}\n\n[Input truncated to fit the model context window.]`;
}

function isContextLengthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    status?: number;
    message?: string;
    error?: { code?: string; message?: string };
  };
  const message = `${candidate.message ?? ''} ${
    candidate.error?.message ?? ''
  }`.toLowerCase();
  const code = candidate.error?.code?.toLowerCase();

  return (
    candidate.status === 400 &&
    (code === 'context_length_exceeded' ||
      message.includes('reduce the length of the messages') ||
      message.includes('context length'))
  );
}

/**
 * Sends a chat completion request to the LLM and returns the raw response text.
 *
 * @param systemPrompt - Instruction prompt (role: system).
 * @param userPrompt   - Content prompt (role: user).
 * @param options      - Optional retry/timeout overrides.
 * @returns Raw text from the model's first choice message.
 * @throws LLMError on timeout, API error, or empty response.
 */
export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions = {}
): Promise<string> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const { client, model } = getClientAndModel();

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await client.chat.completions.create(
          {
            model,
            response_format: { type: 'json_object' },
            max_completion_tokens: MAX_COMPLETION_TOKENS,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: limitPrompt(userPrompt) },
            ],
            temperature: 0.2, // Low temperature for deterministic structured output.
          },
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new LLMError('LLM_API_ERROR', 'LLM returned an empty response.');
      }

      return content;
    } catch (err) {
      lastError = err;

      if (err instanceof LLMError) throw err;

      const isAborted =
        err instanceof Error &&
        (err.name === 'AbortError' || err.message.includes('abort'));

      if (isAborted) {
        throw new LLMError(
          'LLM_TIMEOUT',
          `LLM call timed out after ${timeoutMs}ms (attempt ${attempt + 1})`
        );
      }

      // A context-length error is deterministic; retrying the same payload
      // only delays the actionable failure and can multiply provider charges.
      if (isContextLengthError(err)) {
        throw new LLMError(
          'LLM_API_ERROR',
          'LLM request exceeded the model context limit. Reduce the repository context and try again.'
        );
      }

      // On the last attempt, stop retrying.
      if (attempt === maxRetries) break;

      // Brief back-off before retrying a transient error.
      await new Promise((r) => setTimeout(r, 1_000 * (attempt + 1)));
    }
  }

  throw new LLMError(
    'LLM_API_ERROR',
    `LLM API failed after ${maxRetries + 1} attempts: ${String(lastError)}`
  );
}
