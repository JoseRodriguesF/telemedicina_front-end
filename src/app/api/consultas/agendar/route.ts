import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    if (!apiBase) {
        return NextResponse.json({ error: 'API base URL não configurada' }, { status: 500 });
    }

    const auth = req.headers.get('authorization') || '';
    const body = await req.json();
    const url = `${apiBase.replace(/\/$/, '')}/consultas/agendar`;

    try {
        console.log(`[Proxy] Chamando: ${url}`);
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: auth,
            },
            body: JSON.stringify(body),
        });

        const text = await res.text();
        const contentType = res.headers.get('content-type') || '';

        if (!res.ok) {
            return NextResponse.json(
                contentType.includes('application/json') ? JSON.parse(text) : { error: text || 'Erro ao agendar consulta' },
                { status: res.status }
            );
        }

        return NextResponse.json(contentType.includes('application/json') ? JSON.parse(text) : { ok: true });
    } catch (e: any) {
        console.error('[Proxy] Erro ao agendar consulta:', e);
        return NextResponse.json({ error: 'Falha ao agendar consulta' }, { status: 502 });
    }
}
