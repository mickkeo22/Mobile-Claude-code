import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Badge, buttonClass } from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import { PLANS } from "@/lib/billing/plans";

export function PricingCards({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid items-stretch gap-6 md:grid-cols-3",
        className,
      )}
    >
      {PLANS.map((plan) => {
        const highlighted = Boolean(plan.highlighted);
        return (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm md:p-8",
              highlighted
                ? "border-primary/40 ring-1 ring-primary/30 shadow-lg"
                : "border-border",
            )}
          >
            {highlighted && (
              <Badge className="absolute -top-3 left-6">
                <Sparkles className="h-3 w-3" />
                Most popular
              </Badge>
            )}

            <div>
              <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
            </div>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">
                {formatCurrency(plan.price)}
              </span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Up to {plan.clientLimit} client workspaces
            </p>

            <Link
              href={`/signup?plan=${plan.id}`}
              className={cn(
                buttonClass(highlighted ? "primary" : "outline", "lg", "mt-6 w-full"),
              )}
            >
              Get started
            </Link>

            <ul className="mt-7 space-y-3 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
