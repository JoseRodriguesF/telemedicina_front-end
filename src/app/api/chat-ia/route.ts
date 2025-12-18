import { NextResponse } from 'next/server';
const TARGET = process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com';

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization');
    const body = await req.json();
    if (process.env.NODE_ENV === 'development') console.log('[proxy] /api/chat-ia received body:', body);
    const resp = await fetch(`${TARGET}/chat-ia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { 'Authorization': auth } : {})
      },
      body: JSON.stringify(body),
    });
    let data: any = null;
    try {
      data = await resp.json();
    } catch (e) {
      data = await resp.text().catch(() => ({}));
    }
    if (process.env.NODE_ENV === 'development' && resp.status >= 400) {
      console.warn('[proxy] /api/chat-ia remote status:', resp.status, 'response:', data);
    }
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Proxy error' }, { status: 502 });
  }
}
}
