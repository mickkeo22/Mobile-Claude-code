import {
  Database,
  Bot,
  CreditCard,
  Mail,
  MessageSquare,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
} from "@/components/ui";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { getSessionUser } from "@/lib/data";
import { features } from "@/lib/env";
import { signOut } from "@/lib/auth/actions";

const INTEGRATIONS: {
  key: keyof typeof features;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "supabase",
    label: "Supabase",
    description: "Database & authentication",
    icon: <Database className="h-4 w-4" />,
  },
  {
    key: "ai",
    label: "Anthropic",
    description: "AI agent & content generation",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    key: "billing",
    label: "Stripe",
    description: "Subscription billing",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    key: "email",
    label: "Resend",
    description: "Transactional & follow-up email",
    icon: <Mail className="h-4 w-4" />,
  },
  {
    key: "sms",
    label: "Twilio",
    description: "SMS lead follow-up",
    icon: <MessageSquare className="h-4 w-4" />,
  },
];

export default async function SettingsPage() {
  const user = await getSessionUser();
  const email = user?.email ?? "you@youragency.com";

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your profile, integrations, and account."
      />

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultEmail={email} />
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {INTEGRATIONS.map((it) => {
              const live = features[it.key];
              return (
                <div
                  key={it.key}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-foreground">
                      {it.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{it.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {it.description}
                      </p>
                    </div>
                  </div>
                  <Badge tone={live ? "success" : "muted"}>
                    {live ? "Live" : "Demo"}
                  </Badge>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Integrations marked &quot;Demo&quot; run on sample data. Add the
            matching API keys to your environment to switch them live.
          </p>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-muted-foreground">
                End your session on this device.
              </p>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="outline">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
