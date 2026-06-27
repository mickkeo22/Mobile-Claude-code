"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { signIn, type AuthState } from "@/lib/auth/actions";

const initialState: AuthState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing in…
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  );
}

export function LoginForm({
  demoMode,
  next,
  plan,
}: {
  demoMode: boolean;
  next?: string;
  plan?: string;
}) {
  const [state, formAction] = useActionState(signIn, initialState);

  const signupHref = (() => {
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    if (plan) params.set("plan", plan);
    const qs = params.toString();
    return qs ? `/signup?${qs}` : "/signup";
  })();

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your Aether account to continue.
        </p>
      </div>

      {demoMode && (
        <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Demo mode: sign in with anything.
        </div>
      )}

      <form action={formAction} className="space-y-4" noValidate>
        {/* Preserve passthrough params for downstream flows. */}
        {next && <input type="hidden" name="next" value={next} />}
        {plan && <input type="hidden" name="plan" value={plan} />}

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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
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

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href={signupHref}
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
