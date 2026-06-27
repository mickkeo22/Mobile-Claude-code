import Link from "next/link";
import { Globe, Mail, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, Badge } from "@/components/ui";
import { AddClientForm } from "@/components/dashboard/add-client-form";
import { getClients } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import type { ClientStatus } from "@/lib/types/database";

const statusTone: Record<ClientStatus, "success" | "warning" | "info" | "muted"> = {
  active: "success",
  paused: "warning",
  onboarding: "info",
  churned: "muted",
};

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <>
      <PageHeader
        title="Clients"
        description="Every business you operate for, in one place."
        action={<AddClientForm />}
      />

      {clients.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm font-medium">No clients yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Add your first client to spin up an AI agent, capture leads, and
            automate their back office.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.slug}`}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/40"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: client.brand_color }}
                  />
                  <div>
                    <p className="font-semibold leading-tight">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.industry ?? "—"}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Badge tone={statusTone[client.status]}>{client.status}</Badge>
                <span className="text-sm font-semibold">
                  {formatCurrency(client.monthly_value)}
                  <span className="text-xs font-normal text-muted-foreground">
                    /mo
                  </span>
                </span>
              </div>

              <div className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                {client.contact_email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{client.contact_email}</span>
                  </p>
                )}
                {client.website && (
                  <p className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    <span className="truncate">
                      {client.website.replace(/^https?:\/\//, "")}
                    </span>
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
