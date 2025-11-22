import { NextResponse } from 'next/server';

const TARGET = process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (process.env.NODE_ENV === 'development') console.log('[proxy] /api/register/acesso received body:', body);
    const resp = await fetch(`${TARGET}/register/acesso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let data: any = null;
    try {
      data = await resp.json();
    } catch (e) {
      data = await resp.text().catch(() => ({}));
    }
    if (process.env.NODE_ENV === 'development' && resp.status >= 400) {
      console.warn('[proxy] /api/register/acesso remote status:', resp.status, 'response:', data);
    }
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Proxy error' }, { status: 502 });
  }
}
