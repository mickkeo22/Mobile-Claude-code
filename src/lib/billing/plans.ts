import { env } from "@/lib/env";
import type { PlanTier } from "@/lib/types/database";

export interface Plan {
  id: PlanTier;
  name: string;
  tagline: string;
  /** Monthly price in USD. */
  price: number;
  priceId?: string;
  /** Soft limit on managed clients, surfaced in-product. */
  clientLimit: number;
  features: string[];
  highlighted?: boolean;
}

/**
 * Pricing is what you charge YOUR agency operator to use Aether.
 * The numbers are tuned for solo operators and small teams signing SMB clients.
 */
export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Land your first handful of clients.",
    price: 49,
    priceId: env.stripePrices.starter,
    clientLimit: 3,
    features: [
      "Up to 3 client workspaces",
      "AI support agent + embeddable widget",
      "Lead capture & AI qualification",
      "Instant email follow-up",
      "Core back-office automations",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Scale to a full book of business.",
    price: 149,
    priceId: env.stripePrices.growth,
    clientLimit: 15,
    highlighted: true,
    features: [
      "Up to 15 client workspaces",
      "Everything in Starter",
      "SMS follow-up (Twilio)",
      "Content & social automation",
      "Weekly auto-reports for clients",
      "Priority AI model routing",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "Run an agency, not a side hustle.",
    price: 399,
    priceId: env.stripePrices.scale,
    clientLimit: 100,
    features: [
      "Up to 100 client workspaces",
      "Everything in Growth",
      "White-label client portal",
      "All back-office automations",
      "API + webhook access",
      "Dedicated onboarding",
    ],
  },
];

export function getPlan(id: PlanTier): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
