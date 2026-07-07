// Generate the personalized mini-audit teaser + outreach email draft for one
// prospect. Pulls their public homepage when a website is listed so the hook
// is grounded in something real. Nothing is auto-sent — drafts only.

import { NextResponse } from 'next/server';
import { getProspect, updateProspect } from '@/lib/db';
import { aiConfigured, generateOutreach } from '@/lib/ai';
import { fetchSiteText } from '@/lib/fetch-site';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const prospect = await getProspect(params.id);
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!aiConfigured()) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 503 });
  }

  const siteText = await fetchSiteText(prospect.website);

  let result;
  try {
    result = await generateOutreach(prospect, siteText);
  } catch (e) {
    console.error('[mk:outbound] generation failed:', e);
    return NextResponse.json({ error: 'Draft generation failed. Try again.' }, { status: 502 });
  }

  const updated = await updateProspect(prospect.id, {
    teaser: result.teaser,
    email_subject: result.subject,
    email_body: result.body,
    status: prospect.status === 'new' ? 'drafted' : prospect.status,
  });
  return NextResponse.json({ prospect: updated, used_site: Boolean(siteText) });
}
