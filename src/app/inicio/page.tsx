"use client";

import './inicio.css';
import '@/components/layout/Header/header.css';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';

export default function InicioPage() {
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    const u = getUser();
    const name = (u && (u.nome || u.name || u.nome_completo || u.fullName)) || '';
    const fallback = u?.email || '';
    setDisplayName(name || fallback || 'Usuário');
  }, []);
  const items = [
    { id: 'inicio', label: 'Início', icon: '/images/home-06.svg' },
    { id: 'consultas', label: 'Consultas', icon: '/images/first-aid.svg' },
    { id: 'historico', label: 'Histórico', icon: '/images/clock.svg' },
    { id: 'perfil', label: 'Perfil', icon: '/images/user.svg' },
  ];

  return (
    <div className="inicio-page">
      {/* Mobile header only; desktop keeps sidebar */}
      <div className="inicio-mobile-header">
        <MobileInicioHeader />
      </div>
      <aside className="inicio-sidebar" aria-label="Menu lateral">
        <div className="sidebar-top">
          <div className="platform-name">
            <span className="short">T</span>
            <span className="full">Telemedicina</span>
          </div>
        </div>

        <nav className="inicio-nav">
          {items.map((it) => (
            <button key={it.id} type="button" className={`nav-item ${it.id === 'inicio' ? 'active' : ''}`} onClick={() => { /* no redirect - pages not available */ }}>
              <span className="nav-icon">
                <Image src={it.icon} alt={it.label} width={24} height={24} />
              </span>
              <span className="nav-label">{it.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button type="button" className="nav-item settings" onClick={() => { /* settings not available */ }}>
            <span className="nav-icon"><Image src="/images/setting-2.svg" alt="Configurações" width={24} height={24} /></span>
            <span className="nav-label">Configurações</span>
          </button>
        </div>
      </aside>

      <main className="inicio-main">
        <div className="center-card">
          <h2>Bem-vindo, {displayName}!</h2>
          <div className="cards-row">
            <div className="feature-card">
              <div className="icon primary" aria-hidden>
                <Image src="/images/calendar.svg" alt="Consultas" width={28} height={28} />
              </div>
              <h3>Consultas agendadas</h3>
              <p>Agende suas consultas de acordo com sua disponibilidade.</p>
              <button className="btn primary full">Agendar</button>
            </div>
            <div className="feature-card">
              <div className="icon accent" aria-hidden>
                <Image src="/images/alarm.svg" alt="Pronto Socorro" width={28} height={28} />
              </div>
              <h3>Pronto Socorro</h3>
              <p>Atendimento rápido para casos de urgência e emergência.</p>
              <button className="btn primary full">Entrar para fila</button>
            </div>
          </div>
        </div>
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

