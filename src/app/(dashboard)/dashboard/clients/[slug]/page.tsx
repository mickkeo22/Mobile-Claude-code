import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  DollarSign,
  Inbox,
  PenLine,
  Workflow,
  Code2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@/components/ui";
import { CopySnippet } from "@/components/dashboard/copy-snippet";
import {
  getClient,
  getLeads,
  getContent,
  getAutomations,
} from "@/lib/data";
import { env } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  ClientStatus,
  LeadStatus,
  ContentStatus,
} from "@/lib/types/database";

const clientStatusTone: Record<ClientStatus, "success" | "warning" | "info" | "muted"> = {
  active: "success",
  paused: "warning",
  onboarding: "info",
  churned: "muted",
};

const leadStatusTone: Record<LeadStatus, "default" | "success" | "warning" | "danger" | "info" | "muted"> = {
  new: "info",
  qualified: "success",
  contacted: "warning",
  won: "success",
  lost: "muted",
};

const contentStatusTone: Record<ContentStatus, "muted" | "warning" | "success"> = {
  draft: "muted",
  scheduled: "warning",
  published: "success",
};

function scoreTone(score: number) {
  if (score >= 80) return "success" as const;
  if (score >= 60) return "default" as const;
  return "muted" as const;
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getClient(slug);
  if (!client) notFound();

  const [leads, content, automations] = await Promise.all([
    getLeads(client.id),
    getContent(client.id),
    getAutomations(client.id),
  ]);

  const snippet = `<script src="${env.appUrl}/widget.js" data-client="${client.slug}" async></script>`;

  return (
    <>
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All clients
      </Link>

      {/* Header with brand color */}
      <div
        className="relative overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm"
        style={{ borderTopColor: client.brand_color, borderTopWidth: 3 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-semibold text-white"
              style={{ backgroundColor: client.brand_color }}
            >
              {client.name.slice(0, 1)}
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {client.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {client.industry ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={clientStatusTone[client.status]}>
              {client.status}
            </Badge>
            <span className="text-lg font-semibold">
              {formatCurrency(client.monthly_value)}
              <span className="text-sm font-normal text-muted-foreground">
                /mo
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Contact
          </p>
          <div className="mt-3 space-y-2 text-sm">
            {client.contact_email ? (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {client.contact_email}
              </p>
            ) : null}
            {client.contact_phone ? (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {client.contact_phone}
              </p>
            ) : null}
            {!client.contact_email && !client.contact_phone && (
              <p className="text-muted-foreground">No contact on file.</p>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Website
          </p>
          <div className="mt-3 text-sm">
            {client.website ? (
              <a
                href={client.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Globe className="h-4 w-4" />
                {client.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <p className="text-muted-foreground">No website on file.</p>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Monthly value
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            {formatCurrency(client.monthly_value)} recurring
          </p>
        </Card>
      </div>

      {/* AI Agent install */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Install the AI agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Drop this snippet into{" "}
            <span className="font-medium text-foreground">{client.name}</span>
            &apos;s site, just before the closing{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              &lt;/body&gt;
            </code>{" "}
            tag. The widget loads their branded support agent and captures leads
            automatically.
          </p>
          <CopySnippet code={snippet} />
          {client.agent_persona && (
            <p className="text-xs text-muted-foreground">
              Persona: {client.agent_persona}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Leads
            <span className="text-sm font-normal text-muted-foreground">
              ({leads.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No leads captured yet for this client.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{lead.name ?? "Unknown"}</p>
                      <Badge tone={leadStatusTone[lead.status]}>
                        {lead.status}
                      </Badge>
                    </div>
                    {lead.message && (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {lead.message}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={scoreTone(lead.score)}>{lead.score}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-4 w-4" />
            Content
            <span className="text-sm font-normal text-muted-foreground">
              ({content.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {content.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No content created yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {content.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="info">{item.type}</Badge>
                    <Badge tone={contentStatusTone[item.status]}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium">{item.title}</p>
                  {item.platform && (
                    <p className="text-xs text-muted-foreground">
                      {item.platform}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Automations
            <span className="text-sm font-normal text-muted-foreground">
              ({automations.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {automations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No automations configured.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {automations.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Last run:{" "}
                      {a.last_run_at ? formatDate(a.last_run_at) : "never"}
                    </p>
                  </div>
                  <Badge tone={a.status === "active" ? "success" : "muted"}>
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
