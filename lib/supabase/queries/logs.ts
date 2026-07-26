import { createServiceClient } from "@/lib/supabase/service";
import type {
  Json,
  LogLevel,
  LogRow,
  TablesInsert,
} from "@/lib/supabase/types";
import { requireData, throwOnError } from "@/lib/supabase/queries/helpers";

export async function insertLog(input: {
  level: LogLevel;
  message: string;
  context?: Json;
}): Promise<LogRow> {
  const row: TablesInsert<"logs"> = {
    level: input.level,
    message: input.message,
    context: input.context ?? {},
  };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("logs")
    .insert(row)
    .select("*")
    .single();

  throwOnError(error, "insertLog");
  return requireData(data, "insertLog");
}

export async function listLogs(limit = 100): Promise<LogRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  throwOnError(error, "listLogs");
  return data ?? [];
}
