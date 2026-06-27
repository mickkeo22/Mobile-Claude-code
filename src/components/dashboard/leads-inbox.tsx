"use client";

import { useMemo, useState } from "react";
import { LeadRow } from "@/components/dashboard/lead-row";
import { cn } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/types/database";

const FILTERS: { value: "all" | LeadStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "contacted", label: "Contacted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export function LeadsInbox({
  leads,
  clientNames,
}: {
  leads: Lead[];
  clientNames: Record<string, string>;
}) {
  const [filter, setFilter] = useState<"all" | LeadStatus>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  const filtered = useMemo(
    () => (filter === "all" ? leads : leads.filter((l) => l.status === filter)),
    [leads, filter],
  );

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-3">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            {counts[f.value] ? (
              <span className="ml-1 opacity-70">{counts[f.value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No leads match this filter.
        </p>
      ) : (
        <div>
          {filtered.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              clientName={clientNames[lead.client_id] ?? "—"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
