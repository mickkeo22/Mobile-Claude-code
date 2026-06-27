import Link from "next/link";
import {
  Users,
  DollarSign,
  Inbox,
  Sparkles,
  Workflow,
  ArrowUpRight,
  PenLine,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  StatCard,
  Badge,
  ButtonLink,
} from "@/components/ui";
import { getSessionUser, getOverviewStats } from "@/lib/data";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/types/database";

function scoreTone(score: number) {
  if (score >= 80) return "success" as const;
  if (score >= 60) return "default" as const;
  return "muted" as const;
}

const leadStatusTone: Record<LeadStatus, "default" | "success" | "warning" | "danger" | "info" | "muted"> = {
  new: "info",
  qualified: "success",
  contacted: "warning",
  won: "success",
  lost: "muted",
};

export default async function OverviewPage() {
  const [user, stats] = await Promise.all([getSessionUser(), getOverviewStats()]);
  const { clients, leads, metrics } = stats;

  const recentLeads = [...leads]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 5);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  const onboardingClients = clients.filter((c) => c.status === "onboarding");
  const unqualifiedLeads = leads.filter((l) => l.status === "new");

  const greetingName = user?.email?.split("@")[0] ?? "there";

  return (
    <>
      <PageHeader
        title={`Welcome back, ${greetingName}`}
        description="Here's what's happening across your client book today."
        action={
          <ButtonLink href="/dashboard/clients" variant="primary" size="sm">
            <Users className="h-4 w-4" />
            View clients
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Active clients"
          value={metrics.activeClients}
          hint={`${metrics.totalClients} total`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="MRR"
          value={formatCurrency(metrics.mrr)}
          hint="Recurring monthly"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Leads"
          value={metrics.totalLeads}
          hint="All-time captured"
          icon={<Inbox className="h-4 w-4" />}
        />
        <StatCard
          label="Qualified"
          value={metrics.qualifiedLeads}
          hint="Ready to close"
          icon={<Sparkles className="h-4 w-4" />}
        />
        <StatCard
          label="Automations"
          value={metrics.activeAutomations}
          hint="Running now"
          icon={<Workflow className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent leads */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent leads</CardTitle>
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <EmptyState
                title="No leads yet"
                body="Install your AI agent widget on a client site to start capturing leads."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 font-medium">Lead</th>
                      <th className="pb-2 font-medium">Client</th>
                      <th className="pb-2 font-medium">Score</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 text-right font-medium">Captured</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentLeads.map((lead: Lead) => (
                      <tr key={lead.id}>
                        <td className="py-3 pr-3">
                          <p className="font-medium">{lead.name ?? "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.source ?? "—"}
                          </p>
                        </td>
                        <td className="py-3 pr-3 text-muted-foreground">
                          {clientName(lead.client_id)}
                        </td>
                        <td className="py-3 pr-3">
                          <Badge tone={scoreTone(lead.score)}>{lead.score}</Badge>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge tone={leadStatusTone[lead.status]}>
                            {lead.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right text-xs text-muted-foreground">
                          {formatDate(lead.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attention needed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Attention needed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {onboardingClients.length === 0 && unqualifiedLeads.length === 0 ? (
              <EmptyState
                title="All clear"
                body="No clients onboarding and no new leads to triage."
              />
            ) : (
              <>
                {onboardingClients.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/clients/${c.slug}`}
                    className="flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-secondary"
                  >
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: c.brand_color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Onboarding — finish setup
                      </p>
                    </div>
                  </Link>
                ))}
                {unqualifiedLeads.slice(0, 4).map((l) => (
                  <Link
                    key={l.id}
                    href="/dashboard/leads"
                    className="flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-secondary"
                  >
                    <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {l.name ?? "New lead"} — unqualified
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {clientName(l.client_id)}
                      </p>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/dashboard/clients"
            icon={<Users className="h-5 w-5" />}
            label="Add a client"
            desc="Spin up a new workspace"
          />
          <QuickAction
            href="/dashboard/content"
            icon={<PenLine className="h-5 w-5" />}
            label="Generate content"
            desc="Blog, social & email"
          />
          <QuickAction
            href="/dashboard/agent"
            icon={<MessageSquare className="h-5 w-5" />}
            label="Test your agent"
            desc="Live chat tester"
          />
          <QuickAction
            href="/dashboard/automations"
            icon={<Workflow className="h-5 w-5" />}
            label="Automations"
            desc="Put work on autopilot"
          />
        </div>
      </div>
    </>
  );
}

function QuickAction({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary",
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
