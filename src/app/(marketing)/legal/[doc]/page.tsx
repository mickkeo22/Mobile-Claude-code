import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";

/**
 * Lightweight legal pages (Privacy Policy, Terms of Service) so the site looks
 * complete enough to sign clients. These are sensible starting templates —
 * have them reviewed by counsel before relying on them.
 */

type Doc = { title: string; updated: string; sections: { h: string; p: string[] }[] };

const COMPANY = env.appName;
const CONTACT = "legal@youragency.com";

const DOCS: Record<string, Doc> = {
  privacy: {
    title: "Privacy Policy",
    updated: "June 27, 2026",
    sections: [
      {
        h: "Overview",
        p: [
          `${COMPANY} ("we", "us") provides AI-powered customer engagement, lead management, content, and automation tools to businesses. This policy explains what we collect and how we use it. It is a starting template — review with legal counsel before publishing.`,
        ],
      },
      {
        h: "Information we collect",
        p: [
          "Account information you provide (name, email, business details).",
          "Content you upload to power your AI agent (knowledge base, FAQs, policies).",
          "Conversations and leads generated through your embedded widget and forms.",
          "Usage and device data collected automatically to operate and secure the service.",
        ],
      },
      {
        h: "How we use information",
        p: [
          "To provide, maintain, and improve the service.",
          "To generate AI responses, qualify leads, and run the automations you enable.",
          "To process payments and communicate with you about your account.",
        ],
      },
      {
        h: "Sub-processors",
        p: [
          "We rely on trusted providers to operate Aether, which may include cloud hosting, our database provider, payment processing, AI model providers, and email/SMS delivery. Each processes data only as needed to deliver the service.",
        ],
      },
      {
        h: "Data retention & your rights",
        p: [
          "We retain data while your account is active and as required by law. You may request access, correction, or deletion of your data at any time.",
        ],
      },
      {
        h: "Contact",
        p: [`Questions about privacy? Email ${CONTACT}.`],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "June 27, 2026",
    sections: [
      {
        h: "Agreement",
        p: [
          `By using ${COMPANY} you agree to these terms. This is a starting template — review with legal counsel before publishing.`,
        ],
      },
      {
        h: "The service",
        p: [
          "Aether provides software for AI customer engagement, lead capture and follow-up, content generation, and business automations. Availability of specific features depends on your plan.",
        ],
      },
      {
        h: "Acceptable use",
        p: [
          "You agree not to use the service for unlawful, harmful, deceptive, or abusive purposes, and to ensure your use of AI-generated communications complies with applicable laws (including messaging and consumer-protection rules).",
        ],
      },
      {
        h: "Billing",
        p: [
          "Paid plans bill in advance on a recurring basis. You can cancel anytime; access continues through the end of the current billing period. Fees are non-refundable except where required by law or expressly stated.",
        ],
      },
      {
        h: "AI-generated content",
        p: [
          "AI output can be imperfect. You are responsible for reviewing AI-generated messages and content before relying on them. We provide the service without warranties of accuracy.",
        ],
      },
      {
        h: "Limitation of liability",
        p: [
          "To the maximum extent permitted by law, our liability is limited to the amount you paid for the service in the prior 12 months.",
        ],
      },
      {
        h: "Contact",
        p: [`Questions about these terms? Email ${CONTACT}.`],
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  const found = DOCS[doc];
  return { title: found ? found.title : "Legal" };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  const content = DOCS[doc];
  if (!content) notFound();

  return (
    <div className="container max-w-3xl py-16 md:py-24">
      <p className="text-sm text-muted-foreground">
        Last updated {content.updated}
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">{content.title}</h1>
      <div className="mt-10 space-y-10">
        {content.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-semibold">{s.h}</h2>
            <div className="mt-3 space-y-3 text-muted-foreground">
              {s.p.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-12 rounded-lg border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
        This document is a template provided for convenience and is not legal
        advice. Have it reviewed by a qualified attorney before relying on it.
      </p>
    </div>
  );
}
