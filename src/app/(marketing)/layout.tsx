import Link from "next/link";
import { Sparkles, Twitter, Linkedin, Github } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { MobileNav } from "@/components/marketing/mobile-nav";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

const FOOTER_COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/services", label: "Services" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#how", label: "How it works" },
      { href: "/signup", label: "Start free" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/#testimonials", label: "Customers" },
      { href: "/contact", label: "Book a demo" },
      { href: "/contact", label: "Contact sales" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/#results", label: "Results" },
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Get started" },
    ],
  },
];

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className="text-lg">Aether</span>
    </Link>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-6">
          <Logo />

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/login" className={buttonClass("ghost", "sm")}>
              Log in
            </Link>
            <Link href="/signup" className={buttonClass("primary", "sm")}>
              Start free
            </Link>
          </div>

          <MobileNav />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="container py-16">
          <div className="grid gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
            <div className="max-w-xs">
              <Logo />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The AI growth platform for small business. Capture every lead,
                answer every customer, and automate the busywork — 24/7.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <a
                  href="https://twitter.com"
                  aria-label="Twitter"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="https://linkedin.com"
                  aria-label="LinkedIn"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="https://github.com"
                  aria-label="GitHub"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Github className="h-4 w-4" />
                </a>
              </div>
            </div>

            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <h4 className="text-sm font-semibold text-foreground">
                  {col.heading}
                </h4>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} Aether, Inc. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link href="/legal/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/legal/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/contact" className="hover:text-foreground">
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
