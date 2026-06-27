import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

/**
 * Server-side Stripe client. Null when billing is not configured (demo mode).
 */
export const stripe: Stripe | null = env.stripeSecret
  ? new Stripe(env.stripeSecret, {
      apiVersion: "2025-02-24.acacia",
      appInfo: { name: "Aether", version: "1.0.0" },
    })
  : null;
