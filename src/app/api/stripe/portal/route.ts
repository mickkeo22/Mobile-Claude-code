import { stripe } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/app/api/_lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST() {
  if (!stripe) {
    return Response.json({
      url: null,
      demo: true,
      message:
        "Billing is in demo mode. Add STRIPE_SECRET_KEY to manage your subscription.",
    });
  }

  try {
    // Look up the signed-in user's Stripe customer id from subscriptions.
    let customerId: string | null = null;
    try {
      const supabase = db(await createClient());
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) {
          const { data } = await supabase
            .from("subscriptions")
            .select<{ stripe_customer_id: string | null }>("stripe_customer_id")
            .eq("owner_id", user.id)
            .limit(1)
            .maybeSingle();
          customerId = data?.stripe_customer_id ?? null;
        }
      }
    } catch {
      // fall through to the graceful notice below
    }

    if (!customerId) {
      return Response.json({
        url: null,
        demo: true,
        message:
          "No active subscription found yet. Complete checkout first to manage billing.",
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.appUrl}/dashboard/billing`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/portal] error", err);
    return Response.json(
      { error: "Failed to open billing portal." },
      { status: 500 },
    );
  }
}
