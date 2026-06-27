/**
 * Central environment access with graceful feature-flagging.
 *
 * Design goal: the app always BUILDS and RUNS. Each integration reports
 * whether it is "live" (keys present) or in "demo mode" (keys absent), so the
 * product degrades gracefully instead of crashing. This is what lets you ship
 * today and flip features on as you add keys.
 */

function get(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  appUrl: get("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  appName: get("NEXT_PUBLIC_APP_NAME") ?? "Aether",

  supabaseUrl: get("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: get("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: get("SUPABASE_SERVICE_ROLE_KEY"),

  anthropicKey: get("ANTHROPIC_API_KEY"),
  anthropicModel: get("ANTHROPIC_MODEL") ?? "claude-opus-4-8",

  stripeSecret: get("STRIPE_SECRET_KEY"),
  stripePublishable: get("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  stripeWebhookSecret: get("STRIPE_WEBHOOK_SECRET"),
  stripePrices: {
    starter: get("NEXT_PUBLIC_STRIPE_PRICE_STARTER"),
    growth: get("NEXT_PUBLIC_STRIPE_PRICE_GROWTH"),
    scale: get("NEXT_PUBLIC_STRIPE_PRICE_SCALE"),
  },

  resendKey: get("RESEND_API_KEY"),
  resendFrom: get("RESEND_FROM_EMAIL") ?? "Aether <hello@example.com>",
  twilioSid: get("TWILIO_ACCOUNT_SID"),
  twilioToken: get("TWILIO_AUTH_TOKEN"),
  twilioFrom: get("TWILIO_FROM_NUMBER"),

  cronSecret: get("CRON_SECRET"),
} as const;

export const features = {
  get supabase() {
    return Boolean(env.supabaseUrl && env.supabaseAnonKey);
  },
  get ai() {
    return Boolean(env.anthropicKey);
  },
  get billing() {
    return Boolean(env.stripeSecret && env.stripePublishable);
  },
  get email() {
    return Boolean(env.resendKey);
  },
  get sms() {
    return Boolean(env.twilioSid && env.twilioToken && env.twilioFrom);
  },
} as const;

export type FeatureKey = keyof typeof features;
