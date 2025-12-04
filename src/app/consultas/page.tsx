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

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
  }, []);

  const items = [
    { id: 'inicio', label: 'Início', icon: '/images/home-06.svg', href: '/inicio' },
    { id: 'consultas', label: 'Consultas', icon: '/images/first-aid.svg', href: '/consultas' },
    { id: 'historico', label: 'Histórico', icon: '/images/clock.svg', href: '/historico' },
    { id: 'perfil', label: 'Perfil', icon: '/images/user.svg', href: '/perfil' },
  ];

  return (
    <div className="inicio-page">
      <div className="inicio-mobile-header">
        <MobileInicioHeader />
      </div>
      <Sidebar activeId="consultas" />

      <main className="inicio-main">
        <div className="center-card">
          <h2>Consultas de {displayName}</h2>
          <div className="feature-card">
            <div className="icon primary" aria-hidden>
              <Image src="/images/calendar.svg" alt="Consultas" width={28} height={28} />
            </div>
            <h3>Agendamentos</h3>
            <p>Em breve: listagem e agendamento de consultas.</p>
            <button className="btn primary full" onClick={() => router.push('/consultas/nova')}>Agendar</button>
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
