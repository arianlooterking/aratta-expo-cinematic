"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/platform/database.types";
import { getSupabaseConfig } from "./config";

let client: SupabaseClient<Database> | null = null;

/** Shared browser client (one realtime connection per tab). */
export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (client) return client;
  const config = getSupabaseConfig();
  if (!config) return null;
  client = createBrowserClient<Database>(config.url, config.publishableKey);
  return client;
}
