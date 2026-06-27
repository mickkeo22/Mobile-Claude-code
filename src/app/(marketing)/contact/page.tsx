import type { Metadata } from "next";
import { CalendarCheck, MessageSquare, Rocket, Clock } from "lucide-react";
import { Badge } from "@/components/ui";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Book a demo",
  description:
    "Book a personalized Aether demo or get in touch with our team. See how an always-on AI agent captures leads and answers customers for your small business.",
};

const EXPECT = [
  {
    icon: MessageSquare,
    title: "A real conversation",
    body: "No hard sell. We'll learn about your business, your busiest hours, and where leads slip through the cracks today.",
  },
  {
    icon: Rocket,
    title: "A live walkthrough",
    body: "See the AI agent answer questions, follow up on a lead, and book an appointment — using examples from your industry.",
  },
  {
    icon: CalendarCheck,
    title: "A clear next step",
    body: "Leave with a simple plan to go live, plus an honest answer on whether Aether is the right fit for your business.",
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="gradient-mesh">
        <div className="container py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-5">Book a demo</Badge>
            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              See Aether working for your business
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Tell us a little about your business and we&apos;ll show you exactly how
              an always-on AI agent captures more leads and answers more customers.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-20 md:pb-24">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            {/* What to expect */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                What to expect
              </h2>
              <p className="mt-3 text-muted-foreground">
                A focused 20-minute call, tailored to your business. Here&apos;s how
                it goes.
              </p>

              <ol className="mt-8 space-y-6">
                {EXPECT.map((item, i) => (
                  <li key={item.title} className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">
                        {i + 1}. {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-card p-5">
                <Clock className="h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">
                  We reply within{" "}
                  <span className="font-medium text-foreground">one business day</span>
                  . Prefer to skip the wait?{" "}
                  <span className="font-medium text-foreground">Start free</span> and
                  explore the product right now.
                </p>
              </div>
            </div>

            {/* Form */}
            <div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
