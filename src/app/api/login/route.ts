import { NextResponse } from 'next/server';

const TARGET = process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const resp = await fetch(`${TARGET}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Proxy error' }, { status: 502 });
  }
}
