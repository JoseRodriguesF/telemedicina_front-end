import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (!apiBase) return new Response(JSON.stringify({ error: 'API base URL não configurada' }), { status: 500 });
  const token = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!token || !token.toLowerCase().startsWith('bearer ')) {
    return new Response(JSON.stringify({ error: 'missing_authorization_header' }), { status: 401 });
  }
  try {
    const url = apiBase.endsWith('/') ? `${apiBase}ps/rooms` : `${apiBase}/ps/rooms`;

    // Ler o body da requisição original para repassar ao backend
    let body: string | undefined;
    try {
      const jsonBody = await req.json();
      body = JSON.stringify(jsonBody);
    } catch {
      // Se não houver body ou não for JSON válido, enviar objeto vazio
      body = JSON.stringify({});
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      },
      body
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[proxy] /api/ps/rooms -> backend status:', res.status);
    }
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
