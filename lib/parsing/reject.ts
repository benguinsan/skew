import { pathOf } from "@/lib/parsing/urls";

/** Path segments / substrings that indicate non-article pages (AGENTS §9). */
const NON_ARTICLE_PATH_PATTERNS: RegExp[] = [
  /\/search(?:\/|$|\?)/i,
  /\/tag(?:s)?(?:\/|$)/i,
  /\/topic(?:s)?(?:\/|$)/i,
  /\/author(?:s)?(?:\/|$)/i,
  /\/category(?:\/|$)/i,
  /\/newsletter(?:s)?(?:\/|$)/i,
  /\/subscribe(?:\/|$)/i,
  /\/subscription(?:s)?(?:\/|$)/i,
  /\/live(?:\/|$|-)/i,
  /\/video(?:s)?(?:\/|$)/i,
  /\/podcast(?:s)?(?:\/|$)/i,
  /\/show(?:s)?(?:\/|$)/i,
  /\/program(?:me)?s?(?:\/|$)/i,
  /\/game(?:s)?(?:\/|$)/i,
  /\/shop(?:ping)?(?:\/|$)/i,
  /\/product(?:s)?(?:\/|$)/i,
  /\/review(?:s)?(?:\/|$)/i,
  /\/about(?:\/|$)/i,
  /\/contact(?:\/|$)/i,
  /\/help(?:\/|$)/i,
  /\/support(?:\/|$)/i,
  /\/careers?(?:\/|$)/i,
  /\/privacy(?:\/|$)/i,
  /\/terms(?:\/|$)/i,
  /\/cookie(?:s)?(?:\/|$)/i,
  /\/login(?:\/|$)/i,
  /\/signin(?:\/|$)/i,
  /\/signup(?:\/|$)/i,
  /\/account(?:\/|$)/i,
  /\/watch(?:\/|$)/i,
  /\/audio(?:\/|$)/i,
  /\/gallery(?:\/|$)/i,
  /\/photos?(?:\/|$)/i,
  /\/weather(?:\/|$)/i,
  /\/sport(?:s)?(?:\/|$)/i,
  /\/video\/live/i,
];

const GENERIC_TITLES = new Set(
  [
    "home",
    "homepage",
    "news",
    "latest news",
    "breaking news",
    "world news",
    "us news",
    "politics",
    "business",
    "sports",
    "sport",
    "entertainment",
    "video",
    "videos",
    "live",
    "live updates",
    "podcasts",
    "shows",
    "watch",
    "subscribe",
    "newsletter",
    "sign in",
    "log in",
    "about us",
    "contact us",
    "privacy policy",
    "terms of use",
    "cookies",
    "404",
    "page not found",
    "error",
  ].map((t) => t.toLowerCase()),
);

export function matchesNonArticlePath(url: string): boolean {
  const path = pathOf(url);
  if (!path || path === "/") {
    return true;
  }
  return NON_ARTICLE_PATH_PATTERNS.some((re) => re.test(path));
}

export function isGenericTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized || normalized.length < 12) {
    return true;
  }
  if (GENERIC_TITLES.has(normalized)) {
    return true;
  }
  // Titles that are just a section name + site brand
  const withoutBrand = normalized.replace(/\s*[|\-–—:]\s*.+$/, "").trim();
  return GENERIC_TITLES.has(withoutBrand);
}

export function isLikelyNavOrFooterLink(
  href: string,
  linkText: string,
): boolean {
  const text = linkText.trim().toLowerCase();
  if (
    text === "home" ||
    text === "menu" ||
    text === "skip to content" ||
    text === "sign in" ||
    text === "log in" ||
    text === "subscribe" ||
    text === "newsletter" ||
    text === "watch" ||
    text === "listen" ||
    text === "more" ||
    text === "see all"
  ) {
    return true;
  }
  return matchesNonArticlePath(href);
}
