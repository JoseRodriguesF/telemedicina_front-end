import { NextResponse } from 'next/server';

const TARGET = process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (process.env.NODE_ENV === 'development') console.log('[proxy] /api/register/pessoais received body:', body);
    const resp = await fetch(`${TARGET}/register/pessoais`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // try to parse JSON, otherwise capture text for debugging
    let data: any = null;
    try {
      data = await resp.json();
    } catch (e) {
      data = await resp.text().catch(() => ({}));
    }
    if (resp.status >= 400) {
      // Always log minimal diagnostic info in server console; helps debug 400 without exposing sensitive details to client.
      console.warn('[proxy] /api/register/pessoais remote status:', resp.status, 'response:', data);
      // Attach raw response for client-side inspection (still returning upstream status)
      return NextResponse.json({ error: true, status: resp.status, upstream: data }, { status: resp.status });
    }
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Proxy error' }, { status: 502 });
  }
}
