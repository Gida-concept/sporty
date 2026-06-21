import { config } from '@/config/index.js';
import { AppError } from '@/middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionParams {
  model?: string;
  messages: ChatCompletionMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}

export interface StructuredGenerationParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'https://api.groq.com/openai/v1';
const PRIMARY_MODEL = 'llama4-70b-8192';
const FALLBACK_MODEL = 'mixtral-8x7b-32768';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 4096;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

/** Approximate industry-standard pricing per 1M tokens. */
const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'llama4-70b-8192': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'mixtral-8x7b-32768': { inputPer1M: 0.24, outputPer1M: 0.24 },
};

// ---------------------------------------------------------------------------
// GroqAPI
// ---------------------------------------------------------------------------

class GroqAPI {
  /**
   * Running total of tokens consumed across all API calls.
   */
  public totalTokensUsed = 0;

  /**
   * Running estimated cost in USD across all API calls.
   */
  public totalCostUsd = 0;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Send a chat completion request.
   *
   * Uses the primary Llama 4 model by default. Pass `model` in params to
   * override, or use {@link generateWithFallback} for automatic fallback.
   */
  async generateChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse> {
    const body: Record<string, unknown> = {
      model: params.model ?? PRIMARY_MODEL,
      messages: params.messages,
      temperature: params.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: params.max_tokens ?? DEFAULT_MAX_TOKENS,
    };

    if (params.response_format) {
      body.response_format = params.response_format;
    }

    return this._fetch('/chat/completions', body);
  }

  /**
   * Generate structured JSON output by forcing Groq's `json_object` response
   * format. Returns the parsed JSON object.
   */
  async generateStructured<T>(params: StructuredGenerationParams): Promise<T> {
    const response = await this.generateChatCompletion({
      model: PRIMARY_MODEL,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: params.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: params.max_tokens ?? DEFAULT_MAX_TOKENS,
      response_format: { type: 'json_object' },
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new AppError('E003', 'Empty response from Groq', 500);
    }

    // Defensively strip any markdown code fences that might wrap the JSON
    const cleaned = rawContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new AppError('E003', 'Invalid JSON response from Groq', 500);
    }
  }

  /**
   * Generate a chat completion with automatic model fallback.
   *
   * Tries the primary Llama 4 model first. On any failure (including
   * rate-limit or server errors exhausted after retries) the call is
   * retried once with the Mixtral fallback model using the same prompt
   * parameters.
   */
  async generateWithFallback(params: ChatCompletionParams): Promise<ChatCompletionResponse> {
    const primaryParams: ChatCompletionParams = {
      ...params,
      model: params.model ?? PRIMARY_MODEL,
    };

    try {
      const result = await this.generateChatCompletion(primaryParams);
      console.log(`[GroqAPI] generateWithFallback used primary model: ${result.model}`);
      return result;
    } catch (primaryError) {
      const message = primaryError instanceof Error ? primaryError.message : String(primaryError);
      console.warn(
        `[GroqAPI] Primary model ${primaryParams.model} failed: ${message}. ` +
          `Falling back to ${FALLBACK_MODEL}.`,
      );

      const fallbackParams: ChatCompletionParams = {
        ...params,
        model: FALLBACK_MODEL,
      };

      const result = await this.generateChatCompletion(fallbackParams);
      console.log(`[GroqAPI] generateWithFallback used fallback model: ${result.model}`);
      return result;
    }
  }

