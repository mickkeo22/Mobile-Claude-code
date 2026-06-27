import Link from "next/link";
import { Sparkles, Check } from "lucide-react";
import { env } from "@/lib/env";

const valueProps = [
  "A 24/7 AI support agent that never misses a lead",
  "Instant follow-up and content automation on autopilot",
  "Your whole back-office, running while you sleep",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form column */}
      <main className="flex flex-col">
        <header className="p-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            {env.appName}
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>

      {/* Branded panel — hidden on mobile */}
      <aside className="gradient-mesh relative hidden flex-col justify-between border-l border-border bg-card p-12 lg:flex">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          {env.appName}
        </Link>

        <div className="max-w-md">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight">
            The AI agency operating platform for small businesses.
          </h2>
          <ul className="mt-8 space-y-4">
            {valueProps.map((prop) => (
              <li key={prop} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-muted-foreground">{prop}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {env.appName}. All rights reserved.
        </p>
      </aside>
    </div>
  );
}
