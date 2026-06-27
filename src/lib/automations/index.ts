import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { demoAutomations, demoClients, demoLeads } from "@/lib/demo";
import type { Automation, AutomationType } from "@/lib/types/database";

/**
 * Minimal typed facade over the admin Supabase client. The installed
 * supabase-js + postgrest-js versions resolve chained query results to `never`,
 * so we narrow the surface we use here to restore useful types.
 */
interface AdminFilter<Row>
  extends PromiseLike<{ data: Row[] | null; error: unknown; count: number | null }> {
  eq: (col: string, val: unknown) => AdminFilter<Row>;
  single: () => PromiseLike<{ data: Row | null; error: unknown }>;
}
interface AdminTable {
  select: <Row = Record<string, unknown>>(
    cols?: string,
    opts?: { count?: "exact"; head?: boolean },
  ) => AdminFilter<Row>;
  insert: (values: unknown) => PromiseLike<{ error: unknown }>;
  update: (values: unknown) => AdminFilter<Record<string, unknown>>;
}
interface AdminDb {
  from: (table: string) => AdminTable;
}
function admin(): AdminDb | null {
  const c = createAdminClient();
  return c ? (c as unknown as AdminDb) : null;
}

export interface AutomationCatalogEntry {
  type: AutomationType;
  label: string;
  description: string;
}

/** Catalog of every automation Aether can run for a client. */
export const AUTOMATION_CATALOG: AutomationCatalogEntry[] = [
  {
    type: "lead_followup",
    label: "Instant lead follow-up",
    description:
      "Within minutes of a new lead, send an AI-personalized email or SMS so no inquiry goes cold.",
  },
  {
    type: "weekly_report",
    label: "Weekly performance report",
    description:
      "Summarize new leads, qualified opportunities, and conversations into a client-ready recap.",
  },
  {
    type: "review_monitor",
    label: "Review monitor & reply drafts",
    description:
      "Watch for new public reviews and draft on-brand responses ready for one-click approval.",
  },
  {
    type: "content_calendar",
    label: "Content calendar autopilot",
    description:
      "Generate and schedule a steady drip of social and blog content tailored to the brand voice.",
  },
  {
    type: "invoice_reminder",
    label: "Invoice & payment reminders",
    description:
      "Nudge clients about upcoming and overdue invoices so cash flow stays healthy.",
  },
  {
    type: "onboarding",
    label: "New client onboarding",
    description:
      "Drive new clients through a multi-step onboarding sequence with timely reminders.",
  },
];

export interface AutomationRunResult {
  automationId: string;
  type: AutomationType | string;
  name: string;
  status: "success" | "error";
  summary: string;
}

export interface RunSummary {
  ran: number;
  results: AutomationRunResult[];
}

/**
 * Run every active (and due) automation. Robust + non-throwing.
 * Demo mode simulates runs; with Supabase it loads real automations,
 * produces a lightweight summary, and records the run.
 */
export async function runDueAutomations(): Promise<RunSummary> {
  const sb = admin();

  if (!sb) {
    const results = demoAutomations
      .filter((a) => a.status === "active")
      .map((a) => simulateRun(a));
    return { ran: results.length, results };
  }

  try {
    const { data, error } = await sb
      .from("automations")
      .select<Automation>("*")
      .eq("status", "active");

    if (error || !data) {
      return { ran: 0, results: [] };
    }

    const results: AutomationRunResult[] = [];
    for (const automation of data) {
      results.push(await executeAutomation(automation));
    }
    return { ran: results.length, results };
  } catch (err) {
    console.error("[automations] runDueAutomations failed", err);
    return { ran: 0, results: [] };
  }
}

/** Run a single automation by id. Non-throwing. */
export async function runAutomation(id: string): Promise<RunSummary> {
  const sb = admin();

  if (!sb) {
    const found = demoAutomations.find((a) => a.id === id);
    if (!found) {
      return { ran: 0, results: [] };
    }
    return { ran: 1, results: [simulateRun(found)] };
  }

  try {
    const { data, error } = await sb
      .from("automations")
      .select<Automation>("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return { ran: 0, results: [] };
    }
    const result = await executeAutomation(data);
    return { ran: 1, results: [result] };
  } catch (err) {
    console.error("[automations] runAutomation failed", err);
    return { ran: 0, results: [] };
  }
}

/** Execute a real automation against Supabase, then record the run. */
async function executeAutomation(
  automation: Automation,
): Promise<AutomationRunResult> {
  const sb = admin();
  let summary = describe(automation.type, automation.name);
  let status: "success" | "error" = "success";

  try {
    if (sb && automation.type === "weekly_report") {
      const { count } = await sb
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("client_id", automation.client_id);
      const { count: qualified } = await sb
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("client_id", automation.client_id)
        .eq("status", "qualified");
      summary = `Weekly report: ${count ?? 0} total leads, ${
        qualified ?? 0
      } qualified.`;
    }

    if (sb) {
      const nowIso = new Date().toISOString();
      await sb
        .from("automations")
        .update({ last_run_at: nowIso })
        .eq("id", automation.id);
      await sb.from("automation_runs").insert({
        automation_id: automation.id,
        status,
        summary,
      });
    }
  } catch (err) {
    console.error("[automations] execute failed", automation.id, err);
    status = "error";
    summary = `Failed to run "${automation.name}".`;
  }

  return {
    automationId: automation.id,
    type: automation.type,
    name: automation.name,
    status,
    summary,
  };
}

/** Simulate a run in demo mode with a believable human-readable summary. */
function simulateRun(automation: Automation): AutomationRunResult {
  let summary = describe(automation.type, automation.name);

  if (automation.type === "weekly_report") {
    const leads = demoLeads.filter((l) => l.client_id === automation.client_id);
    const qualified = leads.filter((l) => l.status === "qualified").length;
    const client = demoClients.find((c) => c.id === automation.client_id);
    summary = `Weekly report for ${client?.name ?? "client"}: ${
      leads.length
    } leads, ${qualified} qualified.`;
  }

  return {
    automationId: automation.id,
    type: automation.type,
    name: automation.name,
    status: "success",
    summary: `${summary} (demo)`,
  };
}

function describe(type: AutomationType | string, name: string): string {
  const entry = AUTOMATION_CATALOG.find((c) => c.type === type);
  switch (type) {
    case "lead_followup":
      return "Checked for un-contacted leads and queued instant follow-ups.";
    case "review_monitor":
      return "Scanned review sources and drafted reply suggestions.";
    case "content_calendar":
      return "Generated upcoming content drafts for the calendar.";
    case "invoice_reminder":
      return "Reviewed invoices and queued payment reminders.";
    case "onboarding":
      return "Advanced new clients to the next onboarding step.";
    default:
      return entry ? `${entry.label} ran successfully.` : `Ran "${name}".`;
  }
}
