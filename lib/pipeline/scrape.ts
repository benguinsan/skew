import "server-only";

import { scrapeHtml } from "@/lib/oxylabs/client";
import { parseAndValidateArticle } from "@/lib/parsing/article";
import { extractHomepageCandidates } from "@/lib/parsing/homepage";
import {
  findExistingOriginalUrls,
  insertArticle,
} from "@/lib/supabase/queries/articles";
import { insertLog } from "@/lib/supabase/queries/logs";
import { getActiveSources } from "@/lib/supabase/queries/sources";
import type { Source } from "@/lib/supabase/types";
import {
  DEFAULT_PER_SOURCE_LIMIT,
  MAX_PER_SOURCE_LIMIT,
  type ScrapePipelineOptions,
  type ScrapeRunError,
  type ScrapeRunSummary,
} from "@/lib/pipeline/types";

function bumpReason(map: Record<string, number>, reason: string): void {
  map[reason] = (map[reason] ?? 0) + 1;
}

function clampPerSourceLimit(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) {
    return DEFAULT_PER_SOURCE_LIMIT;
  }
  return Math.min(MAX_PER_SOURCE_LIMIT, Math.max(1, Math.floor(value)));
}

async function resolveSources(
  options: ScrapePipelineOptions,
): Promise<Source[]> {
  const active = await getActiveSources();
  if (active.length === 0) {
    return [];
  }

  if (options.sourceIds && options.sourceIds.length > 0) {
    const idSet = new Set(options.sourceIds);
    const selected = active.filter((s) => idSet.has(s.id));
    // Preserve caller order when possible
    const byId = new Map(selected.map((s) => [s.id, s]));
    return options.sourceIds
      .map((id) => byId.get(id))
      .filter((s): s is Source => s != null);
  }

  if (options.sourceNames && options.sourceNames.length > 0) {
    const names = new Set(
      options.sourceNames.map((n) => n.trim().toLowerCase()),
    );
    return active.filter((s) => names.has(s.name.trim().toLowerCase()));
  }

  return active;
}

function emptySummary(startedAt: number): ScrapeRunSummary {
  return {
    status: "completed",
    sourcesChecked: 0,
    candidatesFound: 0,
    candidatesRejected: 0,
    duplicatesSkipped: 0,
    detailPagesScraped: 0,
    articlesInserted: 0,
    articlesRejected: 0,
    articlesFailed: 0,
    totalDurationMs: Date.now() - startedAt,
    rejectionReasons: {},
  };
}

/**
 * Canonical scrape-to-insert pipeline (AGENTS §9 / §16).
 * Homepage HTML is fetched live via Oxylabs for each selected active source.
 */
