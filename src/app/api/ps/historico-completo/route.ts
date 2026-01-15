import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com').trim();
    if (!apiBase) return new Response(JSON.stringify({ error: 'API base URL não configurada' }), { status: 500 });

    const token = req.headers.get('authorization') || '';

    const targetUrl = `${apiBase}/ps/historico-completo`;

    try {
        console.log(`[Proxy PS Full History] Chamando: ${targetUrl}`);
        const res = await fetch(targetUrl, {
            method: 'GET',
            headers: { Authorization: token },
        });
        const body = await res.text();
        return new Response(body, {
            status: res.status,
            headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' }
        });
    } catch (e: any) {
        console.error('Error in proxy historico-completo:', e);
        return new Response(JSON.stringify({ error: 'Falha ao buscar histórico completo de consultas' }), { status: 502 });
    }
}
