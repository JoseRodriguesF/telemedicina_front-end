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
    const contentType = res.headers.get('content-type') || 'application/json';
    const text = await res.text();
    // Passar resposta do backend tal como veio
    if (!res.ok) {
      // Envelope diagnóstico para facilitar no cliente
      const payload = contentType.includes('application/json') ? text : JSON.stringify({ error: text });
      return new Response(payload, { status: res.status, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Falha ao criar sala (proxy)' }), { status: 502 });
  }
}
