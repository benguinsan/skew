import { z } from "zod";
import { AdminAuthError, assertAdminSecret } from "@/lib/api/admin-secret";
import { runScrapeToInsert } from "@/lib/pipeline/scrape";
import {
  DEFAULT_PER_SOURCE_LIMIT,
  MAX_PER_SOURCE_LIMIT,
} from "@/lib/pipeline/types";

export const maxDuration = 300;

const scrapeBodySchema = z
  .object({
    sourceIds: z.array(z.string().uuid()).optional(),
    sourceNames: z.array(z.string().min(1)).optional(),
    perSourceLimit: z
      .number()
      .int()
      .min(1)
      .max(MAX_PER_SOURCE_LIMIT)
      .optional()
      .default(DEFAULT_PER_SOURCE_LIMIT),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  try {
    assertAdminSecret(request);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const text = await request.text();
      body = text.trim() ? JSON.parse(text) : {};
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  const parsed = scrapeBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const summary = await runScrapeToInsert({
      sourceIds: parsed.data.sourceIds,
      sourceNames: parsed.data.sourceNames,
      perSourceLimit: parsed.data.perSourceLimit,
    });

    const status = summary.status === "failed" ? 500 : 200;
    return Response.json(summary, { status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scrape pipeline failed";
    console.error("[api/scrape] fatal:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
