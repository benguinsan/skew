import * as cheerio from "cheerio";
import {
  isLikelyNavOrFooterLink,
  matchesNonArticlePath,
} from "@/lib/parsing/reject";
import { resolveParserStrategy } from "@/lib/parsing/strategies";
import { hostnameOf, normalizeArticleUrl } from "@/lib/parsing/urls";

export type HomepageExtractResult = {
  candidates: string[];
  rejected: { url: string; reason: string }[];
};

const SKIP_ANCESTOR_SELECTORS = [
  "nav",
  "footer",
  "header",
  "[role='navigation']",
  "[role='contentinfo']",
  ".footer",
  ".navigation",
  "#navigation",
  ".nav",
  ".menu",
  ".site-footer",
  ".site-header",
].join(", ");

function sameSite(candidateUrl: string, listingUrl: string): boolean {
  const a = hostnameOf(candidateUrl);
  const b = hostnameOf(listingUrl);
  if (!a || !b) return false;
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

/**
 * Extract candidate article URLs from homepage HTML (story cards only).
 * Applies non-article reject list and source-specific article URL checks.
 */
export function extractHomepageCandidates(input: {
  html: string;
  listingUrl: string;
  parserStrategy: string | null;
  sourceName?: string;
}): HomepageExtractResult {
  const strategy = resolveParserStrategy({
    parserStrategy: input.parserStrategy,
    listingUrl: input.listingUrl,
    name: input.sourceName,
  });

  const $ = cheerio.load(input.html);
  const rejected: { url: string; reason: string }[] = [];
  const seen = new Set<string>();
  const candidates: string[] = [];

  const collect = (href: string | undefined, linkText: string) => {
    if (!href) return;
    const normalized = normalizeArticleUrl(href, input.listingUrl);
    if (!normalized) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);

    if (!sameSite(normalized, input.listingUrl)) {
      rejected.push({ url: normalized, reason: "off_site" });
      return;
    }

    const listingNormalized = normalizeArticleUrl(
      input.listingUrl,
      input.listingUrl,
    );
    if (listingNormalized && normalized === listingNormalized) {
      rejected.push({ url: normalized, reason: "homepage_url" });
      return;
    }

    if (isLikelyNavOrFooterLink(normalized, linkText)) {
      rejected.push({ url: normalized, reason: "nav_or_footer" });
      return;
    }

    if (matchesNonArticlePath(normalized)) {
      rejected.push({ url: normalized, reason: "non_article_path" });
      return;
    }

    if (!strategy.isArticleUrl(normalized)) {
      rejected.push({ url: normalized, reason: "failed_article_url_check" });
      return;
    }

    candidates.push(normalized);
  };

  // Prefer strategy card selectors
  for (const selector of strategy.cardLinkSelectors) {
    $(selector).each((_, el) => {
      const $el = $(el);
      if ($el.closest(SKIP_ANCESTOR_SELECTORS).length > 0) {
        return;
      }
      const href =
        $el.attr("href") ??
        $el.find("a[href]").first().attr("href") ??
        ($el.is("a") ? $el.attr("href") : undefined);
      const text = $el.text();
      collect(href, text);
    });
  }

  // If strategy selectors found nothing useful, scan main content anchors
  if (candidates.length === 0) {
    $("main a[href], [role='main'] a[href], article a[href]").each((_, el) => {
      const $el = $(el);
      if ($el.closest(SKIP_ANCESTOR_SELECTORS).length > 0) {
        return;
      }
      collect($el.attr("href"), $el.text());
    });
  }

  return { candidates, rejected };
}
