/**
 * Server-only Supabase client using the service role key.
 * Never import this module from Client Components or browser code.
 */
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { BiaslySupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export function createServiceClient(): BiaslySupabaseClient {
  return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
