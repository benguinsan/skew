import "server-only";

import { generateText, Output } from "ai";
import { getAnalysisModel, getAnalysisModelId } from "@/lib/ai/client";
import { embedArticle } from "@/lib/ai/embed-article";
import {
  articleAnalysisOutputSchema,
  mapAnalysisOutputToInsert,
} from "@/lib/ai/schema";
import {
  updateAnalysisEmbedding,
  upsertAnalysis,
  type PendingAnalysisMode,
} from "@/lib/supabase/queries/analyses";
import { markArticleAnalyzed } from "@/lib/supabase/queries/articles";
import type { Article } from "@/lib/supabase/types";

/** Soft cap on article body sent to the model (chars). */
const MAX_BODY_CHARS = 12_000;

const SYSTEM_PROMPT = `You are an impartial news analyst for biasly.
Analyze the article text only. Do not infer political framing from the source name or outlet reputation.

Return structured fields for:
- A neutral summary
- Sentiment score and label
- AI-estimated political framing (left / center / right / mixed / unclear) with left/center/right percentages that sum to exactly 100
- Confidence (0–1)
- Framing notes, loaded terms, and a short disclaimer that framing is AI-estimated, not objective truth

Rules:
- Use article text evidence only.
- If evidence is weak or ambiguous, use politicalFramingLabel "unclear" and keep confidence low.
- The framing label should match the strongest percentage unless confidence is low or the top percentages are close — then prefer "mixed" or "unclear".
- Percentages must be integers 0–100 and must sum to 100.
- Do not invent facts not present in the article.`;

export type AnalyzeArticleSuccess = {
  ok: true;
  analysisId?: string;
  mode: PendingAnalysisMode;
};

export type AnalyzeArticleFailure = {
  ok: false;
  reason: "skipped" | "failed";
  message: string;
  mode: PendingAnalysisMode;
};

export type AnalyzeArticleResult =
  AnalyzeArticleSuccess | AnalyzeArticleFailure;

function titleSnippet(title: string, max = 80): string {
  const t = title.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function buildUserPrompt(article: Article): string {
  const body =
    article.raw_text.length > MAX_BODY_CHARS
      ? `${article.raw_text.slice(0, MAX_BODY_CHARS)}\n\n[Article truncated for length.]`
      : article.raw_text;

  return `Analyze this news article.

Title: ${article.title}

Body:
${body}`;
}

function validateArticleContent(
  article: Article,
  mode: PendingAnalysisMode,
): AnalyzeArticleFailure | null {
  if (!article.raw_text.trim() || !article.title.trim()) {
    return {
      ok: false,
      reason: "skipped",
      message: "Missing title or raw_text",
      mode,
    };
  }

  if (!article.image_url || !article.published_at) {
    return {
      ok: false,
      reason: "skipped",
      message: "Missing image_url or published_at",
      mode,
    };
  }

  return null;
}

async function generateValidatedAnalysis(article: Article) {
  const modelId = getAnalysisModelId();
  const { output } = await generateText({
    model: getAnalysisModel(),
    output: Output.object({
      schema: articleAnalysisOutputSchema,
    }),
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(article),
  });

  if (output == null) {
    throw new Error("Model returned empty structured output");
  }

  // Output.object already validates; re-parse for a clear Zod error on edge cases.
  return {
    parsed: articleAnalysisOutputSchema.parse(output),
    modelId,
  };
}

async function embedWithRetry(article: Article): Promise<number[]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { embedding, modelId } = await embedArticle(article);
      console.log(
        `[analyze] embedding ok article=${article.id} model=${modelId} attempt=${attempt}`,
      );
      return embedding;
    } catch (error) {
      lastError = error;
      const message =
        error instanceof Error ? error.message : "Unknown embedding error";
      console.warn(
        `[analyze] embedding attempt ${attempt} failed article=${article.id}: ${message}`,
      );
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Embedding failed");
}

/**
 * Embedding-only backfill for rows that already have analysis (AGENTS §20).
 */
async function backfillEmbedding(
  article: Article,
): Promise<AnalyzeArticleResult> {
  const mode: PendingAnalysisMode = "embedding";
  const invalid = validateArticleContent(article, mode);
  if (invalid) return invalid;

  try {
    const embedding = await embedWithRetry(article);
    await updateAnalysisEmbedding(article.id, embedding);
    if (!article.analyzed_at) {
      await markArticleAnalyzed(article.id);
    }
    console.log(
      `[analyze] embedding backfill ok article=${article.id} "${titleSnippet(article.title)}"`,
    );
    return { ok: true, mode };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Embedding backfill failed";
    return { ok: false, reason: "failed", message, mode };
  }
}

/**
 * Full analysis + embedding. Upserts both in one write, then sets analyzed_at
 * only after a successful save (AGENTS §19–20).
 */
async function analyzeFull(article: Article): Promise<AnalyzeArticleResult> {
  const mode: PendingAnalysisMode = "full";
  const invalid = validateArticleContent(article, mode);
  if (invalid) return invalid;

  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { parsed, modelId } = await generateValidatedAnalysis(article);
      const embedding = await embedWithRetry(article);
      const insert = {
        ...mapAnalysisOutputToInsert(article.id, parsed, modelId),
        embedding,
      };
      const saved = await upsertAnalysis(insert);
      await markArticleAnalyzed(article.id);

      console.log(
        `[analyze] ok article=${article.id} "${titleSnippet(article.title)}" attempt=${attempt}`,
      );

      return { ok: true, analysisId: saved.id, mode };
    } catch (error) {
      lastError = error;
      const message =
        error instanceof Error ? error.message : "Unknown analysis error";
      console.warn(
        `[analyze] attempt ${attempt} failed article=${article.id} "${titleSnippet(article.title)}": ${message}`,
      );
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "Analysis failed";
  return { ok: false, reason: "failed", message, mode };
}

/**
 * Process one pending article: full analysis+embedding, or embedding backfill.
 */
export async function analyzeAndSaveArticle(
  article: Article,
  mode: PendingAnalysisMode = "full",
): Promise<AnalyzeArticleResult> {
  if (mode === "embedding") {
    return backfillEmbedding(article);
  }
  return analyzeFull(article);
}
