import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (!apiBase) return new Response(JSON.stringify({ error: 'API base URL não configurada' }), { status: 500 });
  const token = req.headers.get('authorization') || '';
  try {
    const res = await fetch(`${apiBase}/ps/fila`, {
      method: 'GET',
      headers: { Authorization: token },
    });
    const body = await res.text();
    return new Response(body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Falha ao listar fila' }), { status: 502 });
  }
}
