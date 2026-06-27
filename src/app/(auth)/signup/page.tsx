import type { Metadata } from "next";
import { features } from "@/lib/env";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; plan?: string }>;
}) {
  const { next, plan } = await searchParams;

  return (
    <SignupForm demoMode={!features.supabase} next={next} plan={plan} />
  );
}
