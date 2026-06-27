import type { Metadata } from "next";
import { features } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; plan?: string }>;
}) {
  const { next, plan } = await searchParams;

  return (
    <LoginForm demoMode={!features.supabase} next={next} plan={plan} />
  );
}