export async function runScrapeToInsert(
  options: ScrapePipelineOptions = {},
): Promise<ScrapeRunSummary> {
  const startedAt = Date.now();
  const perSourceLimit = clampPerSourceLimit(options.perSourceLimit);
  const summary = emptySummary(startedAt);
  const errors: ScrapeRunError[] = [];

  console.log("[scrape] scrape started");

  let sources: Source[];
  try {
    sources = await resolveSources(options);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load sources";
    console.error("[scrape] failed to load sources:", message);
    await insertLog({
      level: "error",
      message: "scrape failed: could not load sources",
      context: { error: message },
    }).catch(() => undefined);

    return {
      ...summary,
      status: "failed",
      totalDurationMs: Date.now() - startedAt,
      errors: [{ message }],
    };
  }

  console.log(
    `[scrape] selected sources (${sources.length}): ${sources.map((s) => s.name).join(", ") || "(none)"}`,
  );
  console.log(`[scrape] perSourceLimit=${perSourceLimit}`);

  await insertLog({
    level: "info",
    message: "scrape started",
    context: {
      sourceNames: sources.map((s) => s.name),
      perSourceLimit,
    },
  }).catch(() => undefined);

  if (sources.length === 0) {
    summary.status = "failed";
    summary.totalDurationMs = Date.now() - startedAt;
    summary.errors = [{ message: "No matching active sources" }];
    console.error("[scrape] no matching active sources");
    await insertLog({
      level: "error",
      message: "scrape failed: no matching active sources",
      context: { ...summary },
    }).catch(() => undefined);
    return summary;
  }

  for (const source of sources) {
    summary.sourcesChecked += 1;
    console.log(
      `[scrape] source start: ${source.name} (${source.listing_url})`,
    );

    try {
      const homepage = await scrapeHtml(source.listing_url);
      console.log(
        `[scrape] homepage fetched: ${source.name} bytes=${homepage.html.length}`,
      );

      const extracted = extractHomepageCandidates({
        html: homepage.html,
        listingUrl: source.listing_url,
        parserStrategy: source.parser_strategy,
        sourceName: source.name,
      });

      summary.candidatesFound += extracted.candidates.length;
      summary.candidatesRejected += extracted.rejected.length;
      for (const r of extracted.rejected) {
        bumpReason(summary.rejectionReasons, r.reason);
      }

      console.log(
        `[scrape] candidate links found: ${source.name} count=${extracted.candidates.length} rejected=${extracted.rejected.length}`,
      );

      const existing = await findExistingOriginalUrls(extracted.candidates);
      const toScrape = extracted.candidates.filter((url) => {
        if (existing.has(url)) {
          summary.duplicatesSkipped += 1;
          return false;
        }
        return true;
      });

      console.log(
        `[scrape] duplicates skipped: ${source.name} skipped=${extracted.candidates.length - toScrape.length} remaining=${toScrape.length}`,
      );

      let insertedForSource = 0;

      for (const articleUrl of toScrape) {
        if (insertedForSource >= perSourceLimit) {
          break;
        }

        try {
          const detail = await scrapeHtml(articleUrl);
          summary.detailPagesScraped += 1;
          console.log(
            `[scrape] detail scraped: ${articleUrl} bytes=${detail.html.length}`,
          );

          const parsed = parseAndValidateArticle({
            html: detail.html,
            pageUrl: articleUrl,
          });

          if (!parsed.ok) {
            summary.articlesRejected += 1;
            bumpReason(summary.rejectionReasons, parsed.reason);
            console.log(
              `[scrape] article rejected after validation: ${articleUrl} reason=${parsed.reason}`,
            );
            continue;
          }

          try {
            await insertArticle({
              source_id: source.id,
              original_url: parsed.article.originalUrl,
              canonical_url: parsed.article.canonicalUrl,
              title: parsed.article.title,
              image_url: parsed.article.imageUrl,
              published_at: parsed.article.publishedAt,
              raw_text: parsed.article.rawText,
            });
            insertedForSource += 1;
            summary.articlesInserted += 1;
            console.log(
              `[scrape] article inserted: ${parsed.article.title.slice(0, 80)}`,
            );
          } catch (insertError) {
            const msg =
              insertError instanceof Error
                ? insertError.message
                : String(insertError);
            // Unique violation → treat as duplicate skip
            if (
              msg.toLowerCase().includes("duplicate") ||
              msg.includes("23505") ||
              msg.toLowerCase().includes("unique")
            ) {
              summary.duplicatesSkipped += 1;
              console.log(
                `[scrape] duplicate skipped on insert: ${parsed.article.originalUrl}`,
              );
            } else {
              summary.articlesFailed += 1;
              bumpReason(summary.rejectionReasons, "insert_failed");
              console.error(
                `[scrape] article insert failed: ${articleUrl} ${msg}`,
              );
            }
          }
        } catch (detailError) {
          summary.articlesFailed += 1;
          const message =
            detailError instanceof Error
              ? detailError.message
              : String(detailError);
          bumpReason(summary.rejectionReasons, "detail_scrape_failed");
          console.error(
            `[scrape] detail scrape/parse failed: ${articleUrl} ${message}`,
          );
        }
      }

      console.log(
        `[scrape] source done: ${source.name} inserted=${insertedForSource}`,
      );
    } catch (sourceError) {
      const message =
        sourceError instanceof Error
          ? sourceError.message
          : String(sourceError);
      errors.push({ source: source.name, message });
      bumpReason(summary.rejectionReasons, "source_error");
      console.error(`[scrape] source-level error: ${source.name} ${message}`);
    }
  }

  summary.totalDurationMs = Date.now() - startedAt;
  if (errors.length > 0) {
    summary.errors = errors;
  }
  // Run is "failed" only when every source errored and nothing was inserted
  if (
    summary.articlesInserted === 0 &&
    errors.length >= sources.length &&
    sources.length > 0
  ) {
    summary.status = "failed";
  } else {
    summary.status = "completed";
  }

  console.log("[scrape] scrape completed", summary);

  await insertLog({
    level: summary.status === "failed" ? "error" : "info",
    message: summary.status === "failed" ? "scrape failed" : "scrape completed",
    context: { ...summary },
  }).catch(() => undefined);

  return summary;
}
