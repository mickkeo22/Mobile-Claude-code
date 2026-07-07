import { NextRequest, NextResponse } from 'next/server';
import { deleteWorkItem, upsertWorkItem } from '@/lib/db';
import type { WorkItem } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: Partial<WorkItem>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }
  const saved = await upsertWorkItem(body);
  if (!saved) return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  return NextResponse.json({ work: saved });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const ok = await deleteWorkItem(id);
  return NextResponse.json({ ok });
}
