import { Check, Info, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@/components/ui";
import {
  ChoosePlanButton,
  ManageBillingButton,
} from "@/components/dashboard/billing-actions";
import { PLANS, getPlan } from "@/lib/billing/plans";
import { features } from "@/lib/env";
import { formatCurrency, cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/types/database";

export default function BillingPage() {
  const billingLive = features.billing;
  // In demo we assume the operator is on Growth.
  const currentPlanId: PlanTier = "growth";
  const currentPlan = getPlan(currentPlanId);

  return (
    <>
      <PageHeader
        title="Billing"
        description="Manage your Aether subscription and unlock more client capacity."
        action={<ManageBillingButton billingLive={billingLive} />}
      />

      {!billingLive && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-amber-500/10 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Billing is in demo mode. Add your{" "}
            <span className="font-medium">Stripe keys</span> to enable live
            checkout and the customer portal. Until then, plan selection is
            preview-only.
          </p>
        </div>
      )}

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Current plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">
                  {currentPlan.name}
                </span>
                <Badge tone="success">active</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentPlan.tagline}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold">
                {formatCurrency(currentPlan.price)}
                <span className="text-sm font-normal text-muted-foreground">
                  /mo
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Up to {currentPlan.clientLimit} client workspaces
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Change plan
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const current = plan.id === currentPlanId;
            return (
              <Card
                key={plan.id}
                className={cn(
                  "flex flex-col p-6",
                  plan.highlighted && "border-primary ring-1 ring-primary/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.highlighted && <Badge tone="default">Popular</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.tagline}
                </p>
                <p className="mt-4 text-3xl font-semibold">
                  {formatCurrency(plan.price)}
                  <span className="text-base font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>

                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <ChoosePlanButton
                    plan={plan.id}
                    current={current}
                    highlighted={plan.highlighted}
                    billingLive={billingLive}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
