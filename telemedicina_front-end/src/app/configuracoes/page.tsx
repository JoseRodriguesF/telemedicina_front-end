"use client";

import '../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getUser, getUserFirstName } from '@/lib/auth';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
  }, []);

  return (
    <DashboardLayout>
      <div className="center-card">
        <h2>Configurações de {displayName}</h2>
        <div className="feature-card">
          <div className="icon" aria-hidden>
            <Image src="/images/setting-2.svg" alt="Configurações" width={28} height={28} />
          </div>
          <h3>Preferências</h3>
          <p>Em breve: tema, notificações e privacidade.</p>
          <button className="btn primary full" onClick={() => router.push('/inicio')}>Voltar ao início</button>
        </div>
      </div>
    </DashboardLayout>
  );
}
