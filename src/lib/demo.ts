/**
 * Rich demo data. Powers the product in "demo mode" (no Supabase configured)
 * so you can explore every screen — and run live client demos — before wiring
 * a database. Mirrors the real schema types exactly.
 */
import type {
  Client,
  Lead,
  ContentItem,
  Automation,
  Conversation,
  Message,
} from "@/lib/types/database";

const now = "2026-06-20T12:00:00.000Z";

export const demoClients: Client[] = [
  {
    id: "demo-client-1",
    owner_id: "demo-user",
    name: "Brightside Dental",
    slug: "brightside-dental",
    website: "https://brightsidedental.example",
    industry: "Dental practice",
    status: "active",
    brand_color: "#10b981",
    contact_email: "office@brightsidedental.example",
    contact_phone: "+1 (555) 010-2233",
    monthly_value: 1200,
    agent_persona:
      "a friendly, reassuring front-desk coordinator who calms nervous patients",
    created_at: now,
  },
  {
    id: "demo-client-2",
    owner_id: "demo-user",
    name: "Apex Plumbing Co.",
    slug: "apex-plumbing",
    website: "https://apexplumbing.example",
    industry: "Home services",
    status: "active",
    brand_color: "#3b82f6",
    contact_email: "dispatch@apexplumbing.example",
    contact_phone: "+1 (555) 040-7788",
    monthly_value: 950,
    agent_persona: "a no-nonsense, fast-responding dispatcher",
    created_at: now,
  },
  {
    id: "demo-client-3",
    owner_id: "demo-user",
    name: "Luna Yoga Studio",
    slug: "luna-yoga",
    website: "https://lunayoga.example",
    industry: "Fitness & wellness",
    status: "onboarding",
    brand_color: "#a855f7",
    contact_email: "hello@lunayoga.example",
    contact_phone: "+1 (555) 077-1290",
    monthly_value: 600,
    agent_persona: "a calm, encouraging wellness guide",
    created_at: now,
  },
];

export const demoLeads: Lead[] = [
  {
    id: "demo-lead-1",
    client_id: "demo-client-1",
    name: "Maria Gomez",
    email: "maria@example.com",
    phone: "+1 (555) 222-9087",
    source: "Website widget",
    message: "Do you offer Invisalign? I'd like to book a consult ASAP.",
    score: 88,
    status: "qualified",
    qualification: "High intent — named service + urgency + contact details.",
    created_at: now,
  },
  {
    id: "demo-lead-2",
    client_id: "demo-client-2",
    name: "Derek Lin",
    email: "derek@example.com",
    phone: "+1 (555) 333-1145",
    source: "Google Ads",
    message: "Burst pipe under the sink, need someone today!",
    score: 95,
    status: "qualified",
    qualification: "Emergency job, ready to buy now.",
    created_at: now,
  },
  {
    id: "demo-lead-3",
    client_id: "demo-client-1",
    name: "Priya N.",
    email: "priya@example.com",
    phone: null,
    source: "Instagram",
    message: "What are your hygienist prices?",
    score: 52,
    status: "new",
    qualification: "Price shopping — nurture toward a booking.",
    created_at: now,
  },
  {
    id: "demo-lead-4",
    client_id: "demo-client-3",
    name: "Sam Carter",
    email: "sam@example.com",
    phone: "+1 (555) 444-7781",
    source: "Website widget",
    message: "Interested in the unlimited monthly membership.",
    score: 74,
    status: "qualified",
    qualification: "Membership intent with contact details.",
    created_at: now,
  },
];

export const demoContent: ContentItem[] = [
  {
    id: "demo-content-1",
    client_id: "demo-client-1",
    type: "blog",
    title: "5 Signs It's Time to See Your Dentist",
    body: "Demo body — connect an Anthropic key to generate full drafts.",
    platform: "Website",
    status: "published",
    scheduled_for: null,
    created_at: now,
  },
  {
    id: "demo-content-2",
    client_id: "demo-client-2",
    type: "social",
    title: "Winter pipe-burst prevention checklist 🧰",
    body: "Demo body.",
    platform: "Facebook",
    status: "scheduled",
    scheduled_for: "2026-06-30T15:00:00.000Z",
    created_at: now,
  },
  {
    id: "demo-content-3",
    client_id: "demo-client-3",
    type: "email",
    title: "Your first week of Luna Yoga is on us",
    body: "Demo body.",
    platform: "Email",
    status: "draft",
    scheduled_for: null,
    created_at: now,
  },
];

export const demoAutomations: Automation[] = [
  {
    id: "demo-auto-1",
    client_id: "demo-client-1",
    type: "lead_followup",
    name: "Instant lead follow-up",
    status: "active",
    config: { channels: ["email"], delay_minutes: 2 },
    last_run_at: now,
    created_at: now,
  },
  {
    id: "demo-auto-2",
    client_id: "demo-client-1",
    type: "weekly_report",
    name: "Weekly performance report",
    status: "active",
    config: { day: "monday" },
    last_run_at: now,
    created_at: now,
  },
  {
    id: "demo-auto-3",
    client_id: "demo-client-2",
    type: "review_monitor",
    name: "Review monitor & auto-reply drafts",
    status: "active",
    config: { sources: ["google"] },
    last_run_at: null,
    created_at: now,
  },
  {
    id: "demo-auto-4",
    client_id: "demo-client-3",
    type: "onboarding",
    name: "New client onboarding sequence",
    status: "active",
    config: { steps: 6 },
    last_run_at: null,
    created_at: now,
  },
];

export const demoConversations: (Conversation & { messages: Message[] })[] = [
  {
    id: "demo-conv-1",
    client_id: "demo-client-1",
    channel: "web",
    visitor_id: "visitor-abc",
    status: "open",
    created_at: now,
    messages: [
      {
        id: "m1",
        conversation_id: "demo-conv-1",
        role: "user",
        content: "Hi, do you take walk-ins for a cleaning?",
        created_at: now,
      },
      {
        id: "m2",
        conversation_id: "demo-conv-1",
        role: "assistant",
        content:
          "We sometimes have same-day openings! The fastest way to grab one is to leave your name and number — I'll have the front desk text you our next available slot. What works best?",
        created_at: now,
      },
    ],
  },
];

export const isDemoUser = { id: "demo-user", email: "you@youragency.com" };
