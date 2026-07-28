import * as cheerio from "cheerio";
import { isGenericTitle } from "@/lib/parsing/reject";
import { normalizeArticleUrl } from "@/lib/parsing/urls";

export type ParsedArticle = {
  originalUrl: string;
  canonicalUrl: string | null;
  title: string;
  imageUrl: string;
  publishedAt: string;
  rawText: string;
};

export type ArticleParseFailure = {
  ok: false;
  reason: string;
};

export type ArticleParseSuccess = {
  ok: true;
  article: ParsedArticle;
};

export type ArticleParseResult = ArticleParseSuccess | ArticleParseFailure;

const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "nav",
  "footer",
  "header",
  "aside",
  "[role='navigation']",
  "[role='contentinfo']",
  ".ad",
  ".ads",
  ".advert",
  ".advertisement",
  ".newsletter",
  ".subscribe",
  ".subscription",
  ".related",
  ".related-content",
  ".most-viewed",
  ".most-read",
  ".share",
  ".social",
  ".social-share",
  ".comments",
  ".comment-section",
  "[data-component='most-popular']",
  "[data-component='tags']",
].join(", ");

const ARTICLE_BODY_SELECTORS = [
  "article [data-component='text-block']",
  "article .article-body",
  "article .story-body",
  "article .ArticleBody",
  "article .article__content",
  "article .content__article-body",
  "[itemprop='articleBody']",
  ".article-body__content",
  ".storytext",
  "article p",
  "main p",
];

function metaContent(
  $: cheerio.CheerioAPI,
  selectors: string[],
): string | null {
  for (const selector of selectors) {
    const value = $(selector).attr("content")?.trim();
    if (value) return value;
  }
  return null;
}

function firstAttr($: cheerio.CheerioAPI, selectors: string[]): string | null {
  for (const selector of selectors) {
    const el = $(selector).first();
    const content = el.attr("content")?.trim();
    if (content) return content;
    const src = el.attr("src")?.trim();
    if (src) return src;
    const href = el.attr("href")?.trim();
    if (href) return href;
  }
  return null;
}

function parsePublishedAt(raw: string | null): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  // Reject obviously wrong epoch / future far-off dates lightly
  const year = date.getUTCFullYear();
  if (year < 1990 || year > new Date().getUTCFullYear() + 1) return null;
  return date.toISOString();
}

