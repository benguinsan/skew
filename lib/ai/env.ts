import "server-only";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Server-only. Never expose via NEXT_PUBLIC_* or Client Components. */
export function getOpenRouterApiKey(): string {
  return requireEnv("OPENROUTER_API_KEY");
}

/** OpenRouter model id used for article analysis (saved to article_analyses.model). */
export function getOpenRouterAnalysisModel(): string {
  return requireEnv("OPENROUTER_ANALYSIS_MODEL");
}

/** Default OpenRouter embedding model (1536 dims — matches pgvector column). */
export const DEFAULT_OPENROUTER_EMBEDDING_MODEL =
  "openai/text-embedding-3-small";

/**
 * OpenRouter embedding model id. Optional env; defaults to text-embedding-3-small.
 * Must output 1536 dims (Supabase vector indexes cap at 2000).
 */
export function getOpenRouterEmbeddingModel(): string {
  const raw = process.env.OPENROUTER_EMBEDDING_MODEL?.trim();
  if (!raw) {
    return DEFAULT_OPENROUTER_EMBEDDING_MODEL;
  }
  return raw;
}

export const DEFAULT_ANALYSIS_BATCH_SIZE = 5;
export const MAX_ANALYSIS_BATCH_SIZE = 20;

/** Articles analyzed per batch (default 5, max 20). */
export function getAnalysisBatchSize(): number {
  const raw = process.env.ANALYSIS_BATCH_SIZE;
  if (!raw) {
    return DEFAULT_ANALYSIS_BATCH_SIZE;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_ANALYSIS_BATCH_SIZE;
  }
  return Math.min(MAX_ANALYSIS_BATCH_SIZE, Math.max(1, Math.floor(parsed)));
}
