import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    const { id } = await context.params;
    const auth = req.headers.get('authorization') || '';
    const url = `${apiBase.replace(/\/$/, '')}/consultas/${encodeURIComponent(id)}`;

    try {
        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                Authorization: auth
            },
        });

        const text = await res.text();
        const contentType = res.headers.get('content-type') || '';

        if (!res.ok) {
            return NextResponse.json(
                contentType.includes('application/json') ? JSON.parse(text) : { error: text || 'Erro ao cancelar consulta' },
                { status: res.status }
            );
        }

        return NextResponse.json(contentType.includes('application/json') ? JSON.parse(text) : { ok: true });
    } catch (e: any) {
        console.error('[Proxy] Erro ao cancelar consulta:', e);
        return NextResponse.json({ error: 'Falha ao cancelar consulta' }, { status: 502 });
    }
}
