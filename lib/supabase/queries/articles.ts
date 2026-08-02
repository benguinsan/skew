import { createServiceClient } from "@/lib/supabase/service";
import type {
  Article,
  ArticleDetail,
  HomeArticleCard,
  TablesInsert,
} from "@/lib/supabase/types";
import {
  chunkArray,
  requireData,
  throwOnError,
  URL_EXISTENCE_CHUNK_SIZE,
} from "@/lib/supabase/queries/helpers";

const DEFAULT_HOME_LIMIT = 24;

type HomeFeedRow = {
  id: string;
  title: string;
  image_url: string;
  published_at: string;
  sources: { name: string } | { name: string }[] | null;
  article_analyses:
    | {
        sentiment_label: HomeArticleCard["sentimentLabel"];
        bias_label: HomeArticleCard["biasLabel"];
        left_percentage: number;
        center_percentage: number;
        right_percentage: number;
        confidence: number;
      }
    | {
        sentiment_label: HomeArticleCard["sentimentLabel"];
        bias_label: HomeArticleCard["biasLabel"];
        left_percentage: number;
        center_percentage: number;
        right_percentage: number;
        confidence: number;
      }[]
    | null;
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapHomeFeedRow(row: HomeFeedRow): HomeArticleCard | null {
  const source = unwrapOne(row.sources);
  const analysis = unwrapOne(row.article_analyses);
  if (!source || !analysis) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    sourceName: source.name,
    imageUrl: row.image_url,
    publishedAt: row.published_at,
    sentimentLabel: analysis.sentiment_label,
    biasLabel: analysis.bias_label,
    leftPercentage: analysis.left_percentage,
    centerPercentage: analysis.center_percentage,
    rightPercentage: analysis.right_percentage,
    confidence: analysis.confidence,
  };
}

export async function getAnalyzedArticlesForHome(
  limit = DEFAULT_HOME_LIMIT,
): Promise<HomeArticleCard[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      `
      id,
      title,
      image_url,
      published_at,
      sources ( name ),
      article_analyses (
        sentiment_label,
        bias_label,
        left_percentage,
        center_percentage,
        right_percentage,
        confidence
      )
    `,
    )
    .not("analyzed_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  throwOnError(error, "getAnalyzedArticlesForHome");

  const rows = (data ?? []) as HomeFeedRow[];
  return rows
    .map(mapHomeFeedRow)
    .filter((card): card is HomeArticleCard => card !== null);
}

export async function getArticleById(id: string): Promise<Article | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  throwOnError(error, "getArticleById");
  return data;
}

export async function getArticleDetailById(
  id: string,
): Promise<ArticleDetail | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      `
      *,
      sources (*),
      article_analyses (*)
    `,
    )
    .eq("id", id)
    .not("analyzed_at", "is", null)
    .maybeSingle();

  throwOnError(error, "getArticleDetailById");
  if (!data) {
    return null;
  }

  const source = unwrapOne(data.sources);
  const analysis = unwrapOne(data.article_analyses);
  if (!source || !analysis) {
    return null;
  }

  const article: Article = {
    id: data.id,
    source_id: data.source_id,
    original_url: data.original_url,
    canonical_url: data.canonical_url,
    title: data.title,
    image_url: data.image_url,
    published_at: data.published_at,
    raw_text: data.raw_text,
    scraped_at: data.scraped_at,
    analyzed_at: data.analyzed_at,
    created_at: data.created_at,
  };

  return {
    article,
    source,
    analysis: {
      ...analysis,
      embedding: parseEmbedding(analysis.embedding as number[] | string | null),
    },
  };
}

/**
 * Returns original URLs that already exist in `articles`.
 * Chunks `.in()` filters to ≤15 URLs per request (AGENTS §9).
 */
export async function findExistingOriginalUrls(
  urls: string[],
): Promise<Set<string>> {
  const unique = [...new Set(urls.filter(Boolean))];
  const existing = new Set<string>();
  if (unique.length === 0) {
    return existing;
  }

  const supabase = createServiceClient();
  for (const chunk of chunkArray(unique, URL_EXISTENCE_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("articles")
      .select("original_url")
      .in("original_url", chunk);

    throwOnError(error, "findExistingOriginalUrls");
    for (const row of data ?? []) {
      existing.add(row.original_url);
    }
  }

  return existing;
}

export async function insertArticle(
  article: TablesInsert<"articles">,
): Promise<Article> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .insert(article)
    .select("*")
    .single();

  throwOnError(error, "insertArticle");
  return requireData(data, "insertArticle");
}

export async function markArticleAnalyzed(
  articleId: string,
  analyzedAt = new Date().toISOString(),
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("articles")
    .update({ analyzed_at: analyzedAt })
    .eq("id", articleId);

  throwOnError(error, "markArticleAnalyzed");
}

/**
 * Normalize a pgvector value from PostgREST (number[] or "[...]" string).
 */
export function parseEmbedding(
  value: number[] | string | null | undefined,
): number[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(Number) : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed: unknown = JSON.parse(
        trimmed.startsWith("[") ? trimmed : `[${trimmed}]`,
      );
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      return parsed.map(Number);
    } catch {
      return null;
    }
  }
  return null;
}

const DEFAULT_RELATED_LIMIT = 5;

type RelatedMatchRow = {
  id: string;
  title: string;
  image_url: string;
  published_at: string;
  source_name: string;
  sentiment_label: HomeArticleCard["sentimentLabel"];
  bias_label: HomeArticleCard["biasLabel"];
  left_percentage: number;
  center_percentage: number;
  right_percentage: number;
  confidence: number;
};

/**
 * Related articles by cosine distance via match_related_articles RPC (AGENTS §20).
 */
export async function getRelatedArticles(
  articleId: string,
  embedding: number[],
  limit = DEFAULT_RELATED_LIMIT,
): Promise<HomeArticleCard[]> {
  if (!embedding.length || limit <= 0) {
    return [];
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("match_related_articles", {
    query_embedding: embedding,
    exclude_article_id: articleId,
    match_count: Math.min(Math.max(1, Math.floor(limit)), 20),
  });

  throwOnError(error, "getRelatedArticles");

  const rows = (data ?? []) as RelatedMatchRow[];
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    sourceName: row.source_name,
    imageUrl: row.image_url,
    publishedAt: row.published_at,
    sentimentLabel: row.sentiment_label,
    biasLabel: row.bias_label,
    leftPercentage: row.left_percentage,
    centerPercentage: row.center_percentage,
    rightPercentage: row.right_percentage,
    confidence: Number(row.confidence),
  }));
}