  /**
   * Estimate the cost of a single completion response based on token usage.
   *
   * Does **not** update the class-level running totals (those are tracked
   * automatically by every API call).
   */
  estimateCost(response: ChatCompletionResponse): {
    totalTokens: number;
    estimatedCostUsd: number;
  } {
    const model = response.model;
    const usage = response.usage;
    const pricing = MODEL_PRICING[model] ?? MODEL_PRICING[PRIMARY_MODEL]!;

    const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (usage.completion_tokens / 1_000_000) * pricing.outputPer1M;
    const estimatedCostUsd = Number((inputCost + outputCost).toFixed(8));

    return {
      totalTokens: usage.total_tokens,
      estimatedCostUsd,
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Core HTTP helper.  Sends a POST to `{BASE_URL}{path}`, maps HTTP errors
   * to typed `AppError` codes, and retries on 429 / 5xx with exponential
   * backoff (up to 3 retries).
   */
  private async _fetch(path: string, body: unknown): Promise<ChatCompletionResponse> {
    const url = `${BASE_URL}${path}`;
    const apiKey = config.groqApiKey;

    if (!apiKey) {
      throw new AppError('E011', 'Groq API key is not configured', 401);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Throttle before retries (first attempt passes through immediately)
        if (attempt > 0) {
          const delayMs = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
          await this._sleep(delayMs);
        }

        const startTime = performance.now();
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const latencyMs = Math.round(performance.now() - startTime);

        // --- success -------------------------------------------------------
        if (response.ok) {
          const data: ChatCompletionResponse = (await response.json()) as ChatCompletionResponse;

          this._logCall(data, latencyMs);
          this._trackUsage(data);

          return data;
        }

        // --- HTTP error ----------------------------------------------------
        const status = response.status;

        let errorBody: Record<string, unknown> | null = null;
        try {
          errorBody = (await response.json()) as Record<string, unknown>;
        } catch {
          // response body not parseable — proceed with status text
        }

        const errorMessage =
          (errorBody as { error?: { message?: string } } | null)?.error?.message ??
          response.statusText;

        // Non-retryable — map and throw immediately
        if (status === 401) {
          throw new AppError('E011', `Invalid Groq API key: ${errorMessage}`, 401);
        }

        if (status === 400) {
          throw new AppError('E012', `Invalid request to Groq: ${errorMessage}`, 400);
        }

        // Retryable (rate limit or server error)
        if (status === 429 || status >= 500) {
          lastError = new AppError(
            'E001',
            `Groq API rate limit or server error: ${errorMessage}`,
            429,
          );
          continue;
        }

        // Unknown status code
        throw new AppError('E999', `Groq API error (${status}): ${errorMessage}`, 500);
      } catch (err) {
        if (err instanceof AppError) {
          // Only E001 (rate limit) and E999 (generic server) are retryable
          if (err.code !== 'E001' && err.code !== 'E999') {
            throw err;
          }
          lastError = err;
        } else {
          // Network / DNS / timeout errors
          const message = err instanceof Error ? err.message : String(err);
          lastError = new AppError('E999', `Groq API error: ${message}`, 500);
        }
      }
    }

    // All retries exhausted
    throw lastError ?? new AppError('E999', 'Groq API request failed after all retries', 500);
  }

  /**
   * Log an API call (model, token usage, latency).
   */
  private _logCall(data: ChatCompletionResponse, latencyMs: number): void {
    if (data.usage) {
      console.log(
        `[GroqAPI] model=${data.model} ` +
          `prompt_tokens=${data.usage.prompt_tokens} ` +
          `completion_tokens=${data.usage.completion_tokens} ` +
          `total_tokens=${data.usage.total_tokens} ` +
          `latency=${latencyMs}ms`,
      );
    } else {
      console.log(`[GroqAPI] model=${data.model} latency=${latencyMs}ms (no usage data)`);
    }
  }

  /**
   * Update the class-level running token / cost totals.
   */
  private _trackUsage(data: ChatCompletionResponse): void {
    if (!data.usage) return;

    const pricing = MODEL_PRICING[data.model] ?? MODEL_PRICING[PRIMARY_MODEL]!;
    const inputCost = (data.usage.prompt_tokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (data.usage.completion_tokens / 1_000_000) * pricing.outputPer1M;

    this.totalTokensUsed += data.usage.total_tokens;
    this.totalCostUsd += Number((inputCost + outputCost).toFixed(8));
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default GroqAPI;
