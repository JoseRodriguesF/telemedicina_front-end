"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import './header.css';

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 768 && open) setOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <h1 className="brand">
          <Link href="/" aria-label="Início">Telemedicina</Link>
        </h1>

        <div className="header-actions">
          <Link href="/login" className="btn btn-ghost" aria-label="Login">Login</Link>
          <Link href={{ pathname: '/register', query: { tipo: 'paciente' } }} className="btn btn-primary" aria-label="Cadastro">Cadastro</Link>
          <Link href={{ pathname: '/register', query: { tipo: 'medico' } }} className="btn btn-secondary" aria-label="Cadastro para médicos">Cadastro Médicos</Link>
        </div>

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
        {isHome ? (
          <>
            <Link href="/login" onClick={() => setOpen(false)} className="mobile-link">Login</Link>
            <Link href={{ pathname: '/register', query: { tipo: 'paciente' } }} onClick={() => setOpen(false)} className="mobile-link">Cadastro</Link>
            <Link href={{ pathname: '/register', query: { tipo: 'medico' } }} onClick={() => setOpen(false)} className="mobile-link">Cadastro Médicos</Link>
          </>
        ) : (
          <>
            <Link href="/inicio" onClick={() => setOpen(false)} className="mobile-link">Início</Link>
            <Link href="/consultas" onClick={() => setOpen(false)} className="mobile-link">Consultas</Link>
            <Link href="/historico" onClick={() => setOpen(false)} className="mobile-link">Histórico</Link>
            <Link href="/perfil" onClick={() => setOpen(false)} className="mobile-link">Perfil</Link>
            <Link href="/configuracoes" onClick={() => setOpen(false)} className="mobile-link">Configurações</Link>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color, #e5e7eb)', margin: '0.5rem 0' }} />
            <Link href="/login" onClick={() => setOpen(false)} className="mobile-link">Login</Link>
            <Link href={{ pathname: '/register', query: { tipo: 'paciente' } }} onClick={() => setOpen(false)} className="mobile-link">Cadastro</Link>
            <Link href={{ pathname: '/register', query: { tipo: 'medico' } }} onClick={() => setOpen(false)} className="mobile-link">Cadastro Médicos</Link>
          </>
        )}
      </nav>
    </header>
  );
}
