export type Severity = 'critical' | 'warning' | 'pass' | 'info'

export type CheckId =
  | 'ai-crawler-access'
  | 'robots-ai-rules'
  | 'server-rendered'
  | 'structured-data'
  | 'answerability'
  | 'llms-txt'
  | 'crawl-hygiene'

export interface Finding {
  id: CheckId
  title: string
  severity: Severity
  /** 0..1 — how much of this check's weight was earned. */
  earned: number
  weight: number
  /** One-line verdict shown in the results list. */
  summary: string
  /** Longer plain-English explanation of why it matters. */
  detail: string
  /** Machine-readable evidence rendered as a proof table. */
  evidence: Evidence[]
}

export interface Evidence {
  label: string
  value: string
  state?: 'good' | 'bad' | 'warn' | 'neutral'
}

export interface CrawlerProbe {
  key: string
  name: string
  operator: string
  /** What this crawler feeds. */
  powers: string
  status: number | null
  error?: string
  blocked: boolean
  /** blocked specifically relative to the human baseline */
  blockedVsHuman: boolean
  robotsDisallowed: boolean
  bytes: number
}

export interface PageFacts {
  finalUrl: string
  status: number | null
  server: string
  title: string
  metaDescription: string
  h1: string[]
  h2: string[]
  headingCount: number
  words: number
  textSample: string
  jsonLd: { raw: string; valid: boolean; types: string[] }[]
  schemaTypes: string[]
  hasCanonical: boolean
  robotsMeta: string
  noindex: boolean
  htmlBytes: number
  /** Ratio of visible text bytes to total html bytes — low means JS-shell. */
  textRatio: number
  emails: string[]
  phones: string[]
  addressHints: string[]
  /** Parsed "City, ST 12345" if the page states one. */
  locality: string
  region: string
  postalCode: string
  faqCount: number
  openGraph: boolean
  lang: string
  generator: string
}

export interface AuditResult {
  domain: string
  scannedAt: string
  durationMs: number
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  headline: string
  subhead: string
  reachable: boolean
  fatalError?: string
  page: PageFacts
  robotsTxt: { found: boolean; status: number | null; body: string; bytes: number }
  llmsTxt: { found: boolean; status: number | null; bytes: number }
  sitemap: { found: boolean; status: number | null; urls: number }
  crawlers: CrawlerProbe[]
  humanBaseline: { status: number | null; bytes: number }
  findings: Finding[]
  /** Set when a hard AI-crawler block puts a ceiling on the score. */
  scoreCap?: { cap: number; rawScore: number; reason: string }
}
