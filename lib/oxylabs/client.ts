import "server-only";

import { getOxylabsPassword, getOxylabsUsername } from "@/lib/oxylabs/env";

const OXYLABS_REALTIME_URL = "https://realtime.oxylabs.io/v1/queries";
/** Rendered Realtime requests can take up to ~180s. */
const OXYLABS_TIMEOUT_MS = 180_000;

export type ScrapeHtmlResult = {
  html: string;
  statusCode: number;
  url: string;
};

export class OxylabsError extends Error {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "OxylabsError";
    this.statusCode = statusCode;
  }
}

type OxylabsResult = {
  content?: string;
  status_code?: number;
  url?: string;
};

type OxylabsResponse = {
  results?: OxylabsResult[];
};

/**
 * Fetch HTML for a URL via Oxylabs Web Scraper API (Realtime, universal + render).
 * Never logs credentials or full HTML.
 */
export async function scrapeHtml(url: string): Promise<ScrapeHtmlResult> {
  const username = getOxylabsUsername();
  const password = getOxylabsPassword();
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OXYLABS_TIMEOUT_MS);

  try {
    const response = await fetch(OXYLABS_REALTIME_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "universal",
        url,
        render: "html",
      }),
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw new OxylabsError(
        `Oxylabs authentication/access failed (${response.status})`,
        response.status,
      );
    }
    if (response.status === 429) {
      throw new OxylabsError("Oxylabs rate limit exceeded (429)", 429);
    }
    if (!response.ok) {
      throw new OxylabsError(
        `Oxylabs request failed (${response.status}) for ${url}`,
        response.status,
      );
    }

    const data = (await response.json()) as OxylabsResponse;
    const result = data.results?.[0];
    if (!result) {
      throw new OxylabsError(`Oxylabs returned no results for ${url}`);
    }

    const statusCode = result.status_code ?? 0;
    const html = typeof result.content === "string" ? result.content : "";
    const resultUrl = result.url ?? url;

    console.log(
      `[oxylabs] scraped ${url} status=${statusCode} htmlBytes=${html.length}`,
    );

    if (statusCode !== 200) {
      throw new OxylabsError(
        `Oxylabs page status ${statusCode} for ${url}`,
        statusCode,
      );
    }
    if (!html) {
      throw new OxylabsError(`Oxylabs returned empty HTML for ${url}`);
    }

    return { html, statusCode, url: resultUrl };
  } catch (error) {
    if (error instanceof OxylabsError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new OxylabsError(`Oxylabs request timed out for ${url}`);
    }
    throw new OxylabsError(
      `Oxylabs request error for ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
