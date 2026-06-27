import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  MessageSquare,
  Zap,
  PenLine,
  Workflow,
  LayoutDashboard,
  BarChart3,
  Clock,
  PhoneCall,
  CalendarCheck,
  Star,
  Check,
  PlugZap,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import { Section, StatCard, Badge, buttonClass } from "@/components/ui";
import { PricingCards } from "@/components/marketing/pricing-cards";

export const metadata: Metadata = {
  title: "AI that captures every lead & answers every customer 24/7",
  description:
    "Aether gives small businesses an always-on AI team: a 24/7 support agent, instant lead follow-up in under two minutes, content automation, and back-office on autopilot. Start free.",
};

const SERVICES = [
  {
    icon: MessageSquare,
    title: "AI Support Agent",
    body: "An always-on agent answers questions, books appointments, and qualifies visitors on your website and SMS — in your voice, around the clock.",
  },
  {
    icon: Zap,
    title: "Instant Lead Follow-up",
    body: "New lead comes in, Aether replies in under two minutes by email and text. The business that responds first wins the job.",
  },
  {
    icon: PenLine,
    title: "Content & Social Automation",
    body: "Generate on-brand posts, offers, and review responses on a schedule — so your business stays visible without the daily grind.",
  },
  {
    icon: Workflow,
    title: "Back-office on Autopilot",
    body: "Intake forms, reminders, follow-ups, and routine email all run themselves, so you spend your hours on customers, not admin.",
  },
  {
    icon: LayoutDashboard,
    title: "Unified Client Dashboard",
    body: "Every lead, conversation, and booking in one clean place. Know exactly what's working at a glance, from any device.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    body: "Automatic weekly reports show leads captured, response times, and revenue influenced — proof your marketing is paying off.",
  },
];

const STEPS = [
  {
    icon: PlugZap,
    title: "Connect your client",
    body: "Add your website, phone number, and inbox in a few clicks. No code, no developers, no month-long onboarding.",
  },
  {
    icon: GraduationCap,
    title: "Train the AI",
    body: "Aether learns your services, pricing, hours, and FAQs from your site. Tweak its tone and guardrails in plain English.",
  },
  {
    icon: TrendingUp,
    title: "Watch leads convert",
    body: "Go live and let the agent answer, follow up, and book — while you watch every captured opportunity roll into your dashboard.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "We used to lose every call that came in after 5pm. Now Aether books them straight onto our calendar. It's like hiring a front desk that never sleeps.",
    name: "Dr. Maria Chen",
    role: "Owner, Brightsmile Dental",
  },
  {
    quote:
      "A lead used to sit in my inbox until I got off a job. Aether texts them back in seconds. We've booked three extra installs a week since switching.",
    name: "Tom Reyes",
    role: "Reyes Plumbing & Heating",
  },
  {
    quote:
      "I'm a one-woman salon and I can't answer the phone mid-cut. Aether handles the questions and fills my chair. My no-show rate is way down too.",
    name: "Aisha Okafor",
    role: "Founder, Luxe Hair Studio",
  },
];

