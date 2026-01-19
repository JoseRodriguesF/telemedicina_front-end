import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    const { id } = await context.params;
    const auth = req.headers.get('authorization') || '';
    const url = `${apiBase.replace(/\/$/, '')}/consultas/${encodeURIComponent(id)}/confirmar`;

    try {
        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: auth
            },
            body: JSON.stringify({})
        });

        const text = await res.text();
        const contentType = res.headers.get('content-type') || '';

        if (!res.ok) {
            const errorData = contentType.includes('application/json') ? JSON.parse(text) : { error: text || 'Erro ao confirmar consulta' };
            console.error('[Proxy] Erro do backend ao confirmar consulta:', {
                status: res.status,
                url: url,
                error: errorData
            });
            return NextResponse.json(errorData, { status: res.status });
        }

        return NextResponse.json(contentType.includes('application/json') ? JSON.parse(text) : { ok: true });
    } catch (e: any) {
        console.error('[Proxy] Erro ao confirmar consulta:', e);
        return NextResponse.json({ error: 'Falha ao confirmar consulta' }, { status: 502 });
    }
}
