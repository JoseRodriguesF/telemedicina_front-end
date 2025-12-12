import { NextRequest } from 'next/server';

export async function POST(req: NextRequest, context: { params: Promise<{ consultaId: string }> }) {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (!apiBase) return new Response(JSON.stringify({ error: 'API base URL não configurada' }), { status: 500 });
  const token = req.headers.get('authorization') || '';
  const { consultaId } = await context.params;
  try {
    const res = await fetch(`${apiBase}/ps/fila/${encodeURIComponent(consultaId)}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
    });
    const body = await res.text();
    return new Response(body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Falha ao claim da consulta' }), { status: 502 });
  }
}
