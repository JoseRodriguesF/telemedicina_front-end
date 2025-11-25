import { NextResponse } from 'next/server';

const TARGET = process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (process.env.NODE_ENV === 'development') console.log('[proxy] /api/register/medicos received body:', body);
    // Try plural endpoint first (most backends use /register/medicos). If the
    // remote returns 404 try the singular `/register/medico` as a fallback.
    const endpoints = [`${TARGET}/register/medicos`, `${TARGET}/register/medico`];
    let resp = await fetch(endpoints[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    let used = endpoints[0];
    if (resp.status === 404) {
      if (process.env.NODE_ENV === 'development') console.warn('[proxy] primary endpoint returned 404, trying fallback', endpoints[1]);
      resp = await fetch(endpoints[1], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      used = endpoints[1];
    }
    // try to parse JSON, otherwise capture text for debugging
    let data: any = null;
    try {
      data = await resp.json();
    } catch (e) {
      data = await resp.text().catch(() => ({}));
    }
    if (process.env.NODE_ENV === 'development' && resp.status >= 400) {
      console.warn('[proxy] /api/register/medicos remote status:', resp.status, 'response:', data, 'used:', used);
    }

    // If remote returned an error, include proxy debug info (used endpoint and remote body)
    if (resp.status >= 400) {
      const wrapped = {
        error: data || null,
        _proxy: {
          usedEndpoint: used,
          remoteStatus: resp.status,
        },
      };
      return NextResponse.json(wrapped, { status: resp.status });
    }

    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Proxy error' }, { status: 502 });
  }
}
