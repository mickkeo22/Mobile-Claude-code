import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import { env } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Server-side Supabase client bound to the request's cookies.
 * Returns null when Supabase is not configured (demo mode).
 */
export async function createClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore; middleware refreshes.
        }
      },
    },
  });
}

/**
 * Privileged client using the service-role key. Server-only.
 * Bypasses RLS — use exclusively in webhooks, cron, and trusted automations.
 */
export function createAdminClient() {
  if (!env.supabaseUrl || !env.supabaseServiceKey) return null;
  return createServerClient<Database>(env.supabaseUrl, env.supabaseServiceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
