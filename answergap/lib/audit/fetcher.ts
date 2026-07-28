import dns from 'node:dns/promises'
import net from 'node:net'

export const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

const MAX_BYTES = 2_500_000
const DEFAULT_TIMEOUT = 9_000

export interface FetchOutcome {
  ok: boolean
  status: number | null
  finalUrl: string
  body: string
  bytes: number
  headers: Record<string, string>
  error?: string
}

/** Hostnames that must never be probed, regardless of DNS. */
const BLOCKED_SUFFIXES = ['.local', '.internal', '.localhost', '.home.arpa', '.cluster.local']
const BLOCKED_EXACT = new Set(['localhost', 'metadata.google.internal', 'instance-data'])

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number)
    if (p[0] === 10) return true
    if (p[0] === 127) return true
    if (p[0] === 0) return true
    if (p[0] === 169 && p[1] === 254) return true
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true
    if (p[0] === 192 && p[1] === 168) return true
    if (p[0] === 192 && p[1] === 0 && p[2] === 2) return true
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true
    if (p[0] >= 224) return true
    return false
  }
  const v = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (v === '::' || v === '::1') return true
  if (v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7))
  return false
}

/**
 * Normalises user input into a bare hostname and refuses anything that could be
 * used to reach infrastructure that isn't the public internet.
 */
export function normaliseDomain(input: string): { domain: string } | { error: string } {
  let raw = (input || '').trim().toLowerCase()
  if (!raw) return { error: 'Enter a website address.' }
  raw = raw.replace(/^https?:\/\//, '').replace(/^www\./, '')
  raw = raw.split('/')[0].split('?')[0].split('#')[0]
  // Strip credentials and ports — both are vectors for reaching internal hosts.
  if (raw.includes('@')) return { error: 'That address is not supported.' }
  raw = raw.split(':')[0]
  if (!raw) return { error: 'Enter a website address.' }
  if (raw.length > 253) return { error: 'That address is too long.' }
  if (net.isIP(raw)) return { error: 'Enter a domain name, not an IP address.' }
  if (BLOCKED_EXACT.has(raw)) return { error: 'That address is not supported.' }
  if (BLOCKED_SUFFIXES.some((s) => raw.endsWith(s))) return { error: 'That address is not supported.' }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(raw)) {
    return { error: "That doesn't look like a website address." }
  }
  const tld = raw.split('.').pop() || ''
  if (tld.length < 2) return { error: "That doesn't look like a website address." }
  return { domain: raw }
}

/** Resolves the host and confirms every address is publicly routable. */
export async function assertPublicHost(domain: string): Promise<string | null> {
  let addrs: { address: string }[]
  try {
    addrs = await dns.lookup(domain, { all: true })
  } catch {
    return `We couldn't find a site at ${domain}. Check the spelling and try again.`
  }
  if (!addrs.length) return `We couldn't find a site at ${domain}.`
  if (addrs.some((a) => isPrivateIp(a.address))) return 'That address is not supported.'
  return null
}

export async function safeFetch(
  url: string,
  ua: string,
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<FetchOutcome> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': ua,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
        'accept-language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
    })

    const reader = res.body?.getReader()
    let received = 0
    const chunks: Uint8Array[] = []
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          received += value.byteLength
          if (received > MAX_BYTES) {
            chunks.push(value)
            await reader.cancel().catch(() => {})
            break
          }
          chunks.push(value)
        }
      }
    }
    const merged = new Uint8Array(received > MAX_BYTES ? MAX_BYTES : received)
    let offset = 0
    for (const c of chunks) {
      if (offset >= merged.length) break
      const slice = c.subarray(0, Math.min(c.length, merged.length - offset))
      merged.set(slice, offset)
      offset += slice.length
    }
    const body = new TextDecoder('utf-8', { fatal: false }).decode(merged)

    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v
    })

    return {
      ok: true,
      status: res.status,
      finalUrl: res.url || url,
      body,
      bytes: received,
      headers,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const friendly = /abort/i.test(message) ? 'timeout' : message
    return { ok: false, status: null, finalUrl: url, body: '', bytes: 0, headers: {}, error: friendly }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * A 200 that is actually an HTML error page. Sites commonly serve their
 * SPA shell for /llms.txt, which would otherwise read as "file exists".
 */
export function isSoft404(outcome: FetchOutcome, expectPlainText: boolean): boolean {
  if (!outcome.ok || outcome.status !== 200) return true
  const body = outcome.body.trim()
  if (!body) return true
  const ct = (outcome.headers['content-type'] || '').toLowerCase()
  if (expectPlainText) {
    if (ct.includes('text/html')) return true
    if (/^\s*<(!doctype|html|\?xml)/i.test(body)) return true
    if (/<\/(html|body)>/i.test(body)) return true
  }
  if (/\b(404|page not found|not found)\b/i.test(body.slice(0, 400))) return true
  return false
}
