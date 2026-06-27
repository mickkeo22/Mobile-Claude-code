"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, Input, Label, Badge } from "@/components/ui";
import { signUp, type AuthState } from "@/lib/auth/actions";

const initialState: AuthState = {};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating account…
        </>
      ) : (
        "Create account"
      )}
    </Button>
  );
}

export function SignupForm({
  demoMode,
  next,
  plan,
}: {
  demoMode: boolean;
  next?: string;
  plan?: string;
}) {
  const [state, formAction] = useActionState(signUp, initialState);

  const planLabel = plan ? (PLAN_LABELS[plan] ?? plan) : undefined;

  const loginHref = (() => {
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    if (plan) params.set("plan", plan);
    const qs = params.toString();
    return qs ? `/login?${qs}` : "/login";
  })();

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start running your agency on autopilot.
        </p>
      </div>

      {planLabel && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-accent/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Selected plan:</span>
          <Badge tone="default">{planLabel}</Badge>
        </div>
      )}

      {demoMode && (
        <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Demo mode: sign up with anything.
        </div>
      )}

      {state.message ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-border bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      ) : (
        <form action={formAction} className="space-y-4" noValidate>
          {next && <input type="hidden" name="next" value={next} />}
          {plan && <input type="hidden" name="plan" value={plan} />}

          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agency_name">Agency name</Label>
            <Input
              id="agency_name"
              name="agency_name"
              type="text"
              autoComplete="organization"
              placeholder="Acme Agency"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@agency.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          {state.error && (
            <p
              role="alert"
              className="flex items-start gap-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </p>
          )}

          <SubmitButton />
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
