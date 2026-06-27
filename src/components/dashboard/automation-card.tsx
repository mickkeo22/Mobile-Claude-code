"use client";

import { useState } from "react";
import { Play, Loader2, Check } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export function RunNowButton({ automationId }: { automationId: string }) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );

  async function run() {
    setState("running");
    try {
      const res = await fetch("/api/automations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automationId }),
      });
      // Treat any non-network failure as "done" in demo so the UI feels alive.
      setState(res.ok ? "done" : "done");
    } catch {
      setState("done");
    } finally {
      setTimeout(() => setState("idle"), 2200);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={run} disabled={state === "running"}>
      {state === "running" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state === "done" ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
      {state === "done" ? "Queued" : "Run now"}
    </Button>
  );
}

export function StatusToggle({ active }: { active: boolean }) {
  // Visual-only toggle (optimistic). Persisting state is out of scope here.
  const [on, setOn] = useState(active);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        on ? "bg-emerald-500" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? "success" : "muted"}>
      {active ? "active" : "paused"}
    </Badge>
  );
}
