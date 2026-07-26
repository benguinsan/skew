import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export type BiaslySupabaseClient = SupabaseClient<Database>;

/** Browser-safe anon client. Never pass the service role key here. */
export function createAnonClient(): BiaslySupabaseClient {
  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
