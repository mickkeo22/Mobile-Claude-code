import { safeFetch, HUMAN_UA, type FetchOutcome } from './fetcher'
import { isFullyBlocked, type ParsedRobots } from './robots'

export interface CrawlerDef {
  key: string
  name: string
  operator: string
  powers: string
  /** robots.txt product token. */
  token: string
  /**
   * 'live'      — a real fetching agent, so we can probe it directly.
   * 'robots'    — a control token only (no distinct fetcher exists), so
   *               probing it would be meaningless; robots.txt is the truth.
   */
  probe: 'live' | 'robots'
  ua?: string
}

export const CRAWLERS: CrawlerDef[] = [
  {
    key: 'oai-searchbot',
    name: 'OAI-SearchBot',
    operator: 'OpenAI',
    powers: 'ChatGPT Search results',
    token: 'OAI-SearchBot',
    probe: 'live',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  },
  {
    key: 'chatgpt-user',
    name: 'ChatGPT-User',
    operator: 'OpenAI',
    powers: 'Live lookups when someone asks ChatGPT about you',
    token: 'ChatGPT-User',
    probe: 'live',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  },
  {
    key: 'gptbot',
    name: 'GPTBot',
    operator: 'OpenAI',
    powers: "ChatGPT's knowledge of your business",
    token: 'GPTBot',
    probe: 'live',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot',
  },
  {
    key: 'claudebot',
    name: 'ClaudeBot',
    operator: 'Anthropic',
    powers: "Claude's knowledge of your business",
    token: 'ClaudeBot',
    probe: 'live',
    ua: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  },
  {
    key: 'perplexitybot',
    name: 'PerplexityBot',
    operator: 'Perplexity',
    powers: 'Perplexity answers and citations',
    token: 'PerplexityBot',
    probe: 'live',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot',
  },
  {
    key: 'meta-externalagent',
    name: 'meta-externalagent',
    operator: 'Meta',
    powers: 'Meta AI answers',
    token: 'meta-externalagent',
    probe: 'live',
    ua: 'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
  },
  {
    key: 'google-extended',
    name: 'Google-Extended',
    operator: 'Google',
    powers: 'Gemini and AI Overviews grounding',
    token: 'Google-Extended',
    probe: 'robots',
  },
  {
    key: 'applebot-extended',
    name: 'Applebot-Extended',
    operator: 'Apple',
    powers: 'Apple Intelligence',
    token: 'Applebot-Extended',
    probe: 'robots',
  },
]

const CHALLENGE_MARKERS = [
  'just a moment',
  'cf-browser-verification',
  'attention required',
  'enable javascript and cookies to continue',
  'checking your browser',
  'ddos protection by',
  'access denied',
  'request unsuccessful',
  'incapsula incident',
  'you have been blocked',
  'sorry, you have been blocked',
]

export type BlockReason =
  | 'ok'
  | 'http-forbidden'
  | 'http-ratelimited'
  | 'http-legal'
  | 'challenge-page'
  | 'network-refused'
  | 'robots-disallow'
  | 'degraded'
  | 'inconclusive'

export interface ProbeResult {
  status: number | null
  bytes: number
  error?: string
  blockedVsHuman: boolean
  reason: BlockReason
}

function looksLikeChallenge(body: string): boolean {
  const head = body.slice(0, 4000).toLowerCase()
  return CHALLENGE_MARKERS.some((m) => head.includes(m))
}

/**
 * Compares one crawler's view of the homepage against a real browser's view.
 * The human baseline is the control: if a site 403s everybody, that's a
 * hardened site, not AI-specific blocking, and we must not call it a block.
 */
export function judge(human: FetchOutcome, bot: FetchOutcome): ProbeResult {
  const humanOk = human.ok && human.status !== null && human.status >= 200 && human.status < 400
  const base = { status: bot.status, bytes: bot.bytes, error: bot.error }

  if (!humanOk) {
    return { ...base, blockedVsHuman: false, reason: 'inconclusive' }
  }

  if (!bot.ok) {
    // The browser got through and the crawler couldn't even connect.
    return { ...base, blockedVsHuman: true, reason: 'network-refused' }
  }

  const s = bot.status ?? 0
  if (s === 401 || s === 403 || s === 405 || s === 406) {
    return { ...base, blockedVsHuman: true, reason: 'http-forbidden' }
  }
  if (s === 429) return { ...base, blockedVsHuman: true, reason: 'http-ratelimited' }
  if (s === 451) return { ...base, blockedVsHuman: true, reason: 'http-legal' }

  if (looksLikeChallenge(bot.body)) {
    return { ...base, blockedVsHuman: true, reason: 'challenge-page' }
  }

  if (s >= 500) {
    return { ...base, blockedVsHuman: true, reason: 'network-refused' }
  }

  // Served a shell that's a fraction of what a browser gets.
  if (s === 200 && human.bytes > 8000 && bot.bytes > 0 && bot.bytes < human.bytes * 0.15) {
    return { ...base, blockedVsHuman: true, reason: 'degraded' }
  }

  return { ...base, blockedVsHuman: false, reason: 'ok' }
}

export async function probeCrawler(
  origin: string,
  def: CrawlerDef,
  human: FetchOutcome,
  robots: ParsedRobots | null,
): Promise<ProbeResult & { robotsDisallowed: boolean }> {
  const robotsDisallowed = robots ? isFullyBlocked(robots, def.token) : false

  if (def.probe === 'robots' || !def.ua) {
    return {
      status: null,
      bytes: 0,
      blockedVsHuman: robotsDisallowed,
      reason: robotsDisallowed ? 'robots-disallow' : 'ok',
      robotsDisallowed,
    }
  }

  const res = await safeFetch(origin, def.ua)
  let verdict = judge(human, res)

  // 429 is usually transient throttling rather than a policy decision.
  // Give it one more chance before reporting it, so we don't accuse a site
  // of blocking AI when it was simply busy.
  if (verdict.reason === 'http-ratelimited') {
    await new Promise((r) => setTimeout(r, 1200))
    const retry = await safeFetch(origin, def.ua)
    verdict = judge(human, retry)
  }

  // robots.txt disallow is itself a block, even when the server would answer.
  if (robotsDisallowed && !verdict.blockedVsHuman) {
    return { ...verdict, blockedVsHuman: true, reason: 'robots-disallow', robotsDisallowed }
  }
  return { ...verdict, robotsDisallowed }
}

/**
 * A hard, deliberate shut-out — as opposed to throttling or an ambiguous
 * result. Only these justify capping the overall score.
 */
export function isHardBlock(reason: BlockReason): boolean {
  return reason === 'http-forbidden' || reason === 'http-legal' || reason === 'robots-disallow' || reason === 'challenge-page'
}

export const HUMAN_USER_AGENT = HUMAN_UA

export function reasonLabel(reason: BlockReason): string {
  switch (reason) {
    case 'http-forbidden':
      return 'Server returned 403 Forbidden'
    case 'http-ratelimited':
      return 'Server returned 429 Too Many Requests'
    case 'http-legal':
      return 'Server returned 451 Unavailable'
    case 'challenge-page':
      return 'Served a bot-challenge page instead of content'
    case 'network-refused':
      return 'Connection refused or failed'
    case 'robots-disallow':
      return 'Disallowed in robots.txt'
    case 'degraded':
      return 'Served a near-empty page compared to a browser'
    case 'inconclusive':
      return 'Could not determine'
    default:
      return 'Allowed'
  }
}
