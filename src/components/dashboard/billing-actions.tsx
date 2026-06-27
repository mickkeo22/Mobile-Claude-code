"use client";

import { useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/types/database";

export function ChoosePlanButton({
  plan,
  current,
  highlighted,
  billingLive,
}: {
  plan: PlanTier;
  current: boolean;
  highlighted?: boolean;
  billingLive: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function choose() {
    if (current) return;
    if (!billingLive) {
      setNotice("Add Stripe keys to enable live checkout.");
      setTimeout(() => setNotice(null), 2600);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error();
    } catch {
      setNotice("Couldn't start checkout. Try again shortly.");
      setTimeout(() => setNotice(null), 2600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={choose}
        disabled={current || loading}
        variant={current ? "outline" : highlighted ? "primary" : "secondary"}
        className="w-full"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {current ? "Current plan" : "Choose plan"}
      </Button>
      {notice && (
        <p className="text-center text-xs text-muted-foreground">{notice}</p>
      )}
    </div>
  );
}

export function ManageBillingButton({ billingLive }: { billingLive: boolean }) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function manage() {
    if (!billingLive) {
      setNotice("Add Stripe keys to open the billing portal.");
      setTimeout(() => setNotice(null), 2600);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error();
    } catch {
      setNotice("Couldn't open the billing portal.");
      setTimeout(() => setNotice(null), 2600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={manage}
        disabled={loading}
        className={cn(buttonClass("outline", "sm"))}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        Manage billing
      </button>
      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
    </div>
  );
}
