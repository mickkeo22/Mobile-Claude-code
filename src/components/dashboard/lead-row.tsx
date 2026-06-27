"use client";

import { useState } from "react";
import { ChevronDown, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/types/database";

const leadStatusTone: Record<LeadStatus, "default" | "success" | "warning" | "danger" | "info" | "muted"> = {
  new: "info",
  qualified: "success",
  contacted: "warning",
  won: "success",
  lost: "muted",
};

function scoreTone(score: number) {
  if (score >= 80) return "success" as const;
  if (score >= 60) return "default" as const;
  return "muted" as const;
}

export function LeadRow({
  lead,
  clientName,
}: {
  lead: Lead;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generateDraft() {
    setDrafting(true);
    // Local heuristic draft — no backend required. Feels instant and useful.
    setTimeout(() => {
      const name = lead.name?.split(" ")[0] ?? "there";
      setDraft(
        `Hi ${name},\n\nThanks for reaching out${
          lead.message ? ` about "${lead.message.slice(0, 60)}"` : ""
        }. I'd love to help you get this sorted. ` +
          `Are you free for a quick call ${
            lead.score >= 80 ? "today" : "this week"
          }? Just reply with a time that works and I'll lock it in.\n\nBest,\n${clientName} team`,
      );
      setDrafting(false);
    }, 600);
  }

  async function copyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {lead.name ?? "Unknown lead"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {clientName} · {lead.source ?? "—"}
          </p>
        </div>
        <p className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground md:block">
          {lead.message ?? "—"}
        </p>
        <Badge tone={scoreTone(lead.score)}>{lead.score}</Badge>
        <Badge tone={leadStatusTone[lead.status]}>{lead.status}</Badge>
        <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground sm:block">
          {formatDate(lead.created_at)}
        </span>
      </button>

      {open && (
        <div className="space-y-3 bg-secondary/30 px-4 pb-4 pt-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Message
              </p>
              <p className="mt-1 text-sm">{lead.message ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                AI qualification
              </p>
              <p className="mt-1 text-sm">{lead.qualification ?? "—"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {lead.email && <span>✉ {lead.email}</span>}
            {lead.phone && <span>☎ {lead.phone}</span>}
          </div>

          {draft ? (
            <div className="relative rounded-md border border-border bg-background p-3">
              <p className="whitespace-pre-wrap text-sm">{draft}</p>
              <button
                type="button"
                onClick={copyDraft}
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={generateDraft}
              disabled={drafting}
            >
              {drafting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {drafting ? "Drafting…" : "Draft follow-up"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
