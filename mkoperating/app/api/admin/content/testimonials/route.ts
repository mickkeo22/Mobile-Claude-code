import { NextRequest, NextResponse } from 'next/server';
import { deleteTestimonial, upsertTestimonial } from '@/lib/db';
import type { Testimonial } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: Partial<Testimonial>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.quote?.trim() || !body.author?.trim()) {
    return NextResponse.json({ error: 'Quote and author are required.' }, { status: 400 });
  }
  const saved = await upsertTestimonial(body);
  if (!saved) return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  return NextResponse.json({ testimonial: saved });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const ok = await deleteTestimonial(id);
  return NextResponse.json({ ok });
}
