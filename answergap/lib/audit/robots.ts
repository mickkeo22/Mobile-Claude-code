/**
 * A focused robots.txt parser. Follows the grouping and longest-match rules
 * from RFC 9309 closely enough to answer one question accurately:
 * "is this specific crawler allowed to fetch this specific path?"
 */

export interface RobotsGroup {
  agents: string[]
  allow: string[]
  disallow: string[]
}

export interface ParsedRobots {
  groups: RobotsGroup[]
  sitemaps: string[]
  /** Directives we saw but that aren't part of the access decision. */
  hasAnyRules: boolean
}

export function parseRobots(body: string): ParsedRobots {
  const groups: RobotsGroup[] = []
  const sitemaps: string[] = []
  let current: RobotsGroup | null = null
  // Consecutive User-agent lines share one rule block.
  let expectingAgents = false

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim()
    if (!line) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const field = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()

    if (field === 'user-agent') {
      if (!current || !expectingAgents) {
        current = { agents: [], allow: [], disallow: [] }
        groups.push(current)
      }
      if (value) current.agents.push(value.toLowerCase())
      expectingAgents = true
      continue
    }

    if (field === 'sitemap') {
      if (value) sitemaps.push(value)
      continue
    }

    if (field === 'allow' || field === 'disallow') {
      if (!current) {
        current = { agents: ['*'], allow: [], disallow: [] }
        groups.push(current)
      }
      expectingAgents = false
      if (field === 'allow') current.allow.push(value)
      else current.disallow.push(value)
    } else {
      expectingAgents = false
    }
  }

  const hasAnyRules = groups.some((g) => g.allow.length > 0 || g.disallow.length > 0)
  return { groups, sitemaps, hasAnyRules }
}

/** Selects the group that applies to `agent`: most specific name wins, else `*`. */
export function groupFor(parsed: ParsedRobots, agent: string): RobotsGroup | null {
  const needle = agent.toLowerCase()
  let best: RobotsGroup | null = null
  let bestLen = -1
  let wildcard: RobotsGroup | null = null

  for (const g of parsed.groups) {
    for (const a of g.agents) {
      if (a === '*') {
        // Merge repeated wildcard groups so later blocks don't get dropped.
        if (!wildcard) wildcard = { agents: ['*'], allow: [...g.allow], disallow: [...g.disallow] }
        else {
          wildcard.allow.push(...g.allow)
          wildcard.disallow.push(...g.disallow)
        }
        continue
      }
      // RFC 9309: match is on a case-insensitive prefix of the product token.
      if (needle === a || needle.startsWith(a) || a.startsWith(needle)) {
        if (a.length > bestLen) {
          bestLen = a.length
          best = g
        }
      }
    }
  }
  return best ?? wildcard
}

function ruleMatches(pattern: string, path: string): number {
  // Empty Disallow means "allow everything" — never a match.
  if (pattern === '') return -1
  let p = pattern
  const mustEndAtEnd = p.endsWith('$')
  if (mustEndAtEnd) p = p.slice(0, -1)

  const segments = p.split('*')
  let cursor = 0
  let consumed = 0
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg === '') continue
    const at = i === 0 && !p.startsWith('*') ? (path.startsWith(seg) ? 0 : -1) : path.indexOf(seg, cursor)
    if (at === -1) return -1
    cursor = at + seg.length
    consumed += seg.length
  }
  if (mustEndAtEnd && cursor !== path.length) return -1
  // Specificity: length of the literal pattern, per longest-match rule.
  return Math.max(consumed, p.length)
}

/** True when the crawler is permitted to fetch `path`. */
export function isAllowed(parsed: ParsedRobots, agent: string, path: string): boolean {
  const group = groupFor(parsed, agent)
  if (!group) return true

  let bestAllow = -1
  let bestDisallow = -1
  for (const rule of group.allow) bestAllow = Math.max(bestAllow, ruleMatches(rule, path))
  for (const rule of group.disallow) bestDisallow = Math.max(bestDisallow, ruleMatches(rule, path))

  if (bestDisallow === -1) return true
  if (bestAllow === -1) return false
  // Ties go to Allow.
  return bestAllow >= bestDisallow
}

/** True when the crawler is shut out of the entire site. */
export function isFullyBlocked(parsed: ParsedRobots, agent: string): boolean {
  return !isAllowed(parsed, agent, '/')
}

/** Did the file mention this agent by name at all? */
export function mentionsAgent(parsed: ParsedRobots, agent: string): boolean {
  const needle = agent.toLowerCase()
  return parsed.groups.some((g) => g.agents.some((a) => a !== '*' && (a === needle || needle.startsWith(a))))
}
