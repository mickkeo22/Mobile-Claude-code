"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Browser-side Supabase client. Safe to call in client components.
 * Returns null when Supabase is not configured (demo mode) so callers can
 * gracefully fall back instead of throwing.
 */
export function createClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
