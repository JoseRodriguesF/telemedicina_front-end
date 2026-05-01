'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Página de análise — agora redireciona para /inicio pois o fluxo mudou.
 * Médicos agora vão direto para a plataforma após o cadastro.
 * A análise acontece quando enviam documentos pelo perfil.
 */
export default function AnalisePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/inicio');
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <p style={{ color: '#4b5563' }}>Redirecionando...</p>
    </div>
  );
}
