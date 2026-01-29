import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com').trim();
    const { id } = await context.params;
    const auth = req.headers.get('authorization') || '';
    const url = `${apiBase.replace(/\/$/, '')}/consultas/${encodeURIComponent(id)}/avaliacao`;

    try {
        const body = await req.json();

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: auth
            },
            body: JSON.stringify(body),
        });

        const text = await res.text();
        const contentType = res.headers.get('content-type') || '';

        if (!res.ok) {
            return NextResponse.json(
                contentType.includes('application/json') ? JSON.parse(text) : { error: text || 'Erro ao avaliar consulta' },
                { status: res.status }
            );
        }

        return NextResponse.json(contentType.includes('application/json') ? JSON.parse(text) : { ok: true });
    } catch (e: any) {
        console.error('[Proxy] Erro ao avaliar consulta:', e);
        return NextResponse.json({ error: 'Falha ao processar avaliação', details: e.message }, { status: 502 });
    }
}