function cleanParagraphText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isNoiseParagraph(text: string): boolean {
  const lower = text.toLowerCase();
  if (text.length < 40) return true;
  if (
    lower.includes("sign up") ||
    lower.includes("subscribe") ||
    lower.includes("newsletter") ||
    lower.includes("cookie") ||
    lower.includes("advertisement") ||
    lower.startsWith("related:") ||
    lower.startsWith("read more") ||
    lower.startsWith("share this")
  ) {
    return true;
  }
  // CSS/class dump heuristic
  if ((text.match(/[{};]/g) ?? []).length > 8) return true;
  if (/^[.#]?[a-z0-9_-]+(\s+[.#]?[a-z0-9_-]+){6,}$/i.test(text)) return true;
  return false;
}

function splitOversizedParagraph(text: string): string[] {
  if (text.length < 900) return [text];
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z“"])/);
  if (sentences.length < 2) return [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > 500 && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

function extractParagraphs($: cheerio.CheerioAPI): string[] {
  const root = $.root();
  root.find(NOISE_SELECTORS).remove();

  const paragraphs: string[] = [];
  const seen = new Set<string>();

  for (const selector of ARTICLE_BODY_SELECTORS) {
    $(selector).each((_, el) => {
      const text = cleanParagraphText($(el).text());
      if (!text || isNoiseParagraph(text)) return;
      for (const part of splitOversizedParagraph(text)) {
        const cleaned = cleanParagraphText(part);
        if (!cleaned || isNoiseParagraph(cleaned)) continue;
        if (seen.has(cleaned)) continue;
        seen.add(cleaned);
        paragraphs.push(cleaned);
      }
    });
    if (paragraphs.length >= 3) break;
  }

  // Fallback: any substantial <p> in article/main
  if (paragraphs.length === 0) {
    $("article p, main p, .article p").each((_, el) => {
      const text = cleanParagraphText($(el).text());
      if (!text || isNoiseParagraph(text)) return;
      for (const part of splitOversizedParagraph(text)) {
        const cleaned = cleanParagraphText(part);
        if (!cleaned || isNoiseParagraph(cleaned) || seen.has(cleaned))
          continue;
        seen.add(cleaned);
        paragraphs.push(cleaned);
      }
    });
  }

  return paragraphs;
}

function bodyPassesGate(paragraphs: string[]): boolean {
  if (paragraphs.length >= 3) return true;
  const chars = paragraphs.join(" ").length;
  return chars >= 900 && paragraphs.length >= 1;
}

/**
 * Parse and validate an article detail page. Returns failure reason when gate fails.
 */
export function parseAndValidateArticle(input: {
  html: string;
  pageUrl: string;
}): ArticleParseResult {
  const $ = cheerio.load(input.html);

  const canonicalRaw =
    firstAttr($, ["link[rel='canonical']"]) ??
    metaContent($, ["meta[property='og:url']"]);
  const canonicalUrl = canonicalRaw
    ? normalizeArticleUrl(canonicalRaw, input.pageUrl)
    : normalizeArticleUrl(input.pageUrl, input.pageUrl);

  const originalUrl =
    normalizeArticleUrl(input.pageUrl, input.pageUrl) ?? input.pageUrl;

  const title =
    metaContent($, [
      "meta[property='og:title']",
      "meta[name='twitter:title']",
    ]) ??
    ($("h1").first().text().trim() || $("title").first().text().trim());

  if (!title || isGenericTitle(title)) {
    return { ok: false, reason: "generic_or_missing_title" };
  }

  const imageRaw =
    metaContent($, [
      "meta[property='og:image']",
      "meta[name='twitter:image']",
      "meta[property='og:image:secure_url']",
    ]) ??
    $("article img[src]").first().attr("src") ??
    $("main img[src]").first().attr("src") ??
    null;

  if (!imageRaw) {
    return { ok: false, reason: "missing_image" };
  }

  const imageAbsolute = normalizeArticleUrl(imageRaw, input.pageUrl);
  // Images may be on CDN hosts — keep absolute even if off-site
  let imageUrl: string;
  try {
    imageUrl = new URL(imageRaw, input.pageUrl).toString();
  } catch {
    return { ok: false, reason: "invalid_image_url" };
  }
  if (imageAbsolute && imageAbsolute.startsWith("http")) {
    // prefer normalized when it is http(s)
    try {
      imageUrl = new URL(imageAbsolute).toString();
    } catch {
      /* keep imageUrl */
    }
  }

  const publishedRaw =
    metaContent($, [
      "meta[property='article:published_time']",
      "meta[name='article:published_time']",
      "meta[name='pubdate']",
      "meta[name='publish-date']",
      "meta[name='date']",
      "meta[property='og:pubdate']",
      "meta[itemprop='datePublished']",
    ]) ??
    $("time[datetime]").first().attr("datetime") ??
    $("time").first().attr("datetime") ??
    null;

  const publishedAt = parsePublishedAt(publishedRaw);
  if (!publishedAt) {
    return { ok: false, reason: "missing_or_invalid_published_date" };
  }

  const paragraphs = extractParagraphs($);
  if (!bodyPassesGate(paragraphs)) {
    return { ok: false, reason: "insufficient_body" };
  }

  const rawText = paragraphs.join("\n\n");

  return {
    ok: true,
    article: {
      originalUrl,
      canonicalUrl,
      title: title.replace(/\s+/g, " ").trim(),
      imageUrl,
      publishedAt,
      rawText,
    },
  };
}
