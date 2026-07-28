import type { PageFacts } from './types'
import type { FetchOutcome } from './fetcher'

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, d) => {
      const code = Number(d)
      return code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : ''
    })
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return m ? decodeEntities(m[2] ?? m[3] ?? m[4] ?? '').trim() : ''
}

function metaContent(html: string, nameOrProp: string): string {
  const re = new RegExp(`<meta[^>]*(?:name|property)\\s*=\\s*["']${nameOrProp}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  return tag ? attr(tag, 'content') : ''
}

function collectTags(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')
  return [...html.matchAll(re)].map((m) => stripTags(m[1])).filter(Boolean)
}

function flattenTypes(node: unknown, acc: string[], depth = 0): void {
  if (!node || depth > 6) return
  if (Array.isArray(node)) {
    for (const n of node) flattenTypes(n, acc, depth + 1)
    return
  }
  if (typeof node !== 'object') return
  const obj = node as Record<string, unknown>
  const t = obj['@type']
  if (typeof t === 'string') acc.push(t)
  else if (Array.isArray(t)) for (const x of t) if (typeof x === 'string') acc.push(x)
  if (Array.isArray(obj['@graph'])) flattenTypes(obj['@graph'], acc, depth + 1)
  // Nested entities (e.g. mainEntity on an FAQPage) still count as coverage.
  for (const key of ['mainEntity', 'about', 'publisher', 'provider', 'itemListElement']) {
    if (obj[key]) flattenTypes(obj[key], acc, depth + 1)
  }
}

export function extractFacts(res: FetchOutcome): PageFacts {
  const html = res.body
  const scriptless = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  const bodyOnly = scriptless.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? scriptless
  const text = stripTags(bodyOnly)
  const words = text ? text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length : 0

  const jsonLd = [...html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => {
      const raw = m[1].trim()
      const types: string[] = []
      let valid = false
      try {
        // Strip CDATA wrappers some CMSs emit.
        const cleaned = raw.replace(/^\s*\/\/\s*<!\[CDATA\[/, '').replace(/\/\/\s*\]\]>\s*$/, '')
        const parsed = JSON.parse(cleaned)
        valid = true
        flattenTypes(parsed, types)
      } catch {
        valid = false
      }
      return { raw: raw.slice(0, 4000), valid, types }
    },
  )

  const schemaTypes = [...new Set(jsonLd.flatMap((b) => b.types))]

  const htmlTag = html.match(/<html[^>]*>/i)?.[0] ?? ''
  const robotsMeta = metaContent(html, 'robots')

  const emails = [
    ...new Set(
      (html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [])
        .map((e) => e.toLowerCase())
        .filter((e) => !/\.(png|jpe?g|gif|svg|webp|css|js)$/i.test(e))
        .filter((e) => !/^[0-9a-f]{16,}@/i.test(e)),
    ),
  ].slice(0, 5)

  const phones = [
    ...new Set(
      (text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g) || []).map((p) => p.trim()),
    ),
  ].slice(0, 5)

  const addressHints = [
    ...new Set(
      (text.match(
        /\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|suite|ste|highway|hwy|parkway|pkwy)\b\.?/gi,
      ) || []).map((a) => a.trim()),
    ),
  ].slice(0, 3)

  // "Phoenix, AZ 85016" — the city/state/zip most US sites put in the footer.
  const cityStateZip = text.match(
    /\b([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}),\s*([A-Z]{2})\.?\s+(\d{5})(?:-\d{4})?\b/,
  )

  const faqCount =
    (schemaTypes.includes('FAQPage') ? 1 : 0) +
    (html.match(/<(?:h[2-4]|summary|dt)[^>]*>\s*[^<]{6,140}\?\s*</gi) || []).length

  const h1 = collectTags(bodyOnly, 'h1')
  const h2 = collectTags(bodyOnly, 'h2')
  const headingCount = (bodyOnly.match(/<h[1-6][^>]*>/gi) || []).length

  return {
    finalUrl: res.finalUrl,
    status: res.status,
    server: res.headers['server'] || '',
    title: stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    metaDescription: metaContent(html, 'description'),
    h1,
    h2,
    headingCount,
    words,
    textSample: text.slice(0, 1200),
    jsonLd,
    schemaTypes,
    hasCanonical: /<link[^>]+rel\s*=\s*["']canonical["']/i.test(html),
    robotsMeta,
    noindex: /noindex/i.test(robotsMeta),
    htmlBytes: res.bytes,
    textRatio: res.bytes > 0 ? text.length / res.bytes : 0,
    emails,
    phones,
    addressHints,
    locality: cityStateZip?.[1] ?? '',
    region: cityStateZip?.[2] ?? '',
    postalCode: cityStateZip?.[3] ?? '',
    faqCount,
    openGraph: /<meta[^>]+property\s*=\s*["']og:/i.test(html),
    lang: attr(htmlTag, 'lang'),
    generator: metaContent(html, 'generator'),
  }
}

export function emptyFacts(): PageFacts {
  return {
    finalUrl: '',
    status: null,
    server: '',
    title: '',
    metaDescription: '',
    h1: [],
    h2: [],
    headingCount: 0,
    words: 0,
    textSample: '',
    jsonLd: [],
    schemaTypes: [],
    hasCanonical: false,
    robotsMeta: '',
    noindex: false,
    htmlBytes: 0,
    textRatio: 0,
    emails: [],
    phones: [],
    addressHints: [],
    locality: '',
    region: '',
    postalCode: '',
    faqCount: 0,
    openGraph: false,
    lang: '',
    generator: '',
  }
}

const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Drops the marketing tail sites bolt onto their name in the <title>. */
function tidyName(raw: string): string {
  return raw
    .replace(/\s*\b(since|est\.?|established)\s+\d{4}\b\.?/gi, '')
    .replace(/^[\s\-–—|·:"']+|[\s\-–—|·:"',.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Best-effort business name, used throughout the fix pack.
 *
 * Structured data wins when present — it is the one place the owner stated the
 * name deliberately. Otherwise we prefer the <title> segment that actually
 * resembles the domain, because the first segment is usually an SEO keyword
 * phrase ("Phoenix HVAC Company | Sun State HVAC") rather than the real name.
 */
export function guessBusinessName(facts: PageFacts, domain: string): string {
  const base = normKey(domain.split('.')[0])

  for (const type of [/LocalBusiness|Store|Restaurant|Contractor|Dentist|Attorney|Medical/i, /Organization/i]) {
    const block = facts.jsonLd.find((b) => b.valid && b.types.some((t) => type.test(t)))
    if (block) {
      const m = block.raw.match(/"name"\s*:\s*"([^"]{2,70})"/)
      const name = m ? tidyName(m[1]) : ''
      if (name.length >= 2) return name
    }
  }

  const segments = facts.title
    .split(/\s*[|–—·>]\s*|\s+-\s+/)
    .map(tidyName)
    .filter((s) => s.length >= 2 && s.length <= 60)

  // A segment whose letters match the domain is almost always the real name.
  const matching = segments.find((s) => {
    const k = normKey(s)
    return k.length > 2 && (base.includes(k) || k.includes(base))
  })
  if (matching) return matching

  if (segments.length) return segments[0]

  return (domain.split('.')[0].replace(/[-_]+/g, ' ') || domain).replace(/\b\w/g, (c) => c.toUpperCase())
}
