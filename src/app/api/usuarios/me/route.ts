import { NextRequest, NextResponse } from 'next/server';

const getApiUrl = () => {
    // Fallback to the known API URL if env var is missing, matching next.config.ts behavior
    const base = (process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com').replace(/\/$/, '');
    return `${base}/usuarios/me`;
};

export async function GET(req: NextRequest) {
    const url = getApiUrl();
    const auth = req.headers.get('authorization') || '';

    try {
        console.log(`[Proxy] GET ${url}`);
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json'
            },
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { message: text };
        }

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[Proxy] Error fetching profile:', e);
        return NextResponse.json({ message: 'Falha ao buscar perfil', details: e.message }, { status: 502 });
    }
}

export async function PATCH(req: NextRequest) {
    const url = getApiUrl();
    const auth = req.headers.get('authorization') || '';

    try {
        const body = await req.json();
        console.log(`[Proxy] PATCH ${url}`);

        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { message: text };
        }

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[Proxy] Error updating profile:', e);
        return NextResponse.json({ message: 'Falha ao atualizar perfil', details: e.message }, { status: 502 });
    }
}
