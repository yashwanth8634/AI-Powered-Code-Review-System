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

function limitPrompt(prompt: string, maximumChars: number): string {
  if (prompt.length <= maximumChars) return prompt;

  const suffix = '\n\n[Input truncated to fit the model context window.]';
  if (maximumChars <= suffix.length) {
    return prompt.slice(0, maximumChars);
  }

  return `${prompt.slice(0, maximumChars - suffix.length)}${suffix}`;
}

interface ProviderErrorDetails {
  status?: number;
  message: string;
}

function providerErrorDetails(error: unknown): ProviderErrorDetails {
  if (!error || typeof error !== 'object') {
    return { message: String(error) };
  }

  const candidate = error as {
    status?: number;
    message?: string;
    error?: { code?: string; message?: string };
  };
  return {
    status: candidate.status,
    message: `${candidate.message ?? ''} ${
      candidate.error?.message ?? ''
    }`.trim(),
  };
}

function isPromptTooLargeError(error: unknown): boolean {
  const { status, message } = providerErrorDetails(error);
  const normalized = message.toLowerCase();

  return (
    (status === 400 || status === 413) &&
    (normalized.includes('context_length_exceeded') ||
      normalized.includes('reduce the length of the messages') ||
      normalized.includes('context length') ||
      normalized.includes('request too large') ||
      normalized.includes('tokens per minute') ||
      normalized.includes('token limit'))
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
  const maxUserPromptChars = env.llmMaxUserPromptChars();
  const maxCompletionTokens = env.llmMaxCompletionTokens();

  const { client, model } = getClientAndModel();
  const limitedUserPrompt = limitPrompt(userPrompt, maxUserPromptChars);

  if (limitedUserPrompt.length !== userPrompt.length) {
    console.warn('[callLLM] User prompt truncated', {
      event: 'llm_prompt_truncated',
      model,
      originalChars: userPrompt.length,
      maxUserPromptChars,
    });
  }

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
            max_completion_tokens: maxCompletionTokens,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: limitedUserPrompt },
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

      // A prompt-budget error is deterministic; retrying it only delays the
      // scan and can consume a provider's TPM quota.
      if (isPromptTooLargeError(err)) {
        const details = providerErrorDetails(err);
        console.warn('[callLLM] Prompt exceeds provider token budget', {
          event: 'llm_prompt_too_large',
          model,
          status: details.status,
          userPromptChars: limitedUserPrompt.length,
          maxCompletionTokens,
        });
        throw new LLMError(
          'LLM_CONTEXT_TOO_LARGE',
          'The selected repository context is too large for the configured AI model. Try again after reducing the context limit or selecting a model with a larger request budget.'
        );
      }

      // On the last attempt, stop retrying.
      if (attempt === maxRetries) break;

      // Brief back-off before retrying a transient error.
      await new Promise((r) => setTimeout(r, 1_000 * (attempt + 1)));
    }
  }

  const details = providerErrorDetails(lastError);
  console.error('[callLLM] LLM request failed', {
    event: 'llm_request_failed',
    model,
    attempts: maxRetries + 1,
    status: details.status,
    diagnostic: details.message,
  });
  throw new LLMError(
    'LLM_API_ERROR',
    'The AI analysis service could not complete the scan. Please try again shortly.'
  );
}
