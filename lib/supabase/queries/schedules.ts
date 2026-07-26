import { createServiceClient } from "@/lib/supabase/service";
import type {
  OxylabsSchedule,
  OxylabsScheduleRun,
  TablesInsert,
} from "@/lib/supabase/types";
import { requireData, throwOnError } from "@/lib/supabase/queries/helpers";

export async function listSchedules(): Promise<OxylabsSchedule[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("oxylabs_schedules")
    .select("*")
    .order("created_at", { ascending: false });

  throwOnError(error, "listSchedules");
  return data ?? [];
}

export async function upsertSchedule(input: {
  sourceId: string;
  oxylabsScheduleId: string;
  isActive?: boolean;
}): Promise<OxylabsSchedule> {
  const row: TablesInsert<"oxylabs_schedules"> = {
    source_id: input.sourceId,
    oxylabs_schedule_id: input.oxylabsScheduleId,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("oxylabs_schedules")
    .upsert(row, { onConflict: "source_id" })
    .select("*")
    .single();

  throwOnError(error, "upsertSchedule");
  return requireData(data, "upsertSchedule");
}

export async function listUnprocessedDoneRuns(
  limit = 100,
): Promise<OxylabsScheduleRun[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("oxylabs_schedule_runs")
    .select("*")
    .eq("result_status", "done")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  throwOnError(error, "listUnprocessedDoneRuns");
  return data ?? [];
}

export async function insertScheduleRun(
  run: TablesInsert<"oxylabs_schedule_runs">,
): Promise<OxylabsScheduleRun> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("oxylabs_schedule_runs")
    .insert(run)
    .select("*")
    .single();

  throwOnError(error, "insertScheduleRun");
  return requireData(data, "insertScheduleRun");
}

export async function markRunProcessed(
  runId: string,
  processedAt = new Date().toISOString(),
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("oxylabs_schedule_runs")
    .update({ processed_at: processedAt })
    .eq("id", runId);

  throwOnError(error, "markRunProcessed");
}
