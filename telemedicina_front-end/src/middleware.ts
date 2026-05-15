import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface TokenPayload {
  tipo_usuario?: string;
  tipo?: string;
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('telemedicina_token')?.value;
  const path = request.nextUrl.pathname;

  // Function to decode JWT payload safely
  const getPayload = (t: string): TokenPayload | null => {
    try {
      const payloadBase64 = t.split('.')[1];
      // Handling Base64Url to Base64
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const payloadStr = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(payloadStr);
    } catch (e) {
      return null;
    }
  };

  // Protect /admin routes
  if (path.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    const payload = getPayload(token);
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const tipo = (payload.tipo_usuario || payload.tipo || '').toLowerCase();
    if (tipo !== 'admin') {
      return NextResponse.redirect(new URL('/inicio', request.url));
    }
  }

  // Protect internal routes from non-logged users
  const internalRoutes = ['/inicio', '/consultas', '/historico', '/perfil'];
  const isInternal = internalRoutes.some(r => path.startsWith(r));

  if (isInternal) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = getPayload(token);
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const tipo = (payload.tipo_usuario || payload.tipo || '').toLowerCase();
    
    // Prevent admin from accessing patient/doctor dashboards
    if (tipo === 'admin') {
      // Allow access to their own dashboard
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/inicio/:path*', '/consultas/:path*', '/historico/:path*', '/perfil/:path*'],
};
