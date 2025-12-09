import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const auth = req.headers.get('authorization') || '';
  const url = `${apiBase.replace(/\/$/, '')}/consultas/aguardando`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: auth },
  });
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    return NextResponse.json(contentType.includes('application/json') ? JSON.parse(text) : { error: text || 'error' }, { status: res.status });
  }
  return NextResponse.json(contentType.includes('application/json') ? JSON.parse(text) : { ok: true });
}
