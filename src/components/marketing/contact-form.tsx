"use client";

import * as React from "react";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button, Input, Textarea, Label } from "@/components/ui";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      clientId: "marketing",
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
      source: "marketing-site",
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(
        "Something went wrong sending your message. Please email us at hello@aether.ai and we'll jump on it.",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm animate-fade-in">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight">
          You&apos;re on the list — thank you!
        </h3>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          A member of our team will reach out within one business day to schedule
          your personalized demo. Keep an eye on your inbox.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm font-medium text-primary hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
    >
      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Jordan Rivera" required autoComplete="name" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@business.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(555) 123-4567"
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="message">What would you like to automate?</Label>
          <Textarea
            id="message"
            name="message"
            rows={4}
            placeholder="We're a 3-chair dental practice and miss a lot of after-hours calls. We'd love an AI that books appointments around the clock."
          />
        </div>

        {status === "error" && error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={status === "submitting"}
          className="w-full"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Book my demo
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By submitting, you agree to be contacted about Aether. We never share
          your information. Unsubscribe anytime.
        </p>
      </div>
    </form>
  );
}
