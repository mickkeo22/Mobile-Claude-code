// Central env access. Nothing here throws at import time — the live funnel
// must keep working (and `next build` must pass) even when integrations are
// unconfigured. Each consumer decides how to degrade.

export const env = {
  get anthropicKey() {
    return process.env.ANTHROPIC_API_KEY || '';
  },
  get anthropicModel() {
    return process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  },
  get supabaseUrl() {
    return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  },
  get supabaseServiceKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  },
  get ghlWebhookUrl() {
    return process.env.GHL_WEBHOOK_URL || '';
  },
  get ghlBookingToken() {
    return process.env.GHL_BOOKING_TOKEN || '';
  },
  get adminPassword() {
    return process.env.ADMIN_PASSWORD || '';
  },
  get sessionSecret() {
    return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
  },
  get cronSecret() {
    return process.env.CRON_SECRET || '';
  },
  get resendKey() {
    return process.env.RESEND_API_KEY || '';
  },
  get digestTo() {
    return process.env.DIGEST_EMAIL_TO || '';
  },
  get digestFrom() {
    return process.env.DIGEST_EMAIL_FROM || 'MK Operating <onboarding@resend.dev>';
  },
  /** Sender for lead-facing audit report emails. Deliberately has NO
      resend.dev fallback: Resend's test sender can't reach arbitrary
      recipients, so audit emails stay off until a verified-domain sender
      (e.g. "MK Operating <audit@mkoperating.com>") is configured. */
  get auditEmailFrom() {
    return process.env.AUDIT_EMAIL_FROM || '';
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || 'https://mkoperating.com').replace(/\/$/, '');
  },
  get demoMode() {
    return process.env.DEMO_MODE === '1' && process.env.NODE_ENV !== 'production';
  },
};

export const GHL_BOOKING_URL =
  'https://api.leadconnectorhq.com/widget/booking/nT7yoVYh91A28KZqfT8Q';
