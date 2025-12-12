import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (!apiBase) return new Response(JSON.stringify({ error: 'API base URL não configurada' }), { status: 500 });
  const token = req.headers.get('authorization') || '';
  try {
    const res = await fetch(`${apiBase}/ps/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
    });
    const body = await res.text();
    return new Response(body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Falha ao criar sala' }), { status: 502 });
  }
}
