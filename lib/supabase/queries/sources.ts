import { createServiceClient } from "@/lib/supabase/service";
import type { Source } from "@/lib/supabase/types";
import { throwOnError } from "@/lib/supabase/queries/helpers";

export async function getActiveSources(): Promise<Source[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  throwOnError(error, "getActiveSources");
  return data ?? [];
}

export async function getSourceById(id: string): Promise<Source | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  throwOnError(error, "getSourceById");
  return data;
}

export async function getSourcesByIds(ids: string[]): Promise<Source[]> {
  if (ids.length === 0) {
    return [];
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .in("id", ids);

  throwOnError(error, "getSourcesByIds");
  return data ?? [];
}
