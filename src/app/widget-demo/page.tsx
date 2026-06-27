import type { Metadata } from "next";
import Script from "next/script";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Widget Demo",
  description:
    "See the Aether embeddable AI chat widget live, and grab the one-line install snippet for your own site.",
};

const DEMO_CLIENT = "brightside-dental";

export default function WidgetDemoPage() {
  const snippet = `<script src="${env.appUrl}/widget.js" data-client="your-client-slug" async></script>`;

  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "64px 24px 160px",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#111",
        lineHeight: 1.6,
      }}
    >
      <p
        style={{
          textTransform: "uppercase",
          letterSpacing: 1,
          fontSize: 12,
          color: "#6366f1",
          fontWeight: 600,
        }}
      >
        {env.appName} · Embeddable Widget
      </p>
      <h1 style={{ fontSize: 38, lineHeight: 1.15, margin: "8px 0 16px" }}>
        A 24/7 AI assistant on any website in one line.
      </h1>
      <p style={{ fontSize: 18, color: "#444" }}>
        The live widget for <strong>Brightside Dental</strong> is loaded on this
        page. Look for the chat bubble in the bottom-right corner, open it, and
        ask something like <em>&ldquo;Do you offer Invisalign?&rdquo;</em> It
        streams replies in real time, themed to the client&rsquo;s brand color.
      </p>

      <h2 style={{ fontSize: 24, marginTop: 40 }}>Install it</h2>
      <p>
        Drop this snippet right before the closing{" "}
        <code style={codeInline}>&lt;/body&gt;</code> tag on the client&rsquo;s
        site. Swap <code style={codeInline}>data-client</code> for their
        workspace slug.
      </p>
      <pre style={codeBlock}>
        <code>{snippet}</code>
      </pre>

      <h2 style={{ fontSize: 24, marginTop: 40 }}>How it works</h2>
      <ul style={{ paddingLeft: 20 }}>
        <li>
          On load it fetches{" "}
          <code style={codeInline}>/api/widget/config</code> for the
          client&rsquo;s name, brand color, and greeting.
        </li>
        <li>
          Each message POSTs to <code style={codeInline}>/api/widget/chat</code>,
          which grounds replies in the client&rsquo;s knowledge base and streams
          the answer back token-by-token.
        </li>
        <li>
          It&rsquo;s self-contained vanilla JS in a shadow DOM, so it never
          clashes with the host site&rsquo;s styles.
        </li>
      </ul>

      <p style={{ marginTop: 40, color: "#666", fontSize: 14 }}>
        This demo embeds <code style={codeInline}>{DEMO_CLIENT}</code>. In demo
        mode (no Anthropic key) replies are sensible canned responses; add a key
        to go fully live.
      </p>

      <Script
        src="/widget.js"
        data-client={DEMO_CLIENT}
        strategy="afterInteractive"
      />
    </main>
  );
}

const codeInline: React.CSSProperties = {
  background: "#f1f1f4",
  borderRadius: 4,
  padding: "1px 6px",
  fontSize: 14,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const codeBlock: React.CSSProperties = {
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 10,
  padding: 16,
  overflowX: "auto",
  fontSize: 14,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};