const TRUST_BRANDS = [
  "Brightsmile Dental",
  "Reyes Plumbing",
  "Luxe Hair Studio",
  "Summit Law",
  "IronPeak Gym",
  "Maple Family Clinic",
];

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="gradient-mesh relative overflow-hidden">
        <div className="container grid items-center gap-12 py-20 md:py-28 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-in">
            <Badge className="mb-5">
              <Sparkles className="h-3 w-3" />
              The AI growth platform for small business
            </Badge>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Capture every lead. Answer every customer.{" "}
              <span className="text-primary">24 hours a day.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Aether is the always-on AI team for your business. It replies to new
              leads in under two minutes, answers customer questions around the
              clock, and books the work — so you never miss another opportunity.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={buttonClass("primary", "lg")}>
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#how" className={buttonClass("outline", "lg")}>
                See how it works
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary" />
              No credit card required · Live in minutes · Cancel anytime
            </p>
          </div>

          {/* Mocked product preview cluster */}
          <div className="relative animate-fade-in lg:h-[460px]">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* ── Trust bar ────────────────────────────────────────── */}
      <div className="border-y border-border bg-card/50">
        <div className="container py-10">
          <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Trusted by local businesses everywhere
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {TRUST_BRANDS.map((brand) => (
              <span
                key={brand}
                className="text-base font-semibold tracking-tight text-muted-foreground/70"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Problem → Solution ───────────────────────────────── */}
      <Section>
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-8">
              <Badge tone="danger" className="mb-4">
                The problem
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight">
                Every missed message is money walking out the door.
              </h2>
              <ul className="mt-6 space-y-4 text-muted-foreground">
                {[
                  "78% of customers buy from the business that responds first — and most leads go cold within five minutes.",
                  "Calls after hours, during a job, or mid-appointment go to voicemail and never call back.",
                  "Marketing, follow-ups, and admin eat the evenings you'd rather spend anywhere else.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-accent/40 p-8 ring-1 ring-primary/20">
              <Badge tone="success" className="mb-4">
                The solution
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight">
                An AI team that never clocks out.
              </h2>
              <ul className="mt-6 space-y-4 text-muted-foreground">
                {[
                  "Aether answers every visitor instantly and books appointments straight onto your calendar.",
                  "New leads get a personal reply by text and email in under two minutes, day or night.",
                  "Content, reminders, and busywork run on autopilot — you just show up to the booked work.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Services / features grid ─────────────────────────── */}
      <Section className="bg-card/40 py-20 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4">Everything in one place</Badge>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              One platform that does the work of a whole team
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Six AI-powered systems working together to capture, convert, and keep
              your customers.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <div
                key={service.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <service.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/services" className={buttonClass("outline", "md")}>
              Explore every service
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* ── How it works ─────────────────────────────────────── */}
      <Section id="how">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4">How it works</Badge>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Live in minutes, not months
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No developers. No long onboarding. Three steps and your AI is working.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-2xl border border-border bg-card p-7 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Results / ROI ────────────────────────────────────── */}
      <Section id="results" className="bg-card/40 py-20 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge tone="success" className="mb-4">
              The results
            </Badge>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Faster responses. More booked work.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              What teams typically see after switching to an always-on AI front
              desk.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Coverage"
              value="24/7"
              hint="Never miss an after-hours lead again"
              icon={<Clock className="h-4 w-4" />}
            />
            <StatCard
              label="Lead follow-up"
              value="<2 min"
              hint="Average first response, day or night"
              icon={<Zap className="h-4 w-4" />}
            />
            <StatCard
              label="Booked calls"
              value="3×"
              hint="More qualified calls on the calendar"
              icon={<CalendarCheck className="h-4 w-4" />}
            />
            <StatCard
              label="Hours saved"
              value="12+ / wk"
              hint="Reclaimed from manual follow-up & admin"
              icon={<PhoneCall className="h-4 w-4" />}
            />
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Figures are illustrative and represent typical outcomes; your results
            will vary by business and market.
          </p>
        </div>
      </Section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <Section id="testimonials">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4">Loved by owners</Badge>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Small businesses, real momentum
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
              >
                <div className="flex gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-foreground">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Pricing teaser ───────────────────────────────────── */}
      <Section className="bg-card/40 py-20 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4">Simple pricing</Badge>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Plans that scale with your book of business
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free, then pick a plan when you&apos;re ready. No contracts,
              cancel anytime.
            </p>
          </div>

          <PricingCards className="mt-14" />

          <div className="mt-10 text-center">
            <Link href="/pricing" className={buttonClass("outline", "md")}>
              Compare full plans & FAQ
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* ── Final CTA band ───────────────────────────────────── */}
      <section className="py-20 md:py-24">
        <div className="container">
          <div className="gradient-mesh relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 text-center shadow-sm md:px-16">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Stop losing customers to a missed message.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Put an always-on AI team to work for your business today. It takes a
              few minutes to set up — and it pays for itself with the first booked
              job.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup" className={buttonClass("primary", "lg")}>
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact" className={buttonClass("outline", "lg")}>
                Book a demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Mocked product preview (pure markup, no images) ───────── */
function HeroPreview() {
  return (
    <div className="relative mx-auto max-w-md lg:max-w-none">
      {/* Chat widget */}
      <div className="glass rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-border/60 pb-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Aether Assistant</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online · replies instantly
            </p>
          </div>
        </div>
        <div className="space-y-2.5 py-3">
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2 text-sm">
            Hi! Do you have any openings this Saturday?
          </div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
            We do — 10:30am or 2:15pm are open. Want me to book one for you?
          </div>
          <div className="max-w-[60%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2 text-sm">
            10:30 works!
          </div>
        </div>
      </div>

      {/* Lead card */}
      <div className="absolute -bottom-6 -left-4 w-60 rounded-2xl border border-border bg-card p-4 shadow-xl sm:-left-8">
        <div className="flex items-center justify-between">
          <Badge tone="success">New lead</Badge>
          <span className="text-xs text-muted-foreground">just now</span>
        </div>
        <p className="mt-3 text-sm font-semibold">Jamie Patel</p>
        <p className="text-xs text-muted-foreground">Saturday · 10:30am booked</p>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
          <Zap className="h-3.5 w-3.5" />
          Replied in 41 seconds
        </div>
      </div>

      {/* Stat chip */}
      <div className="absolute -right-2 top-4 w-44 rounded-2xl border border-border bg-card p-4 shadow-xl sm:-right-6">
        <p className="text-xs text-muted-foreground">Leads this week</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">37</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="h-3.5 w-3.5" />
          +24% vs last week
        </p>
      </div>
    </div>
  );
}
