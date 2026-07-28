import ScanForm from '@/components/ScanForm'
import { CRAWLERS } from '@/lib/audit/crawlers'

export const metadata = {
  title: 'How the scan works',
  description: 'Exactly what AnswerGap measures, how it avoids false positives, and what it cannot tell you.',
}

export default function HowItWorks() {
  return (
    <div className="wrap py-12 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How the scan works</h1>
        <p className="mt-4 text-lg leading-relaxed text-white/60">
          Every number in your report is measured live, at the moment you run it. Nothing comes from a
          database, a cache, or an estimate.
        </p>
      </div>

      <div className="mt-10 space-y-5">
        <Block n="01" h="We fetch your homepage as a real browser first">
          This is the control. It tells us what your site returns to an ordinary visitor, and every
          other request is judged against it. Without a control, a site that refuses everyone would
          look like a site that refuses AI — a false positive we specifically avoid.
        </Block>

        <Block n="02" h={`We request the same page as ${CRAWLERS.filter((c) => c.probe === 'live').length} AI crawlers`}>
          Each request uses that crawler&rsquo;s real published user agent. We compare the status code and
          the response body to the browser control. A 403, a bot-challenge page, or a near-empty
          response where the browser got a full page all count as a block.
        </Block>

        <Block n="03" h="We treat rate limiting differently from refusal">
          A 429 usually means &ldquo;busy&rdquo;, not &ldquo;banned&rdquo;. When we see one we wait and try again before
          reporting anything, and a 429 never triggers the score cap that a hard 403 does.
        </Block>

        <Block n="04" h="We read robots.txt properly">
          Grouped by user-agent block, with Allow and Disallow resolved by longest-match and ties going
          to Allow, the way the specification says. Google-Extended and Applebot-Extended have no
          crawler of their own to test, so for those two, robots.txt is the only signal that exists —
          we report them from the file rather than pretending to probe them.
        </Block>

        <Block n="05" h="We measure the page the way a crawler sees it">
          AI crawlers generally do not execute JavaScript. So we count the words, headings, contact
          details and structured data present in the raw HTML your server sends — not in the rendered
          page your browser assembles afterwards.
        </Block>

        <Block n="06" h="A hard block puts a ceiling on the score">
          If a major crawler is refused outright, we cap the score and show you the uncapped number
          alongside it. Excellent markup cannot compensate for a crawler that never receives a single
          byte, and averaging the two together would hide the only thing that matters.
        </Block>
      </div>

      <div className="card mt-10 p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">What this scan cannot tell you</h2>
        <p className="mt-3 leading-relaxed text-white/60">
          We measure whether AI systems <em>can</em> read your site, and how clearly it describes your
          business. We do not claim to tell you whether a given assistant will recommend you on a given
          day — that depends on training data, retrieval, competitors and the wording of the question,
          none of which is observable from outside. Anyone selling you a guaranteed &ldquo;AI ranking&rdquo;
          number is guessing. Access and clarity are the parts you actually control, so those are the
          parts we measure.
        </p>
      </div>

      <div className="card mt-6 p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">Are we polite about it?</h2>
        <p className="mt-3 leading-relaxed text-white/60">
          A scan makes roughly a dozen requests to your server and stops. We identify ourselves, we do
          not crawl beyond the homepage plus three well-known files, and we rate-limit repeat scans.
        </p>
      </div>

      <div className="mt-12 max-w-lg">
        <ScanForm />
      </div>
    </div>
  )
}

function Block({ n, h, children }: { n: string; h: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 sm:p-7">
      <div className="flex gap-4">
        <span className="mono shrink-0 text-pulse-400">{n}</span>
        <div>
          <h2 className="font-semibold tracking-tight">{h}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{children}</p>
        </div>
      </div>
    </div>
  )
}
