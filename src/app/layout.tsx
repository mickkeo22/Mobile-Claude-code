import type { Metadata } from "next";
import "./globals.css";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: `${env.appName} — AI growth systems for small business`,
    template: `%s · ${env.appName}`,
  },
  description:
    "Aether is the all-in-one AI agency platform: a 24/7 support agent, instant lead follow-up, content automation, and back-office on autopilot — so small businesses never miss an opportunity.",
  openGraph: {
    title: `${env.appName} — AI growth systems for small business`,
    description:
      "Capture every lead, answer every visitor, and automate the busywork with AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">{children}</body>
    </html>
  );
}
