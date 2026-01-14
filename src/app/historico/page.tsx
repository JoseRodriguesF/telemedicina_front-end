"use client";

import '../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { getUser, getUserFirstName } from '@/lib/auth';

export default function HistoricoPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
  }, []);

  return (
    <div className="inicio-page">
      <div className="inicio-mobile-header">
        <MobileInicioHeader />
      </div>
      <Sidebar activeId="historico" />

      <main className="inicio-main">
        <header className="dashboard-header">
          <h2>Histórico</h2>
          <p>Acesse detalhes de suas consultas e prescrições anteriores</p>
        </header>

        <section className="dashboard-grid">
          <div className="dash-card featured">
            <div className="dash-card-header">
              <h3>Consultas Anteriores</h3>
              <div className="dash-card-icon">🕒</div>
            </div>
            <div className="dash-card-body" style={{ padding: '2rem 0', textAlign: 'center' }}>
              <div className="empty-state">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Em breve por aqui</h4>
                <p style={{ color: 'var(--text-secondary)' }}>
                  A listagem detalhada de seus históricos e receitas está em desenvolvimento.
                </p>
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Resumo de Saúde</h3>
              <div className="dash-card-icon">📊</div>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Acompanhe a evolução do seu bem-estar através dos dados coletados em suas consultas.
              </p>
            </div>
            <div className="dash-card-footer">Dados atualizados após cada consulta.</div>
          </div>
        </section>
      </main>
    </div>
  );
}

function MobileInicioHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onResize() { if (window.innerWidth > 900 && open) setOpen(false); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <h1 className="brand">Telemedicina</h1>
        <button
          className={`hamburger ${open ? 'is-open' : ''}`}
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </div>

      <nav className={`mobile-menu ${open ? 'open' : ''}`} aria-hidden={!open}>
        <Link href="/inicio" onClick={() => setOpen(false)} className="mobile-link">Início</Link>
        <Link href="/consultas" onClick={() => setOpen(false)} className="mobile-link">Consultas</Link>
        <Link href="/historico" onClick={() => setOpen(false)} className="mobile-link">Histórico</Link>
        <Link href="/perfil" onClick={() => setOpen(false)} className="mobile-link">Perfil</Link>
        <Link href="/configuracoes" onClick={() => setOpen(false)} className="mobile-link">Configurações</Link>
      </nav>
    </header>
  );
}
