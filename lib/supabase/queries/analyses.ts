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

export type PendingAnalysisArticle = Article;

const PENDING_SCAN_PAGE_SIZE = 50;

type ArticleWithAnalyses = Article & {
  article_analyses: { id: string } | { id: string }[] | null;
};

function unwrapAnalyses(
  value: ArticleWithAnalyses["article_analyses"],
): { id: string }[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
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

function isPending(row: ArticleWithAnalyses): boolean {
  return unwrapAnalyses(row.article_analyses).length === 0;
}

/**
 * Pending = no `article_analyses` row (LEFT JOIN semantics).
 * Do not rely on `analyzed_at IS NULL` alone (AGENTS §19).
 *
 * Pages through articles ordered by scraped_at until `limit` pending rows
 * are collected or the table is exhausted — avoids empty batches when the
 * oldest N articles already have analyses.
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
        article_analyses ( id )
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
      if (!isPending(row)) continue;
      if (excludeIds?.has(row.id)) continue;
      pending.push(toArticle(row));
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
 * Load specific articles and keep only those still missing an analysis row.
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
        article_analyses ( id )
      `,
      )
      .in("id", chunk);

    throwOnError(error, "getPendingArticlesByIds");

    const rows = (data ?? []) as ArticleWithAnalyses[];
    for (const row of rows) {
      if (isPending(row)) {
        pending.push(toArticle(row));
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
