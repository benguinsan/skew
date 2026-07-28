import { hostnameOf, pathOf } from "@/lib/parsing/urls";
import { matchesNonArticlePath } from "@/lib/parsing/reject";

export type ParserStrategyKey = "bbc" | "cnn" | "fox" | "guardian";

export type SourceParserStrategy = {
  key: ParserStrategyKey;
  /** Cheerio selectors that tend to contain story cards (tried in order). */
  cardLinkSelectors: string[];
  isArticleUrl: (url: string) => boolean;
};

function pathSegments(url: string): string[] {
  return pathOf(url).split("/").filter(Boolean);
}

const bbcStrategy: SourceParserStrategy = {
  key: "bbc",
  cardLinkSelectors: [
    "[data-testid='card-headline'] a",
    "a[data-testid='internal-link']",
    "article a[href]",
    ".gs-c-promo-heading",
    "a[href*='/news/articles/']",
    "a[href*='/news/']",
  ],
  isArticleUrl(url) {
    if (matchesNonArticlePath(url)) return false;
    const host = hostnameOf(url);
    if (!host || (!host.endsWith("bbc.com") && !host.endsWith("bbc.co.uk"))) {
      return false;
    }
    const path = pathOf(url);
    if (path === "/news" || path === "/news/") return false;
    // Modern BBC article IDs
    if (/\/news\/articles\/[a-z0-9]+/i.test(path)) return true;
    // Classic: /news/world-...-12345678 or /news/uk-...-12345678
    if (/\/news\/[a-z0-9-]+-\d{6,}/i.test(path)) return true;
    return false;
  },
};

const cnnStrategy: SourceParserStrategy = {
  key: "cnn",
  cardLinkSelectors: [
    ".container__link",
    ".card a[href]",
    "article a[href]",
    "a[href*='/202']",
    "a.container__link--type-article",
  ],
  isArticleUrl(url) {
    if (matchesNonArticlePath(url)) return false;
    const host = hostnameOf(url);
    if (!host || (!host.endsWith("cnn.com") && !host.endsWith("cnn.it"))) {
      return false;
    }
    const path = pathOf(url);
    const segments = pathSegments(url);
    // Date-based: /2024/07/28/politics/slug/index.html
    if (/\/\d{4}\/\d{2}\/\d{2}\//.test(path)) {
      return segments.length >= 5;
    }
    // /politics/slug-name/index.html style without forcing date
    if (
      segments.length >= 2 &&
      /\.html?$/i.test(path) &&
      !/\/index\.html?$/i.test(path.split("/").slice(0, -1).join("/"))
    ) {
      const last = segments[segments.length - 1] ?? "";
      return last.includes("-") || last.length > 20;
    }
    // Section index like /politics or /world → reject
    if (segments.length <= 1) return false;
    // Require a reasonably long final slug
    const slug = segments[segments.length - 1] ?? "";
    if (slug === "index.html" || slug === "index.htm") {
      return segments.length >= 5;
    }
    return slug.includes("-") && slug.length >= 12 && segments.length >= 2;
  },
};

const foxStrategy: SourceParserStrategy = {
  key: "fox",
  cardLinkSelectors: [
    "article a[href]",
    ".article a[href]",
    ".title a[href]",
    "h2 a[href]",
    "h3 a[href]",
    "a[href$='.html']",
  ],
  isArticleUrl(url) {
    if (matchesNonArticlePath(url)) return false;
    const host = hostnameOf(url);
    if (!host || !host.endsWith("foxnews.com")) return false;
    const path = pathOf(url);
    const lower = path.toLowerCase();
    if (
      lower.includes("/shows/") ||
      lower.includes("/category/") ||
      lower.includes("/person/") ||
      lower.includes("/transcript/") ||
      lower.includes("/sports/") ||
      (lower.includes("/lifestyle/") && pathSegments(url).length < 3)
    ) {
      return false;
    }
    // Prefer .html article pages with multi-segment paths
    if (/\.html?$/i.test(path)) {
      return pathSegments(url).length >= 2;
    }
    // Some fox stories omit .html but have long slugs
    const segments = pathSegments(url);
    if (segments.length >= 2) {
      const slug = segments[segments.length - 1] ?? "";
      return slug.includes("-") && slug.length >= 16;
    }
    return false;
  },
};

const guardianStrategy: SourceParserStrategy = {
  key: "guardian",
  cardLinkSelectors: [
    "a[data-link-name*='article']",
    ".fc-item__link",
    "a.u-faux-block-link__overlay",
    "h3 a[href]",
    "h2 a[href]",
    "a[href*='/20']",
  ],
  isArticleUrl(url) {
    if (matchesNonArticlePath(url)) return false;
    const host = hostnameOf(url);
    if (!host || !host.includes("theguardian.com")) return false;
    const path = pathOf(url);
    // Reject short section paths like /us/environment, /thefilter-us
    const segments = pathSegments(url);
    if (segments.length < 3) return false;
    if (
      path.includes("/thefilter") ||
      path.endsWith("/all") ||
      /\/(us|uk|au|europe|world|environment|politics|business|sport|culture|lifeandstyle|commentisfree|media|technology|science|football)\/?$/i.test(
        path,
      )
    ) {
      return false;
    }
    // Guardian articles usually have a date segment or long final slug
    if (/\/\d{4}\/[a-z]{3}\/\d{2}\//i.test(path)) return true;
    const slug = segments[segments.length - 1] ?? "";
    return slug.includes("-") && slug.length >= 20;
  },
};

const STRATEGIES: Record<ParserStrategyKey, SourceParserStrategy> = {
  bbc: bbcStrategy,
  cnn: cnnStrategy,
  fox: foxStrategy,
  guardian: guardianStrategy,
};

export function resolveParserStrategy(input: {
  parserStrategy: string | null;
  listingUrl: string;
  name?: string;
}): SourceParserStrategy {
  const key = (input.parserStrategy ?? "").toLowerCase().trim();
  if (key in STRATEGIES) {
    return STRATEGIES[key as ParserStrategyKey];
  }

  const host = hostnameOf(input.listingUrl) ?? "";
  if (host.includes("bbc.")) return bbcStrategy;
  if (host.includes("cnn.")) return cnnStrategy;
  if (host.includes("foxnews.")) return foxStrategy;
  if (host.includes("theguardian.")) return guardianStrategy;

  const name = (input.name ?? "").toLowerCase();
  if (name.includes("bbc")) return bbcStrategy;
  if (name.includes("cnn")) return cnnStrategy;
  if (name.includes("fox")) return foxStrategy;
  if (name.includes("guardian")) return guardianStrategy;

  // Generic strict fallback: multi-segment path with long hyphenated slug
  return {
    key: "bbc",
    cardLinkSelectors: [
      "article a[href]",
      "h2 a[href]",
      "h3 a[href]",
      "a[href]",
    ],
    isArticleUrl(url) {
      if (matchesNonArticlePath(url)) return false;
      const segments = pathSegments(url);
      if (segments.length < 2) return false;
      const slug = segments[segments.length - 1] ?? "";
      return slug.includes("-") && slug.length >= 16;
    },
  };
}

export function getStrategyByKey(key: ParserStrategyKey): SourceParserStrategy {
  return STRATEGIES[key];
}
