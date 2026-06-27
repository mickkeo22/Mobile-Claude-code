import type Stripe from "stripe";
import { stripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { db } from "@/app/api/_lib/db";
import { env } from "@/lib/env";
import type { PlanTier, SubscriptionStatus } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!stripe || !env.stripeWebhookSecret) {
    return Response.json({ received: true, skipped: true });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return Response.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(
      raw,
      sig,
      env.stripeWebhookSecret,
    );
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed", err);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await upsertFromCheckout(session);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertFromSubscription(sub);
        break;
      }
      default:
        // Unhandled events are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", event.type, err);
    // Still ack — we don't want infinite retries on a transient DB hiccup.
  }

  return Response.json({ received: true });
}

async function upsertFromCheckout(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const admin = db(createAdminClient());
  if (!admin) return;

  const ownerId = session.client_reference_id ?? null;
  const customerId =
    typeof session.customer === "string" ? session.customer : null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  const plan = normalizePlan(session.metadata?.plan);

  await admin.from("subscriptions").upsert(
    {
      ...(ownerId ? { owner_id: ownerId } : {}),
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      status: "active",
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function upsertFromSubscription(
  sub: Stripe.Subscription,
): Promise<void> {
  const admin = db(createAdminClient());
  if (!admin) return;

  const customerId = typeof sub.customer === "string" ? sub.customer : null;
  const priceId = sub.items.data[0]?.price.id;
  const plan = planFromPriceId(priceId);
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  await admin.from("subscriptions").upsert(
    {
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: normalizeStatus(sub.status),
      ...(plan ? { plan } : {}),
      current_period_end: periodEnd,
    },
    { onConflict: "stripe_subscription_id" },
  );
}

function normalizePlan(value: string | undefined): PlanTier {
  return value === "growth" || value === "scale" ? value : "starter";
}

function planFromPriceId(priceId: string | undefined): PlanTier | null {
  if (!priceId) return null;
  if (priceId === env.stripePrices.scale) return "scale";
  if (priceId === env.stripePrices.growth) return "growth";
  if (priceId === env.stripePrices.starter) return "starter";
  return null;
}

function normalizeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "incomplete";
  }
}
