// Fetch a prospect's public homepage and reduce it to plain text for the
// outreach generator. Best-effort: any failure returns null and the teaser
// is generated from niche+town alone.

export async function fetchSiteText(rawUrl: string | null): Promise<string | null> {
  if (!rawUrl) return null;
  let url = rawUrl.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MKOperatingBot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('text/html') && !type.includes('text/plain')) return null;

    const html = (await res.text()).slice(0, 400_000);
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 100 ? text.slice(0, 5000) : null;
  } catch {
    return null;
  }
}
