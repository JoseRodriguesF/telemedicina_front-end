import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const id = params.id;
  const auth = req.headers.get('authorization') || '';
  const payload = await req.json().catch(() => ({}));
  const url = `${apiBase.replace(/\/$/, '')}/consultas/${encodeURIComponent(id)}/join`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    return NextResponse.json(contentType.includes('application/json') ? JSON.parse(text) : { error: text || 'error' }, { status: res.status });
  }
  return NextResponse.json(contentType.includes('application/json') ? JSON.parse(text) : { ok: true });
}
