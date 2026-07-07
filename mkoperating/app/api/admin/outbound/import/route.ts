import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { insertProspects } from '@/lib/db';
import { mapProspects, parseCsv } from '@/lib/csv';
import type { Prospect } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { csv?: string; batch?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const csv = String(body.csv ?? '');
  if (!csv.trim()) return NextResponse.json({ error: 'CSV content required' }, { status: 400 });
  if (csv.length > 2_000_000) return NextResponse.json({ error: 'CSV too large' }, { status: 413 });

  const batch =
    (body.batch ?? '').trim().slice(0, 60) ||
    new Date().toISOString().slice(0, 10);

  const { prospects, skipped } = mapProspects(parseCsv(csv));
  if (!prospects.length) {
    return NextResponse.json(
      { error: 'No usable rows. Expect columns: name, niche, town, website, email.' },
      { status: 400 }
    );
  }
  if (prospects.length > 1000) {
    return NextResponse.json({ error: 'Max 1000 prospects per import.' }, { status: 413 });
  }

  const now = new Date().toISOString();
  const rows: Prospect[] = prospects.map((p) => ({
    id: randomUUID(),
    batch,
    name: p.name,
    niche: p.niche,
    town: p.town,
    website: p.website || null,
    email: p.email || null,
    status: 'new',
    teaser: null,
    email_subject: null,
    email_body: null,
    created_at: now,
    updated_at: now,
  }));

  const inserted = await insertProspects(rows);
  return NextResponse.json({ imported: inserted, skipped, batch });
}
