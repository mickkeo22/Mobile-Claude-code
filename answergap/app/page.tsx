import ScanForm from '@/components/ScanForm'
import { CRAWLERS } from '@/lib/audit/crawlers'

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section id="scan" className="wrap pt-16 pb-14 sm:pt-24 sm:pb-20">
        <div className="max-w-3xl">
          <span className="chip text-pulse-300">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-pulse-400" />
            Live crawler test · no signup
          </span>

          <h1 className="mt-6 text-[2.1rem] font-semibold leading-[1.08] tracking-tight sm:text-[3.3rem]">
            Your website works fine.
            <br />
            <span className="text-pulse-400">ChatGPT still can&rsquo;t read it.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
            More and more customers ask an assistant for a recommendation instead of searching. But a
            lot of sites quietly turn those assistants away at the door — usually a firewall setting
            nobody remembers switching on. The site loads perfectly in your browser, so nothing looks
            wrong.
          </p>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/60">
            We check by asking. We request your homepage as each AI crawler, then as a real browser,
            and compare what comes back.
          </p>

          <div className="mt-9 max-w-xl">
            <ScanForm autoFocus />
          </div>
        </div>
      </section>

      {/* Proof — a real, anonymised result */}
      <section className="wrap pb-20">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3.5 sm:px-7">
            <p className="label">A real result — HVAC company, 40 years in business</p>
            <span className="chip border-flare-500/30 bg-flare-500/10 text-flare-300">Score 33 / F</span>
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            <div className="border-b border-white/[0.07] p-5 sm:border-b-0 sm:border-r sm:p-7">
              <p className="label mb-3">What they did right</p>
              <ul className="space-y-2.5 text-sm text-white/65">
                {[
                  '1,478 words of real, server-rendered content',
                  'LocalBusiness + Organization schema, correctly marked up',
                  'Sitemap with 29 URLs, llms.txt published',
                  'robots.txt blocks nothing at all',
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <Tick />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-white/40">
                By every ordinary SEO measure, this site is in good shape.
              </p>
            </div>
            <div className="p-5 sm:p-7">
              <p className="label mb-3">What we actually measured</p>
              <div className="space-y-1.5 font-mono text-[0.8rem]">
                <Row agent="Real browser" status="200" ok />
                <Row agent="GPTBot" status="403" />
                <Row agent="OAI-SearchBot" status="403" />
                <Row agent="ClaudeBot" status="403" />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/55">
                Their CDN was returning <span className="font-mono text-flare-300">403 Forbidden</span> to
                OpenAI and Anthropic. Nothing in their robots.txt said so, and the site looked perfect
                in a browser — so nobody knew. To ChatGPT, this business does not exist.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What we check */}
      <section className="wrap pb-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What the scan covers</h2>
        <p className="mt-3 max-w-2xl text-white/55">
          Seven checks, all measured live against your real site. Nothing is estimated or inferred
          from a database.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            {
              h: 'AI crawler access',
              p: `We request your homepage as ${CRAWLERS.length} AI crawlers and compare each response to a real browser. This is the check that catches firewall blocks nothing else sees.`,
              accent: true,
            },
            {
              h: 'Readable without JavaScript',
              p: 'AI crawlers generally do not run JavaScript. We measure how much of your page exists in the raw HTML your server sends.',
            },
            {
              h: 'robots.txt rules',
              p: 'Parsed properly, group by group. Google-Extended and Applebot-Extended have no crawler of their own — robots.txt is the only way to signal them.',
            },
            {
              h: 'Structured data',
              p: 'Whether your JSON-LD actually describes your business entity, and whether it parses at all. Broken markup is common and silent.',
            },
            {
              h: 'Answer-ready content',
              p: 'The facts an assistant needs to quote you: what you do, where, hours, contact details, and answers to the questions people actually ask.',
            },
            {
              h: 'Crawl hygiene',
              p: 'Stray noindex tags, missing canonicals, absent sitemaps. A noindex that shipped from staging is the most expensive typo on the web.',
            },
          ].map((c) => (
            <div
              key={c.h}
              className={`card p-5 sm:p-6 ${c.accent ? 'border-pulse-400/25 bg-pulse-400/[0.045]' : ''}`}
            >
              <h3 className="font-semibold tracking-tight">{c.h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{c.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Crawler list */}
      <section className="wrap pb-20">
        <div className="card p-5 sm:p-7">
          <p className="label">Crawlers tested</p>
          <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {CRAWLERS.map((c) => (
              <div key={c.key} className="flex items-baseline justify-between gap-3 border-b border-white/[0.05] pb-2.5">
                <div>
                  <span className="mono text-white/85">{c.name}</span>
                  <span className="ml-2 text-xs text-white/35">{c.operator}</span>
                </div>
                <span className="text-right text-xs text-white/45">{c.powers}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="wrap pb-8">
        <div className="card p-7 text-center sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Find out what AI sees when it looks you up
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/55">
            Free, instant, and no email required. If something is blocking you, you will know in about
            fifteen seconds.
          </p>
          <div className="mx-auto mt-7 max-w-lg">
            <ScanForm />
          </div>
        </div>
      </section>
    </>
  )
}

function Row({ agent, status, ok = false }: { agent: string; status: string; ok?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
        ok ? 'border-pulse-400/25 bg-pulse-400/[0.07]' : 'border-flare-500/25 bg-flare-500/[0.07]'
      }`}
    >
      <span className="text-white/75">{agent}</span>
      <span className={ok ? 'text-pulse-300' : 'text-flare-300'}>{status}</span>
    </div>
  )
}

function Tick() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 shrink-0" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="#3ed3a3" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
