"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/common/ThemeToggle/ThemeToggle';
import './header.css';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle resize and close mobile menu
  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 768 && open) setOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-inner">
          <h1 className="brand">
            <Link href="/" aria-label="Início">Telemedicina</Link>
          </h1>

          <div className="header-actions">
            <ThemeToggle />
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
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`mobile-menu-overlay ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Mobile Menu */}
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
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />
            <Link href="/login" onClick={() => setOpen(false)} className="mobile-link">Login</Link>
            <Link href={{ pathname: '/register', query: { tipo: 'paciente' } }} onClick={() => setOpen(false)} className="mobile-link">Cadastro</Link>
            <Link href={{ pathname: '/register', query: { tipo: 'medico' } }} onClick={() => setOpen(false)} className="mobile-link">Cadastro Médicos</Link>
          </>
        )}
      </nav>
    </>
  );
}
