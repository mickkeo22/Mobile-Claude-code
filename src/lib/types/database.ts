/**
 * Database schema types for Aether. Kept in sync with
 * supabase/migrations/0001_init.sql. If you change the SQL, regenerate or
 * update these by hand.
 */

export type ClientStatus = "active" | "paused" | "onboarding" | "churned";
export type LeadStatus = "new" | "qualified" | "contacted" | "won" | "lost";
export type ContentType = "blog" | "social" | "email" | "review_reply";
export type ContentStatus = "draft" | "scheduled" | "published";
export type AutomationType =
  | "lead_followup"
  | "weekly_report"
  | "review_monitor"
  | "content_calendar"
  | "invoice_reminder"
  | "onboarding";
export type AutomationStatus = "active" | "paused";
export type PlanTier = "starter" | "growth" | "scale";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

type Timestamps = { created_at: string };

export interface Profile extends Timestamps {
  id: string;
  full_name: string | null;
  agency_name: string | null;
  avatar_url: string | null;
}

export interface Client extends Timestamps {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  website: string | null;
  industry: string | null;
  status: ClientStatus;
  brand_color: string;
  contact_email: string | null;
  contact_phone: string | null;
  monthly_value: number;
  agent_persona: string | null;
}

export interface KnowledgeDoc extends Timestamps {
  id: string;
  client_id: string;
  title: string;
  content: string;
  source_url: string | null;
}

export interface Conversation extends Timestamps {
  id: string;
  client_id: string;
  channel: string;
  visitor_id: string | null;
  status: string;
}

export interface Message extends Timestamps {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Lead extends Timestamps {
  id: string;
  client_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  message: string | null;
  score: number;
  status: LeadStatus;
  qualification: string | null;
}

export interface ContentItem extends Timestamps {
  id: string;
  client_id: string;
  type: ContentType;
  title: string;
  body: string;
  platform: string | null;
  status: ContentStatus;
  scheduled_for: string | null;
}

export interface Automation extends Timestamps {
  id: string;
  client_id: string;
  type: AutomationType;
  name: string;
  status: AutomationStatus;
  config: Record<string, unknown>;
  last_run_at: string | null;
}

export interface AutomationRun extends Timestamps {
  id: string;
  automation_id: string;
  status: "success" | "error";
  summary: string | null;
}

export interface Subscription extends Timestamps {
  id: string;
  owner_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: PlanTier;
  status: SubscriptionStatus;
  current_period_end: string | null;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      clients: Table<Client>;
      knowledge_docs: Table<KnowledgeDoc>;
      conversations: Table<Conversation>;
      messages: Table<Message>;
      leads: Table<Lead>;
      content_items: Table<ContentItem>;
      automations: Table<Automation>;
      automation_runs: Table<AutomationRun>;
      subscriptions: Table<Subscription>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
