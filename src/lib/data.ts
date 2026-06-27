import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  demoClients,
  demoLeads,
  demoContent,
  demoAutomations,
} from "@/lib/demo";
import type {
  Client,
  Lead,
  ContentItem,
  Automation,
} from "@/lib/types/database";

/**
 * Server-side data access. Each function returns live Supabase data for the
 * signed-in agency, or demo data when Supabase isn't configured — so the
 * dashboard is always populated and explorable.
 */

export async function getSessionUser() {
  const supabase = await createClient();
  if (!supabase) return { id: "demo-user", email: "you@youragency.com", demo: true };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? "", demo: false } : null;
}

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient();
  if (!supabase) return demoClients;
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Client[]) ?? [];
}

export async function getClient(slug: string): Promise<Client | null> {
  const supabase = await createClient();
  if (!supabase) return demoClients.find((c) => c.slug === slug) ?? null;
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Client | null) ?? null;
}

export async function getLeads(clientId?: string): Promise<Lead[]> {
  const supabase = await createClient();
  if (!supabase)
    return clientId
      ? demoLeads.filter((l) => l.client_id === clientId)
      : demoLeads;
  let q = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;
  return (data as Lead[]) ?? [];
}

export async function getContent(clientId?: string): Promise<ContentItem[]> {
  const supabase = await createClient();
  if (!supabase)
    return clientId
      ? demoContent.filter((c) => c.client_id === clientId)
      : demoContent;
  let q = supabase
    .from("content_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;
  return (data as ContentItem[]) ?? [];
}

export async function getAutomations(clientId?: string): Promise<Automation[]> {
  const supabase = await createClient();
  if (!supabase)
    return clientId
      ? demoAutomations.filter((a) => a.client_id === clientId)
      : demoAutomations;
  let q = supabase
    .from("automations")
    .select("*")
    .order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;
  return (data as Automation[]) ?? [];
}

/** Aggregate metrics for the dashboard overview. */
export async function getOverviewStats() {
  const [clients, leads, content, automations] = await Promise.all([
    getClients(),
    getLeads(),
    getContent(),
    getAutomations(),
  ]);

  const mrr = clients.reduce((sum, c) => sum + Number(c.monthly_value || 0), 0);
  const qualified = leads.filter(
    (l) => l.status === "qualified" || l.status === "won",
  ).length;

  return {
    clients,
    leads,
    content,
    automations,
    metrics: {
      activeClients: clients.filter((c) => c.status === "active").length,
      totalClients: clients.length,
      mrr,
      totalLeads: leads.length,
      qualifiedLeads: qualified,
      activeAutomations: automations.filter((a) => a.status === "active").length,
      contentDrafts: content.filter((c) => c.status !== "published").length,
    },
  };
}
