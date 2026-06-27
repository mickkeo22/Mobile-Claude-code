import { Inbox, Sparkles, Gauge } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui";
import { LeadsInbox } from "@/components/dashboard/leads-inbox";
import { getLeads, getClients } from "@/lib/data";

export default async function LeadsPage() {
  const [leads, clients] = await Promise.all([getLeads(), getClients()]);

  const clientNames: Record<string, string> = Object.fromEntries(
    clients.map((c) => [c.id, c.name]),
  );

  const sorted = [...leads].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );

  const qualified = leads.filter(
    (l) => l.status === "qualified" || l.status === "won",
  ).length;
  const avgScore =
    leads.length > 0
      ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length)
      : 0;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every lead your agents capture, scored and qualified by AI."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total leads"
          value={leads.length}
          icon={<Inbox className="h-4 w-4" />}
        />
        <StatCard
          label="Qualified"
          value={qualified}
          hint="Ready to close"
          icon={<Sparkles className="h-4 w-4" />}
        />
        <StatCard
          label="Avg. score"
          value={avgScore}
          hint="Out of 100"
          icon={<Gauge className="h-4 w-4" />}
        />
      </div>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center shadow-sm">
          <p className="text-sm font-medium">No leads yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Once your AI agent widget is live on a client site, captured leads
            will appear here automatically — scored and qualified.
          </p>
        </div>
      ) : (
        <LeadsInbox leads={sorted} clientNames={clientNames} />
      )}
    </>
  );
}
