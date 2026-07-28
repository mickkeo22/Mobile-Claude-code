import { safeFetch, HUMAN_UA, normaliseDomain, assertPublicHost, isSoft404 } from './fetcher'
import { parseRobots, mentionsAgent, type ParsedRobots } from './robots'
import { CRAWLERS, probeCrawler, reasonLabel, isHardBlock } from './crawlers'
import { extractFacts, emptyFacts } from './page'
import type { AuditResult, CrawlerProbe, Finding, Evidence } from './types'

const WEIGHTS = {
  'ai-crawler-access': 34,
  'server-rendered': 16,
  'robots-ai-rules': 14,
  'structured-data': 14,
  answerability: 12,
  'crawl-hygiene': 6,
  'llms-txt': 4,
} as const

/** Crawlers whose loss is business-critical rather than merely unfortunate. */
const MAJOR = new Set(['gptbot', 'oai-searchbot', 'chatgpt-user', 'claudebot'])

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

/** "A", "A and B", "A, B and C" */
function joinList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function gradeFor(score: number): AuditResult['grade'] {
  if (score >= 90) return 'A'
  if (score >= 78) return 'B'
  if (score >= 62) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

export async function runAudit(rawInput: string): Promise<AuditResult> {
  const started = Date.now()
  const norm = normaliseDomain(rawInput)
  if ('error' in norm) throw new AuditInputError(norm.error)
  const domain = norm.domain

  const hostError = await assertPublicHost(domain)
  if (hostError) throw new AuditInputError(hostError)

  const origin = `https://${domain}/`

  // The browser's view is the control for every comparison that follows.
  const human = await safeFetch(origin, HUMAN_UA, 11_000)

  const [robotsRes, llmsRes, sitemapRes] = await Promise.all([
    safeFetch(`https://${domain}/robots.txt`, HUMAN_UA, 7_000),
    safeFetch(`https://${domain}/llms.txt`, HUMAN_UA, 7_000),
    safeFetch(`https://${domain}/sitemap.xml`, HUMAN_UA, 7_000),
  ])

  const robotsFound = robotsRes.ok && robotsRes.status === 200 && !isSoft404(robotsRes, true)
  const robotsBody = robotsFound ? robotsRes.body : ''
  const parsed: ParsedRobots | null = robotsFound ? parseRobots(robotsBody) : null

  const probes = await Promise.all(
    CRAWLERS.map(async (def) => {
      const r = await probeCrawler(origin, def, human, parsed)
      const probe: CrawlerProbe = {
        key: def.key,
        name: def.name,
        operator: def.operator,
        powers: def.powers,
        status: r.status,
        error: r.error,
        blocked: r.blockedVsHuman,
        blockedVsHuman: r.blockedVsHuman,
        robotsDisallowed: r.robotsDisallowed,
        bytes: r.bytes,
      }
      return { probe, reason: r.reason, def }
    }),
  )

  const crawlers = probes.map((p) => p.probe)
  const facts = human.ok ? extractFacts(human) : emptyFacts()
  const reachable = human.ok && human.status !== null && human.status >= 200 && human.status < 400

  const llmsFound = llmsRes.ok && llmsRes.status === 200 && !isSoft404(llmsRes, true)
  const sitemapFound =
    sitemapRes.ok && sitemapRes.status === 200 && /<(urlset|sitemapindex)/i.test(sitemapRes.body)
  const sitemapUrls = sitemapFound ? (sitemapRes.body.match(/<loc>/gi) || []).length : 0

  const findings: Finding[] = []

  // ── 1. AI crawler access ────────────────────────────────────────────────
  {
    const blocked = probes.filter((p) => p.probe.blocked)
    const majorBlocked = blocked.filter((p) => MAJOR.has(p.def.key))
    const evidence: Evidence[] = probes.map((p) => ({
      label: `${p.probe.name} (${p.probe.operator})`,
      value:
        p.def.probe === 'robots'
          ? p.probe.blocked
            ? 'Blocked in robots.txt'
            : 'Allowed'
          : p.probe.blocked
            ? `${reasonLabel(p.reason)}${p.probe.status ? ` — HTTP ${p.probe.status}` : ''}`
            : `Allowed — HTTP ${p.probe.status ?? '—'}`,
      state: p.probe.blocked ? 'bad' : 'good',
    }))
    evidence.unshift({
      label: 'Real browser (control)',
      value: reachable ? `Allowed — HTTP ${human.status}` : `Failed — ${human.error ?? `HTTP ${human.status}`}`,
      state: reachable ? 'good' : 'warn',
    })

    const earned = clamp01(1 - blocked.length / probes.length)
    const majorHard = majorBlocked.filter((p) => isHardBlock(p.reason))
    const severity = majorHard.length > 0 ? 'critical' : blocked.length > 0 ? 'warning' : 'pass'

    findings.push({
      id: 'ai-crawler-access',
      title: 'AI crawler access',
      severity,
      earned,
      weight: WEIGHTS['ai-crawler-access'],
      summary:
        blocked.length === 0
          ? 'Every major AI crawler can reach your site.'
          : `${blocked.length} of ${probes.length} AI crawlers ${blocked.length === 1 ? 'is' : 'are'} blocked — ${joinList(
              blocked.map((b) => b.probe.name),
            )}.`,
      detail:
        blocked.length === 0
          ? 'We requested your homepage as each AI crawler and compared the response to a real browser. Every one of them received your content.'
          : 'We requested your homepage once as a real browser and once as each AI crawler. Your server answered the browser but turned these crawlers away. This usually comes from a CDN or firewall bot rule (Cloudflare, for example) rather than anything in your robots.txt — which is why it is almost always invisible to the site owner. A blocked crawler cannot read your business, so the assistant it powers answers with a competitor instead.',
      evidence,
    })
  }

  // ── 2. robots.txt AI rules ──────────────────────────────────────────────
  {
    const evidence: Evidence[] = []
    let earned: number
    let severity: Finding['severity']
    let summary: string

    if (!robotsFound) {
      earned = 0.55
      severity = 'warning'
      summary = 'No robots.txt found — crawlers are allowed by default, but you have no explicit control.'
      evidence.push({
        label: '/robots.txt',
        value: robotsRes.status ? `HTTP ${robotsRes.status}` : (robotsRes.error ?? 'Not found'),
        state: 'warn',
      })
    } else {
      const disallowed = CRAWLERS.filter((c) => parsed && crawlers.find((p) => p.key === c.key)?.robotsDisallowed)
      const named = CRAWLERS.filter((c) => parsed && mentionsAgent(parsed, c.token))
      evidence.push({ label: '/robots.txt', value: `Found — ${robotsRes.bytes} bytes`, state: 'good' })
      evidence.push({
        label: 'AI crawlers named explicitly',
        value: named.length ? named.map((n) => n.name).join(', ') : 'None',
        state: named.length ? 'good' : 'neutral',
      })
      evidence.push({
        label: 'AI crawlers disallowed',
        value: disallowed.length ? disallowed.map((d) => d.name).join(', ') : 'None',
        state: disallowed.length ? 'bad' : 'good',
      })
      if (parsed?.sitemaps.length) {
        evidence.push({ label: 'Sitemap declared', value: parsed.sitemaps[0], state: 'good' })
      } else {
        evidence.push({ label: 'Sitemap declared', value: 'No Sitemap: line', state: 'warn' })
      }
      earned = clamp01(0.55 + (disallowed.length ? 0 : 0.3) + (parsed?.sitemaps.length ? 0.15 : 0))
      severity = disallowed.length ? 'critical' : 'pass'
      summary = disallowed.length
        ? `robots.txt explicitly blocks ${disallowed.map((d) => d.name).join(', ')}.`
        : 'robots.txt does not block any AI crawler.'
    }

    findings.push({
      id: 'robots-ai-rules',
      title: 'robots.txt rules',
      severity,
      earned,
      weight: WEIGHTS['robots-ai-rules'],
      summary,
      detail:
        'robots.txt is where you grant or revoke AI crawler permission on the record. Google-Extended and Applebot-Extended have no separate crawler — robots.txt is the only way to signal them, so an explicit allow is the only way to be certain.',
      evidence,
    })
  }

  // ── 3. Server-rendered content ──────────────────────────────────────────
  {
    const w = facts.words
    const earned = w >= 400 ? 1 : w >= 200 ? 0.7 : w >= 80 ? 0.4 : w > 0 ? 0.15 : 0
    const shell = w < 80 && facts.htmlBytes > 25_000
    const severity: Finding['severity'] = !reachable ? 'warning' : shell ? 'critical' : w < 200 ? 'warning' : 'pass'
    findings.push({
      id: 'server-rendered',
      title: 'Readable without JavaScript',
      severity,
      earned,
      weight: WEIGHTS['server-rendered'],
      summary: shell
        ? 'Your homepage sends almost no text until JavaScript runs — AI crawlers see a blank page.'
        : w >= 400
          ? `${w.toLocaleString()} words of text are readable in the raw HTML.`
          : `Only ${w.toLocaleString()} words are readable without JavaScript.`,
      detail:
        'AI crawlers generally do not execute JavaScript. Whatever is not in the HTML your server sends is, for practical purposes, invisible to them. A React or Wix site that renders client-side can look rich to a visitor and empty to ChatGPT.',
      evidence: [
        { label: 'Words in raw HTML', value: w.toLocaleString(), state: w >= 400 ? 'good' : w >= 200 ? 'warn' : 'bad' },
        { label: 'HTML size', value: `${(facts.htmlBytes / 1024).toFixed(0)} KB` },
        {
          label: 'Text-to-markup ratio',
          value: `${(facts.textRatio * 100).toFixed(1)}%`,
          state: facts.textRatio > 0.05 ? 'good' : 'warn',
        },
        ...(facts.generator ? [{ label: 'Built with', value: facts.generator } as Evidence] : []),
      ],
    })
  }

  // ── 4. Structured data ──────────────────────────────────────────────────
  {
    const valid = facts.jsonLd.filter((b) => b.valid)
    const invalid = facts.jsonLd.filter((b) => !b.valid)
    const hasEntity = facts.schemaTypes.some((t) => /Organization|LocalBusiness|Store|Restaurant|Contractor|Business|Professional|Medical|Dentist|Attorney/i.test(t))
    const hasRich = facts.schemaTypes.some((t) => /FAQPage|Product|Service|BreadcrumbList|Review|AggregateRating|OpeningHours/i.test(t))
    let earned = 0
    if (valid.length) earned += 0.4
    if (hasEntity) earned += 0.4
    if (hasRich) earned += 0.2
    if (invalid.length) earned = Math.min(earned, 0.5)
    const severity: Finding['severity'] = !valid.length ? 'warning' : invalid.length ? 'warning' : hasEntity ? 'pass' : 'warning'
    findings.push({
      id: 'structured-data',
      title: 'Structured data',
      severity,
      earned: clamp01(earned),
      weight: WEIGHTS['structured-data'],
      summary: !facts.jsonLd.length
        ? 'No structured data found — AI has to guess what your business is.'
        : hasEntity
          ? `Found ${facts.schemaTypes.slice(0, 3).join(', ')}${facts.schemaTypes.length > 3 ? '…' : ''}.`
          : 'Structured data exists but does not describe your business entity.',
      detail:
        'JSON-LD is the most unambiguous way to state what you do, where you are, and how to reach you. Assistants lean on it heavily because it needs no interpretation. Without an Organization or LocalBusiness block, your name, address, phone and hours have to be inferred from prose — and inference is where they get it wrong.',
      evidence: [
        { label: 'JSON-LD blocks', value: String(facts.jsonLd.length), state: facts.jsonLd.length ? 'good' : 'bad' },
        ...(invalid.length ? [{ label: 'Invalid blocks', value: String(invalid.length), state: 'bad' } as Evidence] : []),
        {
          label: 'Types declared',
          value: facts.schemaTypes.length ? facts.schemaTypes.join(', ') : 'None',
          state: hasEntity ? 'good' : 'warn',
        },
        { label: 'Business entity described', value: hasEntity ? 'Yes' : 'No', state: hasEntity ? 'good' : 'bad' },
      ],
    })
  }

  // ── 5. Answerability ────────────────────────────────────────────────────
  {
    const hasTitle = facts.title.length >= 10
    const hasDesc = facts.metaDescription.length >= 40
    const oneH1 = facts.h1.length === 1
    const hasHeadings = facts.headingCount >= 3
    const hasContact = facts.phones.length > 0 || facts.emails.length > 0
    const hasAddress = facts.addressHints.length > 0
    const hasFaq = facts.faqCount > 0
    const parts = [hasTitle, hasDesc, oneH1, hasHeadings, hasContact, hasAddress, hasFaq]
    const earned = parts.filter(Boolean).length / parts.length
    findings.push({
      id: 'answerability',
      title: 'Answer-ready content',
      severity: earned >= 0.72 ? 'pass' : earned >= 0.45 ? 'warning' : 'critical',
      earned,
      weight: WEIGHTS.answerability,
      summary:
        earned >= 0.72
          ? 'Your page gives assistants the facts they need to answer about you.'
          : 'Key facts an assistant needs are missing or hard to extract.',
      detail:
        'When someone asks an assistant for a recommendation, it needs quotable facts: who you are, what you do, where, how to contact you, and answers to common questions. Pages built purely as visual brochures give it nothing to quote.',
      evidence: [
        { label: 'Title tag', value: facts.title || 'Missing', state: hasTitle ? 'good' : 'bad' },
        { label: 'Meta description', value: hasDesc ? 'Present' : 'Missing or too short', state: hasDesc ? 'good' : 'bad' },
        {
          label: 'H1 heading',
          value: facts.h1.length === 0 ? 'Missing' : facts.h1.length === 1 ? facts.h1[0] : `${facts.h1.length} found (should be 1)`,
          state: oneH1 ? 'good' : 'warn',
        },
        { label: 'Section headings', value: String(facts.headingCount), state: hasHeadings ? 'good' : 'warn' },
        { label: 'Phone or email on page', value: hasContact ? [...facts.phones, ...facts.emails][0] : 'Not found', state: hasContact ? 'good' : 'bad' },
        { label: 'Street address on page', value: hasAddress ? facts.addressHints[0] : 'Not found', state: hasAddress ? 'good' : 'warn' },
        { label: 'FAQ-style questions', value: hasFaq ? `${facts.faqCount} found` : 'None', state: hasFaq ? 'good' : 'warn' },
      ],
    })
  }

  // ── 6. llms.txt ─────────────────────────────────────────────────────────
  findings.push({
    id: 'llms-txt',
    title: 'llms.txt',
    severity: llmsFound ? 'pass' : 'info',
    earned: llmsFound ? 1 : 0,
    weight: WEIGHTS['llms-txt'],
    summary: llmsFound ? 'An llms.txt file is published.' : 'No llms.txt — an easy way to hand AI a clean summary of your business.',
    detail:
      'llms.txt is an emerging convention: a plain-text file at your root that tells an assistant, in your own words, what your business is and which pages matter. It is not yet universally consumed, but it costs one file and it is the only place you get to state your own summary rather than have one inferred.',
    evidence: [
      { label: '/llms.txt', value: llmsFound ? 'Published' : 'Not found', state: llmsFound ? 'good' : 'neutral' },
    ],
  })

  // ── 7. Crawl hygiene ────────────────────────────────────────────────────
  {
    const parts = [!facts.noindex, facts.hasCanonical, sitemapFound, Boolean(facts.lang), facts.openGraph]
    const earned = facts.noindex ? 0 : parts.filter(Boolean).length / parts.length
    findings.push({
      id: 'crawl-hygiene',
      title: 'Crawl hygiene',
      severity: facts.noindex ? 'critical' : earned >= 0.7 ? 'pass' : 'warning',
      earned,
      weight: WEIGHTS['crawl-hygiene'],
      summary: facts.noindex
        ? 'Your homepage carries a noindex tag — you are asking search engines to ignore it.'
        : sitemapFound
          ? `Sitemap found with ${sitemapUrls.toLocaleString()} URLs.`
          : 'No sitemap.xml found at the standard location.',
      detail:
        'These are the plumbing signals crawlers use to find and trust your pages. A stray noindex tag is the single most damaging thing on this list, and it usually arrives by accident when a staging setting ships to production.',
      evidence: [
        { label: 'meta robots', value: facts.robotsMeta || 'Not set (fine)', state: facts.noindex ? 'bad' : 'good' },
        { label: 'Canonical URL', value: facts.hasCanonical ? 'Present' : 'Missing', state: facts.hasCanonical ? 'good' : 'warn' },
        { label: '/sitemap.xml', value: sitemapFound ? `${sitemapUrls.toLocaleString()} URLs` : 'Not found', state: sitemapFound ? 'good' : 'warn' },
        { label: 'Language declared', value: facts.lang || 'Missing', state: facts.lang ? 'good' : 'warn' },
        { label: 'Open Graph tags', value: facts.openGraph ? 'Present' : 'Missing', state: facts.openGraph ? 'good' : 'warn' },
      ],
    })
  }

  const totalWeight = findings.reduce((a, f) => a + f.weight, 0)
  const rawScore = Math.round((findings.reduce((a, f) => a + f.earned * f.weight, 0) / totalWeight) * 100)

  // Hard-blocked major crawlers dominate everything else. Immaculate schema
  // cannot offset a crawler that never receives a byte, so we put a ceiling on
  // the score rather than letting good markup average the problem away.
  const hardBlockedMajor = probes.filter((p) => MAJOR.has(p.def.key) && p.probe.blocked && isHardBlock(p.reason))
  let score = rawScore
  let scoreCap: AuditResult['scoreCap']
  if (hardBlockedMajor.length > 0 && reachable) {
    const cap = Math.max(22, 60 - 9 * hardBlockedMajor.length)
    if (cap < rawScore) {
      score = cap
      scoreCap = {
        cap,
        rawScore,
        reason: `${joinList(hardBlockedMajor.map((p) => p.probe.name))} ${
          hardBlockedMajor.length === 1 ? 'is' : 'are'
        } blocked outright. The rest of the site scored ${rawScore}, but an assistant that cannot fetch a single byte never sees any of it.`,
      }
    }
  }

  const blockedMajor = hardBlockedMajor.map((p) => p.probe)
  const headline = !reachable
    ? "We couldn't load your site"
    : blockedMajor.length > 0
      ? `${blockedMajor.length === 1 ? `${blockedMajor[0].name} is` : `${blockedMajor.length} major AI crawlers are`} blocked from your site`
      : score >= 90
        ? 'AI can see your business clearly'
        : score >= 62
          ? 'AI can reach you, but the picture is incomplete'
          : 'AI is missing most of what makes you worth recommending'

  const subhead = !reachable
    ? (human.error ?? `The server returned HTTP ${human.status}.`)
    : blockedMajor.length > 0
      ? `Your site loads fine in a browser, but ${joinList(blockedMajor.map((b) => b.name))} ${
          blockedMajor.length === 1 ? 'was' : 'were'
        } turned away. Anything they can't read, they can't recommend.`
      : `We ran ${findings.length} checks against ${domain} and scored what an AI assistant can actually learn about you.`

  return {
    domain,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    score,
    grade: gradeFor(score),
    headline,
    subhead,
    reachable,
    fatalError: reachable ? undefined : (human.error ?? `HTTP ${human.status}`),
    page: facts,
    robotsTxt: {
      found: robotsFound,
      status: robotsRes.status,
      body: robotsBody.slice(0, 8000),
      bytes: robotsRes.bytes,
    },
    llmsTxt: { found: llmsFound, status: llmsRes.status, bytes: llmsRes.bytes },
    sitemap: { found: sitemapFound, status: sitemapRes.status, urls: sitemapUrls },
    crawlers,
    humanBaseline: { status: human.status, bytes: human.bytes },
    findings,
    scoreCap,
  }
}

export class AuditInputError extends Error {}
export type { AuditResult } from './types'
