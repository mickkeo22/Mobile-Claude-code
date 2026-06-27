import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, RefreshCcw, Headphones, ArrowRight } from "lucide-react";
import { Section, Badge, buttonClass } from "@/components/ui";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { FaqAccordion, type FaqItem } from "@/components/marketing/faq-accordion";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for Aether. Start free, then pick a plan that scales with your book of business. No contracts, cancel anytime, money-back guarantee.",
};

const FAQ: FaqItem[] = [
  {
    question: "Do I need any technical skills to set this up?",
    answer:
      "None at all. If you can fill out a form, you can set up Aether. Connect your website, phone number, and inbox in a few clicks, and the AI trains itself on your business. Most owners are live the same day.",
  },
  {
    question: "How quickly does the AI respond to new leads?",
    answer:
      "Instantly. New website chats are answered in real time, and new leads from forms or missed calls get a personal email and text in under two minutes — any hour of the day or night.",
  },
  {
    question: "Will the AI sound like a robot?",
    answer:
      "No. Aether is trained on your services, tone, and FAQs, and you can shape its voice and guardrails in plain English. Customers get helpful, on-brand answers — and it hands off to you whenever a human touch is needed.",
  },
  {
    question: "Can I change or cancel my plan later?",
    answer:
      "Anytime. Upgrade, downgrade, or cancel from your dashboard with no contracts and no penalties. If you cancel, you keep access until the end of your billing period.",
  },
  {
    question: "What if I manage more than one business?",
    answer:
      "That's exactly what Aether is built for. Each plan includes multiple client workspaces, and the Scale plan adds a white-label client portal — perfect for agencies and multi-location owners.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. You can start free, no credit card required, and explore the platform before choosing a plan. Pick a paid plan whenever you're ready to go live with real customers.",
  },
];

const GUARANTEES = [
  {
    icon: RefreshCcw,
    title: "Cancel anytime",
    body: "No contracts, no lock-in. Leave whenever you like.",
  },
  {
    icon: ShieldCheck,
    title: "30-day money-back",
    body: "Not seeing value? Get a full refund in your first month.",
  },
  {
    icon: Headphones,
    title: "Real human support",
    body: "Onboarding help and friendly support whenever you need it.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="gradient-mesh">
        <div className="container py-20 text-center md:py-24">
          <Badge className="mb-5">Pricing</Badge>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Simple pricing that pays for itself
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Start free, then choose a plan that grows with your book of business.
            No contracts. Cancel anytime.
          </p>
        </div>
      </section>

      <Section className="pt-0">
        <div className="container">
          <PricingCards />

          <p className="mt-8 text-center text-sm text-muted-foreground">
            All plans include the AI support agent, instant lead follow-up, and your
            unified dashboard. Prices in USD, billed monthly.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {GUARANTEES.map((g) => (
              <div
                key={g.title}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <g.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{g.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{g.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="bg-card/40 pt-0">
        <div className="container max-w-3xl">
          <div className="text-center">
            <Badge className="mb-4">FAQ</Badge>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions, answered
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to know before you start.
            </p>
          </div>

          <div className="mt-10">
            <FaqAccordion items={FAQ} />
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Still have questions?{" "}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              Talk to our team
            </Link>
            .
          </p>
        </div>
      </Section>

      <section className="pb-20 md:pb-24">
        <div className="container">
          <div className="gradient-mesh rounded-3xl border border-border bg-card px-8 py-14 text-center shadow-sm md:px-16">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Try it free — pay when it&apos;s working for you
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              No credit card required to start. Set up your first AI agent in minutes.
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
