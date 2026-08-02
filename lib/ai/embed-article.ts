import "server-only";

import { embed } from "ai";
import { getEmbeddingModel, getEmbeddingModelId } from "@/lib/ai/client";
import type { Article } from "@/lib/supabase/types";

/** Soft cap on article body sent to the embedding model (chars). */
const MAX_BODY_CHARS = 12_000;

/** Expected dimensions for openai/text-embedding-3-small via OpenRouter.
 * Must stay ≤2000 for Supabase IVFFlat/HNSW indexes. */
export const EMBEDDING_DIMENSIONS = 1536;

export function buildEmbeddingInput(article: Article): string {
  const body =
    article.raw_text.length > MAX_BODY_CHARS
      ? `${article.raw_text.slice(0, MAX_BODY_CHARS)}\n\n[Article truncated for length.]`
      : article.raw_text;

  return `Title: ${article.title.trim()}\n\n${body.trim()}`;
}

/**
 * Generate a 1536-dim embedding for an article via OpenRouter.
 * Does not log the vector itself.
 */
export async function embedArticle(article: Article): Promise<{
  embedding: number[];
  modelId: string;
}> {
  const modelId = getEmbeddingModelId();
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: buildEmbeddingInput(article),
  });

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Embedding model returned an empty vector");
  }

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS}-dim embedding, got ${embedding.length} (model=${modelId})`,
    );
  }

  return { embedding, modelId };
}
