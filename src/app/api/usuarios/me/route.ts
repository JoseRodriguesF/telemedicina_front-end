import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com';

export async function GET(req: NextRequest) {
    const auth = req.headers.get('authorization') || '';

    // Se não houver token, retorna 401 imediatamente sem chamar o backend
    if (!auth || !auth.startsWith('Bearer ')) {
        console.warn('[Proxy] GET /usuarios/me - No valid authorization header');
        return NextResponse.json({ error: 'Token de autenticação não fornecido ou inválido' }, { status: 401 });
    }

    const url = `${API_BASE.replace(/\/$/, '')}/usuarios/me`;

    try {
        console.log(`[Proxy] fetching: ${url}`);
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json'
            },
        });

        const text = await res.text();
        const contentType = res.headers.get('content-type') || '';
        let data;

        try {
            data = contentType.includes('application/json') ? JSON.parse(text) : { message: text };
        } catch {
            data = { message: text };
        }

        if (!res.ok) {
            console.error(`[Proxy] Backend returned ${res.status}:`, data);
            return NextResponse.json(data, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[Proxy] Error fetching profile:', e);
        return NextResponse.json({ message: 'Falha ao buscar perfil', details: e.message }, { status: 502 });
    }
}

export async function PATCH(req: NextRequest) {
    const auth = req.headers.get('authorization') || '';

    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = `${API_BASE.replace(/\/$/, '')}/usuarios/me`;

    try {
        const body = await req.json();
        console.log(`[Proxy] patching: ${url}`);

        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const text = await res.text();
        const contentType = res.headers.get('content-type') || '';
        let data;

        try {
            data = contentType.includes('application/json') ? JSON.parse(text) : { message: text };
        } catch {
            data = { message: text };
        }

        if (!res.ok) {
            console.error(`[Proxy] Backend PATCH returned ${res.status}:`, data);
            return NextResponse.json(data, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[Proxy] Error updating profile:', e);
        return NextResponse.json({ message: 'Falha ao atualizar perfil', details: e.message }, { status: 502 });
    }
}
