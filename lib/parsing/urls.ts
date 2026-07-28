const TRACKING_PARAM_PREFIXES = ["utm_", "fbclid", "gclid", "mc_", "ref"];

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ncid",
  "ref",
  "source",
]);

export function resolveAbsoluteUrl(
  href: string,
  baseUrl: string,
): string | null {
  const trimmed = href.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return null;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

export function stripTrackingParams(urlString: string): string {
  try {
    const url = new URL(urlString);
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (
        TRACKING_PARAMS.has(lower) ||
        TRACKING_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix))
      ) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return urlString;
  }
}

/** Absolute URL, tracking stripped, hash removed, trailing slash normalized (except root). */
export function normalizeArticleUrl(
  href: string,
  baseUrl: string,
): string | null {
  const absolute = resolveAbsoluteUrl(href, baseUrl);
  if (!absolute) {
    return null;
  }

  try {
    const url = new URL(stripTrackingParams(absolute));
    url.hash = "";
    // Drop default ports
    if (
      (url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443")
    ) {
      url.port = "";
    }
    // Prefer https when both look like the same host later; keep as-is from page
    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    url.pathname = path;
    return url.toString();
  } catch {
    return null;
  }
}

export function hostnameOf(urlString: string): string | null {
  try {
    return new URL(urlString).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function pathOf(urlString: string): string {
  try {
    return new URL(urlString).pathname;
  } catch {
    return "";
  }
}
