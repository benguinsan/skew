import { createServiceClient } from "@/lib/supabase/service";
import type {
  Article,
  ArticleAnalysis,
  TablesInsert,
} from "@/lib/supabase/types";
import { requireData, throwOnError } from "@/lib/supabase/queries/helpers";

export type PendingAnalysisArticle = Article;

/**
 * Pending = no `article_analyses` row (LEFT JOIN semantics).
 * Do not rely on `analyzed_at IS NULL` alone (AGENTS §19).
 */
export async function getArticlesPendingAnalysis(
  limit = 50,
): Promise<PendingAnalysisArticle[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      `
      *,
      article_analyses ( id )
    `,
    )
    .order("scraped_at", { ascending: true })
    .limit(limit);

  throwOnError(error, "getArticlesPendingAnalysis");

  type Row = Article & {
    article_analyses: { id: string } | { id: string }[] | null;
  };

  const rows = (data ?? []) as Row[];
  return rows
    .filter((row) => {
      const analyses = row.article_analyses;
      if (analyses == null) return true;
      if (Array.isArray(analyses)) return analyses.length === 0;
      return false;
    })
    .map((row) => {
      const article: Article = {
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
      return article;
    });
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
