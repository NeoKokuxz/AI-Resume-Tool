import type { SupabaseClient } from "@supabase/supabase-js";

export interface HandlerContext {
  payload: Record<string, unknown>;
  userId: string;
  supabase: SupabaseClient;
}

export type Handler = (ctx: HandlerContext) => Promise<void>;
