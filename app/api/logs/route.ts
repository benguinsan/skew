import { AdminAuthError, assertAdminSecret } from "@/lib/api/admin-secret";
import { listLogs } from "@/lib/supabase/queries/logs";

export async function GET(request: Request): Promise<Response> {
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

  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  let limit = 100;
  if (rawLimit != null) {
    const parsed = Number.parseInt(rawLimit, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return Response.json(
        { error: "limit must be a positive integer" },
        { status: 400 },
      );
    }
    limit = Math.min(500, parsed);
  }

  try {
    const logs = await listLogs(limit);
    return Response.json({ logs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load logs";
    console.error("[api/logs]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
