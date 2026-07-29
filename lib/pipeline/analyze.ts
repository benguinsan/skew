import "server-only";

import { analyzeAndSaveArticle } from "@/lib/ai/analyze-article";
import { getAnalysisModelId } from "@/lib/ai/client";
import { getAnalysisBatchSize, MAX_ANALYSIS_BATCH_SIZE } from "@/lib/ai/env";
import {
  getArticlesPendingAnalysis,
  getPendingArticlesByIds,
} from "@/lib/supabase/queries/analyses";
import { insertLog } from "@/lib/supabase/queries/logs";
import type { Article } from "@/lib/supabase/types";
import type {
  AnalyzePipelineOptions,
  AnalyzeRunError,
  AnalyzeRunSummary,
} from "@/lib/pipeline/types";

function clampBatchSize(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) {
    return getAnalysisBatchSize();
  }
  return Math.min(MAX_ANALYSIS_BATCH_SIZE, Math.max(1, Math.floor(value)));
}

function titleSnippet(title: string, max = 60): string {
  const t = title.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function emptySummary(startedAt: number, model: string): AnalyzeRunSummary {
  return {
    status: "completed",
    pendingFound: 0,
    analyzed: 0,
    skipped: 0,
    failed: 0,
    batches: 0,
    model,
    totalDurationMs: Date.now() - startedAt,
  };
}

async function loadNextBatch(
  options: AnalyzePipelineOptions,
  batchSize: number,
  excludeIds: Set<string>,
): Promise<Article[]> {
  if (options.articleIds && options.articleIds.length > 0) {
    const pending = await getPendingArticlesByIds(options.articleIds);
    return pending.filter((a) => !excludeIds.has(a.id)).slice(0, batchSize);
  }

  return getArticlesPendingAnalysis(batchSize, excludeIds);
}

/**
 * Analyze all pending articles (or a subset) in batches (AGENTS §19).
 * Failed/skipped articles are excluded for the rest of the run so they
 * are not retried in a tight loop (they remain pending in the DB).
 */
export async function runAnalyzePending(
  options: AnalyzePipelineOptions = {},
): Promise<AnalyzeRunSummary> {
  const startedAt = Date.now();
  let model: string;
  try {
    model = getAnalysisModelId();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Missing OpenRouter config";
    console.error("[analyze] fatal config:", message);
    await insertLog({
      level: "error",
      message: "AI analysis failed to start",
      context: { error: message },
    }).catch(() => undefined);
    return {
      status: "failed",
      pendingFound: 0,
      analyzed: 0,
      skipped: 0,
      failed: 0,
      batches: 0,
      model: "",
      totalDurationMs: Date.now() - startedAt,
      errors: [{ message }],
    };
  }

  const batchSize = clampBatchSize(options.batchSize);
  const maxArticles =
    options.limit != null && !Number.isNaN(options.limit)
      ? Math.max(0, Math.floor(options.limit))
      : Number.POSITIVE_INFINITY;

  if (maxArticles === 0) {
    return emptySummary(startedAt, model);
  }

  console.log(
    `[analyze] started model=${model} batchSize=${batchSize}` +
      (Number.isFinite(maxArticles) ? ` limit=${maxArticles}` : "") +
      (options.articleIds?.length
        ? ` articleIds=${options.articleIds.length}`
        : " scope=all-pending"),
  );

  await insertLog({
    level: "info",
    message: "AI analysis started",
    context: {
      model,
      batchSize,
      limit: Number.isFinite(maxArticles) ? maxArticles : null,
      articleIdsCount: options.articleIds?.length ?? null,
    },
  });

  const errors: AnalyzeRunError[] = [];
  const excludeIds = new Set<string>();
  let pendingFound = 0;
  let analyzed = 0;
  let skipped = 0;
  let failed = 0;
  let batches = 0;

  try {
    while (analyzed + skipped + failed < maxArticles) {
      const remaining = maxArticles - (analyzed + skipped + failed);
      const thisBatchSize = Math.min(batchSize, remaining);
      const batch = await loadNextBatch(options, thisBatchSize, excludeIds);

      if (batch.length === 0) {
        break;
      }

      batches += 1;
      pendingFound += batch.length;
      console.log(
        `[analyze] batch ${batches} size=${batch.length} (analyzed=${analyzed} skipped=${skipped} failed=${failed})`,
      );

      for (const article of batch) {
        excludeIds.add(article.id);
        console.log(
          `[analyze] processing article=${article.id} "${titleSnippet(article.title)}"`,
        );

        const result = await analyzeAndSaveArticle(article);
        if (result.ok) {
          analyzed += 1;
        } else if (result.reason === "skipped") {
          skipped += 1;
          console.log(
            `[analyze] skipped article=${article.id}: ${result.message}`,
          );
        } else {
          failed += 1;
          errors.push({ articleId: article.id, message: result.message });
          console.warn(
            `[analyze] failed article=${article.id}: ${result.message}`,
          );
        }

        if (analyzed + skipped + failed >= maxArticles) {
          break;
        }
      }
    }

    const summary: AnalyzeRunSummary = {
      status: "completed",
      pendingFound,
      analyzed,
      skipped,
      failed,
      batches,
      model,
      totalDurationMs: Date.now() - startedAt,
      ...(errors.length > 0 ? { errors } : {}),
    };

    console.log("[analyze] completed", summary);

    await insertLog({
      level: "info",
      message: "AI analysis completed",
      context: { ...summary },
    });

    return summary;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI analysis pipeline failed";
    console.error("[analyze] fatal:", message);

    const summary: AnalyzeRunSummary = {
      status: "failed",
      pendingFound,
      analyzed,
      skipped,
      failed,
      batches,
      model,
      totalDurationMs: Date.now() - startedAt,
      errors: [...errors, { message }],
    };

    await insertLog({
      level: "error",
      message: "AI analysis failed",
      context: { ...summary },
    }).catch(() => undefined);

    return summary;
  }
}
