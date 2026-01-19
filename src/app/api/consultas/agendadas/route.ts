import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    if (!apiBase) {
        return NextResponse.json({ error: 'API base URL não configurada' }, { status: 500 });
    }

    const auth = req.headers.get('authorization') || '';
    const url = `${apiBase.replace(/\/$/, '')}/consultas/agendadas`;

    try {
        console.log(`[Proxy] Chamando: ${url}`);
        const res = await fetch(url, {
            method: 'GET',
            headers: { Authorization: auth },
        });

        const text = await res.text();
        const contentType = res.headers.get('content-type') || '';

        if (!res.ok) {
            return NextResponse.json(
                contentType.includes('application/json') ? JSON.parse(text) : { error: text || 'Erro ao buscar consultas agendadas' },
                { status: res.status }
            );
        }

        return NextResponse.json(contentType.includes('application/json') ? JSON.parse(text) : { ok: true });
    } catch (e: any) {
        console.error('[Proxy] Erro ao buscar consultas agendadas:', e);
        return NextResponse.json({ error: 'Falha ao buscar consultas agendadas' }, { status: 502 });
    }
}
