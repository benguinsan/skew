import { z } from "zod";
import { AdminAuthError, assertAdminSecret } from "@/lib/api/admin-secret";
import { runAnalyzePending } from "@/lib/pipeline/analyze";
import { MAX_ANALYSIS_BATCH_SIZE } from "@/lib/ai/env";

export const maxDuration = 300;

const analyzeBodySchema = z
  .object({
    articleIds: z.array(z.string().uuid()).optional(),
    limit: z.number().int().min(1).optional(),
    batchSize: z.number().int().min(1).max(MAX_ANALYSIS_BATCH_SIZE).optional(),
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

  const parsed = analyzeBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const summary = await runAnalyzePending({
      articleIds: parsed.data.articleIds,
      limit: parsed.data.limit,
      batchSize: parsed.data.batchSize,
    });

    const status = summary.status === "failed" ? 500 : 200;
    return Response.json(summary, { status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analyze pipeline failed";
    console.error("[api/analyze] fatal:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
