"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * Shape returned to client forms (consumed via `useActionState`).
 * `error` surfaces an inline validation/auth failure.
 * `message` surfaces a non-error notice (e.g. "check your email").
 */
export type AuthState = {
  error?: string;
  message?: string;
};

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const signUpSchema = z.object({
  full_name: z.string().trim().min(1, "Your name is required."),
  agency_name: z.string().trim().min(1, "Agency name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

/** Pull the first zod issue as a flat error message. */
function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

export async function signIn(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: firstError(parsed.error) };
  }

  const supabase = await createClient();

  // Demo mode: no Supabase configured — let the demo flow through.
  if (!supabase) {
    redirect("/dashboard");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signUp(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    agency_name: formData.get("agency_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: firstError(parsed.error) };
  }

  const supabase = await createClient();

  // Demo mode: no Supabase configured.
  if (!supabase) {
    redirect("/dashboard");
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        agency_name: parsed.data.agency_name,
      },
      emailRedirectTo: `${env.appUrl}/dashboard`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // When email confirmation is disabled Supabase returns a session immediately.
  if (data.session) {
    redirect("/dashboard");
  }

  return { message: "Check your email to confirm your account." };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login");
}
