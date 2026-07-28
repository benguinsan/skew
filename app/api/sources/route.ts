import { getActiveSources } from "@/lib/supabase/queries/sources";

export async function GET(): Promise<Response> {
  try {
    const sources = await getActiveSources();
    return Response.json({
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        listing_url: s.listing_url,
        parser_strategy: s.parser_strategy,
        logo_url: s.logo_url,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load sources";
    console.error("[api/sources]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
