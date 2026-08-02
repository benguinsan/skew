import { createServiceClient } from "@/lib/supabase/service";
import type {
  Article,
  ArticleAnalysis,
  TablesInsert,
} from "@/lib/supabase/types";
import {
  chunkArray,
  requireData,
  throwOnError,
  URL_EXISTENCE_CHUNK_SIZE,
} from "@/lib/supabase/queries/helpers";

/** full = missing analysis row; embedding = analysis exists but embedding is null. */
export type PendingAnalysisMode = "full" | "embedding";

export type PendingAnalysisArticle = Article & {
  mode: PendingAnalysisMode;
};

const PENDING_SCAN_PAGE_SIZE = 50;

type ArticleWithAnalyses = Article & {
  article_analyses:
    | { id: string; embedding: number[] | string | null }
    | { id: string; embedding: number[] | string | null }[]
    | null;
};

function unwrapAnalyses(
  value: ArticleWithAnalyses["article_analyses"],
): { id: string; embedding: number[] | string | null }[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function hasEmbedding(
  embedding: number[] | string | null | undefined,
): boolean {
  if (embedding == null) return false;
  if (Array.isArray(embedding)) return embedding.length > 0;
  if (typeof embedding === "string") return embedding.trim().length > 0;
  return false;
}

function toArticle(row: ArticleWithAnalyses): Article {
  return {
    id: row.id,
    source_id: row.source_id,
    original_url: row.original_url,
    canonical_url: row.canonical_url,
    title: row.title,
    image_url: row.image_url,
    published_at: row.published_at,
    raw_text: row.raw_text,
    scraped_at: row.scraped_at,
    analyzed_at: row.analyzed_at,
    created_at: row.created_at,
  };
}

function toPending(row: ArticleWithAnalyses): PendingAnalysisArticle | null {
  const analyses = unwrapAnalyses(row.article_analyses);
  if (analyses.length === 0) {
    return { ...toArticle(row), mode: "full" };
  }
  if (!hasEmbedding(analyses[0]?.embedding)) {
    return { ...toArticle(row), mode: "embedding" };
  }
  return null;
}

/**
 * Pending = no `article_analyses` row, OR analysis exists with null embedding
 * (AGENTS §19 + §20 backfill). Do not rely on `analyzed_at IS NULL` alone.
 *
 * Pages through articles ordered by scraped_at until `limit` pending rows
 * are collected or the table is exhausted.
 *
 * `excludeIds` skips articles already attempted in the current run
 * (failed/skipped rows that are still pending in the DB).
 */
export async function getArticlesPendingAnalysis(
  limit = 50,
  excludeIds?: ReadonlySet<string>,
): Promise<PendingAnalysisArticle[]> {
  if (limit <= 0) {
    return [];
  }

  const supabase = createServiceClient();
  const pending: PendingAnalysisArticle[] = [];
  let offset = 0;

  while (pending.length < limit) {
    const { data, error } = await supabase
      .from("articles")
      .select(
        `
        *,
        article_analyses ( id, embedding )
      `,
      )
      .order("scraped_at", { ascending: true })
      .range(offset, offset + PENDING_SCAN_PAGE_SIZE - 1);

    throwOnError(error, "getArticlesPendingAnalysis");

    const rows = (data ?? []) as ArticleWithAnalyses[];
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      if (excludeIds?.has(row.id)) continue;
      const item = toPending(row);
      if (!item) continue;
      pending.push(item);
      if (pending.length >= limit) break;
    }

    offset += rows.length;
    if (rows.length < PENDING_SCAN_PAGE_SIZE) {
      break;
    }
  }

  return pending;
}

/**
 * Load specific articles and keep only those still missing analysis or embedding.
 */
export async function getPendingArticlesByIds(
  articleIds: string[],
): Promise<PendingAnalysisArticle[]> {
  const unique = [...new Set(articleIds.filter(Boolean))];
  if (unique.length === 0) {
    return [];
  }

  const supabase = createServiceClient();
  const pending: PendingAnalysisArticle[] = [];

  for (const chunk of chunkArray(unique, URL_EXISTENCE_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("articles")
      .select(
        `
        *,
        article_analyses ( id, embedding )
      `,
      )
      .in("id", chunk);

    throwOnError(error, "getPendingArticlesByIds");

    const rows = (data ?? []) as ArticleWithAnalyses[];
    for (const row of rows) {
      const item = toPending(row);
      if (item) {
        pending.push(item);
      }
    }
  }

  // Preserve caller order
  const byId = new Map(pending.map((a) => [a.id, a]));
  return unique
    .map((id) => byId.get(id))
    .filter((a): a is PendingAnalysisArticle => a != null);
}

export async function getAnalysisByArticleId(
  articleId: string,
): Promise<ArticleAnalysis | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("article_analyses")
    .select("*")
    .eq("article_id", articleId)
    .maybeSingle();

  throwOnError(error, "getAnalysisByArticleId");
  return data;
}

export async function upsertAnalysis(
  analysis: TablesInsert<"article_analyses">,
): Promise<ArticleAnalysis> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("article_analyses")
    .upsert(analysis, { onConflict: "article_id" })
    .select("*")
    .single();

  throwOnError(error, "upsertAnalysis");
  return requireData(data, "upsertAnalysis");
}

/** Embedding-only backfill — does not touch analysis text fields. */
export async function updateAnalysisEmbedding(
  articleId: string,
  embedding: number[],
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("article_analyses")
    .update({ embedding })
    .eq("article_id", articleId);

  throwOnError(error, "updateAnalysisEmbedding");
}
