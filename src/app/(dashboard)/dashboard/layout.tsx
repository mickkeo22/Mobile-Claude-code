import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, LifeBuoy } from "lucide-react";
import { DashboardNav } from "@/components/dashboard-nav";
import { Badge } from "@/components/ui";
import { getSessionUser } from "@/lib/data";
import { features } from "@/lib/env";
import { initials } from "@/lib/utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold tracking-tight">Aether</span>
        </div>
        <div className="py-4">
          <DashboardNav />
        </div>
        <div className="mt-auto p-4">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-md p-2 hover:bg-secondary"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary">
              {initials(user.email || "You")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.email}</p>
              <p className="text-xs text-muted-foreground">Agency owner</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur">
          <div className="flex items-center gap-2 lg:hidden">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Aether</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {!features.supabase && (
              <Badge tone="warning">Demo mode — add keys to go live</Badge>
            )}
            <a
              href="https://code.claude.com/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <LifeBuoy className="h-4 w-4" />
              Help
            </a>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
