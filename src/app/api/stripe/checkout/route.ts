import { z } from "zod";
import { stripe } from "@/lib/billing/stripe";
import { getPlan } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/app/api/_lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const bodySchema = z.object({
  plan: z.enum(["starter", "growth", "scale"]),
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return Response.json(
      { error: "Invalid plan. Expected one of: starter, growth, scale." },
      { status: 400 },
    );
  }

  if (!stripe) {
    return Response.json({
      url: null,
      demo: true,
      message:
        "Billing is in demo mode. Add STRIPE_SECRET_KEY to enable live checkout.",
    });
  }

  try {
    const plan = getPlan(parsed.plan);
    if (!plan.priceId) {
      return Response.json(
        {
          url: null,
          demo: true,
          message: `No Stripe price configured for the ${plan.name} plan.`,
        },
        { status: 200 },
      );
    }

    // Attach the signed-in user's email when available.
    let customerEmail: string | undefined;
    try {
      const supabase = db(await createClient());
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) customerEmail = user.email;
      }
    } catch {
      // anonymous checkout is fine
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${env.appUrl}/dashboard?checkout=success`,
      cancel_url: `${env.appUrl}/dashboard/billing`,
      allow_promotion_codes: true,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      metadata: { plan: plan.id },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] error", err);
    return Response.json(
      { error: "Failed to create checkout session." },
      { status: 500 },
    );
  }
}
