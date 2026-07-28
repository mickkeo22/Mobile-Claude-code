export const metadata = { title: 'Terms & privacy' }

export default function Legal() {
  return (
    <div className="wrap py-12 sm:py-16">
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Terms &amp; privacy</h1>
          <p className="mt-3 text-white/50">Short, because there is not much to say.</p>
        </div>

        <Section h="What we store">
          Scans are run on demand and the results are returned straight to your browser. We do not keep
          a copy of your report. If you buy a Fix Pack, Stripe processes the payment and holds the
          billing details — we never see your card. Your report link re-runs the scan each time you
          open it, which is why it stays accurate.
        </Section>

        <Section h="What we request from your site">
          Your homepage, /robots.txt, /sitemap.xml and /llms.txt. Roughly a dozen requests per scan,
          identifying themselves honestly. We do not crawl further, submit forms, or attempt to access
          anything that is not publicly served.
        </Section>

        <Section h="Only scan sites you are responsible for">
          The tool works on any public site, but it is built for checking your own. Do not use it to
          hammer someone else&rsquo;s server.
        </Section>

        <Section h="Refunds">
          If the Fix Pack does not identify a real, actionable fix for your site, reply to your Stripe
          receipt and we will refund it. No argument.
        </Section>

        <Section h="Accuracy and limits">
          Results reflect what your server returned at the moment of the scan. Firewalls change, CDNs
          roll out rules, and a site can pass today and fail next week — that is precisely why the scan
          is free to re-run. We report what we measured; we do not predict whether any assistant will
          recommend you.
        </Section>

        <Section h="Contact">
          Reply to your receipt, or use the contact address on the site you purchased from.
        </Section>
      </div>
    </div>
  )
}

function Section({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{h}</h2>
      <p className="mt-2 leading-relaxed text-white/60">{children}</p>
    </div>
  )
}
