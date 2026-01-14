"use client";

import '../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { getUser, getUserFirstName } from '@/lib/auth';

export default function ConsultasPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [isMedico, setIsMedico] = useState<boolean>(false);

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
    setIsMedico((u?.tipo_usuario || '').toLowerCase() === 'medico');
  }, []);

  return (
    <div className="inicio-page">
      <div className="inicio-mobile-header">
        <MobileHeader />
      </div>
      <Sidebar activeId="consultas" />

      <main className="inicio-main">
        <header className="dashboard-header">
          <h2>Consultas</h2>
          <p>Gerencie seus agendamentos e atendimentos de urgência</p>
        </header>

        <section className="dashboard-grid">
          <div className="dash-card featured">
            <div className="dash-card-header">
              <h3>Agendar Nova Consulta</h3>
              <div className="dash-card-icon">
                <Image src="/icons/icon-calendar.png" alt="Ícone Calendário" width={24} height={24} />
              </div>
            </div>
            <div className="dash-card-body" style={{ padding: '1rem 0' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Escolha a especialidade, o profissional e o melhor horário para você. Nosso sistema de agendamento é simples e rápido.
              </p>
              <button
                className="btn primary"
                style={{ borderRadius: 'var(--radius-lg)', width: 'auto', padding: '0.75rem 2rem' }}
                onClick={() => router.push('/consultas/nova')}
              >
                Agendar Agora
              </button>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Pronto Socorro</h3>
              <div className="dash-card-icon">🆘</div>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Precisa de atendimento imediato? Entre na nossa fila virtual para casos de urgência.
              </p>
              <button
                className="btn primary"
                style={{ borderRadius: 'var(--radius-lg)', width: '100%' }}
                onClick={() => router.push(isMedico ? '/consultas/pacientes' : '/consultas/pre-consulta')}
              >
                {isMedico ? 'Ver Fila de Espera' : 'Entrar na Fila'}
              </button>
            </div>
          </div>


        </section>
      </main>
    </div>
  );
}


// Importando o header mobile reutilizável
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';

