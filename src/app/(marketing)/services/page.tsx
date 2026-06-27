import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  Zap,
  PenLine,
  Workflow,
  LayoutDashboard,
  BarChart3,
  Check,
} from "lucide-react";
import { Section, Badge, buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore Aether's AI services for small business: a 24/7 support agent, instant lead follow-up, content automation, back-office automation, a unified dashboard, and analytics.",
};

interface ServiceDetail {
  icon: typeof MessageSquare;
  name: string;
  headline: string;
  body: string;
  bullets: string[];
  forWho: string;
}

const SERVICES: ServiceDetail[] = [
  {
    icon: MessageSquare,
    name: "AI Support Agent",
    headline: "A front desk that never sleeps",
    body: "Drop an agent on your website and SMS that answers questions, shares pricing and hours, and books appointments in natural conversation — trained on your business and speaking in your voice.",
    bullets: [
      "Embeddable chat widget plus two-way SMS",
      "Books appointments straight to your calendar",
      "Answers FAQs about services, pricing, and hours",
      "Knows when to hand off to a human",
    ],
    forWho: "Dental practices, clinics, salons, and gyms that field the same questions all day and can't afford to miss after-hours interest.",
  },
  {
    icon: Zap,
    name: "Instant Lead Follow-up",
    headline: "Win the lead by being first",
    body: "The moment a form is filled or a call is missed, Aether sends a personal email and text within two minutes — qualifying the lead and nudging them to book before a competitor ever picks up the phone.",
    bullets: [
      "Sub-two-minute first response, 24/7",
      "Personalized email + SMS sequences",
      "Automatic lead qualification & scoring",
      "Reconnects on missed calls automatically",
    ],
    forWho: "Plumbers, contractors, and home-service pros where the first business to respond almost always wins the job.",
  },
  {
    icon: PenLine,
    name: "Content & Social Automation",
    headline: "Stay visible without lifting a finger",
    body: "Generate on-brand social posts, promotions, and review responses on a set schedule. Aether keeps your business in front of customers while you focus on serving them.",
    bullets: [
      "Scheduled, on-brand social posts",
      "Seasonal offers and promo copy",
      "Automatic, thoughtful review replies",
      "Approve in one tap or fully automate",
    ],
    forWho: "Owners who know they should be posting but never find the time — salons, restaurants, boutiques, and studios.",
  },
  {
    icon: Workflow,
    name: "Back-office on Autopilot",
    headline: "Hand the busywork to AI",
    body: "Intake forms, appointment reminders, follow-up emails, and routine admin run themselves. Aether quietly handles the operational drag so your evenings come back to you.",
    bullets: [
      "Automated intake and onboarding flows",
      "Appointment and payment reminders",
      "Post-service follow-ups & review requests",
      "Routine email handled for you",
    ],
    forWho: "Any small team drowning in repetitive admin — law offices, clinics, and service businesses alike.",
  },
  {
    icon: LayoutDashboard,
    name: "Unified Client Dashboard",
    headline: "Your whole business at a glance",
    body: "Every lead, conversation, booking, and task lives in one clean dashboard. See what's happening in real time from your phone or laptop — no spreadsheets, no guesswork.",
    bullets: [
      "Live feed of leads and conversations",
      "Pipeline and booking status in one view",
      "Mobile-friendly for on-the-go owners",
      "Manage multiple locations or clients",
    ],
    forWho: "Multi-location owners and agencies managing several businesses who need one source of truth.",
  },
  {
    icon: BarChart3,
    name: "Analytics & Reporting",
    headline: "Proof your marketing is working",
    body: "Automatic weekly reports show leads captured, response times, conversations handled, and revenue influenced — clear proof of ROI, delivered to your inbox without you asking.",
    bullets: [
      "Automated weekly performance reports",
      "Response time & conversion tracking",
      "Revenue-influenced attribution",
      "Shareable, white-label-ready summaries",
    ],
    forWho: "Owners and agencies who want hard numbers on what's working — and clients who want to see results.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="gradient-mesh">
        <div className="container py-20 text-center md:py-24">
          <Badge className="mb-5">Services</Badge>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Every system your business needs to grow — powered by AI
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Six services that work together to capture leads, answer customers, and
            run the back office, so nothing slips through the cracks.
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
      </section>

      <Section>
        <div className="container space-y-6">
          {SERVICES.map((service, i) => (
            <div
              key={service.name}
              className="grid items-center gap-8 rounded-3xl border border-border bg-card p-8 shadow-sm md:grid-cols-2 md:p-10"
            >
              <div className={i % 2 === 1 ? "md:order-2" : undefined}>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <service.icon className="h-5 w-5" />
                  </span>
                  <Badge tone="muted">{service.name}</Badge>
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {service.headline}
                </h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {service.body}
                </p>
                <p className="mt-5 text-sm">
                  <span className="font-semibold text-foreground">Who it&apos;s for: </span>
                  <span className="text-muted-foreground">{service.forWho}</span>
                </p>
              </div>

              <div className={i % 2 === 1 ? "md:order-1" : undefined}>
                <ul className="grid gap-3 rounded-2xl border border-border bg-background p-6">
                  {service.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <section className="pb-20 md:pb-24">
        <div className="container">
          <div className="gradient-mesh rounded-3xl border border-border bg-card px-8 py-14 text-center shadow-sm md:px-16">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to put it all to work?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Spin up your first AI agent in minutes and see the difference an
              always-on team makes.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup" className={buttonClass("primary", "lg")}>
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className={buttonClass("outline", "lg")}>
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
