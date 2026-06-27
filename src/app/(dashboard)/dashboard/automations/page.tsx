import {
  Workflow,
  Inbox,
  BarChart3,
  Star,
  CalendarDays,
  Receipt,
  UserPlus,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
} from "@/components/ui";
import {
  RunNowButton,
  StatusToggle,
} from "@/components/dashboard/automation-card";
import { getAutomations, getClients } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import type { AutomationType } from "@/lib/types/database";

const CATALOG: Record<
  AutomationType,
  { label: string; description: string; icon: React.ReactNode }
> = {
  lead_followup: {
    label: "Instant lead follow-up",
    description:
      "The moment a lead comes in, send a personalized email (and SMS) within minutes so you never miss a hot prospect.",
    icon: <Inbox className="h-5 w-5" />,
  },
  weekly_report: {
    label: "Weekly performance report",
    description:
      "Auto-compile leads, conversations, and content into a clean report and email it to the client every week.",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  review_monitor: {
    label: "Review monitor & replies",
    description:
      "Watch Google and social reviews, then draft on-brand replies for one-click approval.",
    icon: <Star className="h-5 w-5" />,
  },
  content_calendar: {
    label: "Content calendar",
    description:
      "Generate and schedule a steady drip of social posts so the client's feed never goes quiet.",
    icon: <CalendarDays className="h-5 w-5" />,
  },
  invoice_reminder: {
    label: "Invoice reminders",
    description:
      "Nudge clients about upcoming and overdue invoices automatically so you get paid on time.",
    icon: <Receipt className="h-5 w-5" />,
  },
  onboarding: {
    label: "Client onboarding",
    description:
      "Run a multi-step welcome sequence that collects assets and sets up a new client without manual chasing.",
    icon: <UserPlus className="h-5 w-5" />,
  },
};

export default async function AutomationsPage() {
  const [automations, clients] = await Promise.all([
    getAutomations(),
    getClients(),
  ]);
  const clientNames: Record<string, string> = Object.fromEntries(
    clients.map((c) => [c.id, c.name]),
  );

  const activeTypes = new Set(automations.map((a) => a.type));
  const available = (Object.keys(CATALOG) as AutomationType[]).filter(
    (t) => !activeTypes.has(t),
  );

  return (
    <>
      <PageHeader
        title="Automations"
        description="Put the back office on autopilot. Each automation runs in the background for your clients."
      />

      {/* Running automations */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Workflow className="h-4 w-4 text-muted-foreground" />
          Active automations
          <span className="text-muted-foreground">({automations.length})</span>
        </h2>

        {automations.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No automations running yet. Add one from the catalog below.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {automations.map((a) => {
              const meta = CATALOG[a.type];
              return (
                <Card key={a.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {meta.icon}
                      </span>
                      <div>
                        <p className="font-medium leading-tight">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {clientNames[a.client_id] ?? "—"}
                        </p>
                      </div>
                    </div>
                    <StatusToggle active={a.status === "active"} />
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {meta.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      Last run:{" "}
                      {a.last_run_at ? formatDate(a.last_run_at) : "never"}
                    </span>
                    <RunNowButton automationId={a.id} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>Automation catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(CATALOG) as AutomationType[]).map((type) => {
              const meta = CATALOG[type];
              const enabled = activeTypes.has(type);
              return (
                <div
                  key={type}
                  className="flex flex-col rounded-md border border-border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-foreground">
                      {meta.icon}
                    </span>
                    {enabled && <Badge tone="success">enabled</Badge>}
                  </div>
                  <p className="mt-3 text-sm font-medium">{meta.label}</p>
                  <p className="mt-1 flex-1 text-xs text-muted-foreground">
                    {meta.description}
                  </p>
                  {!enabled && (
                    <Button size="sm" variant="outline" className="mt-3 w-full">
                      <Plus className="h-3.5 w-3.5" />
                      Enable
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          {available.length === 0 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Every automation is enabled. Nice work.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
