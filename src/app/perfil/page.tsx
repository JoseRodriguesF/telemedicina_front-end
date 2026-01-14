"use client";

import '../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { getUser, getUserFirstName, getUserDisplayName } from '@/lib/auth';

export default function PerfilPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [userKey, setUserKey] = useState<number>(0); // Force re-render on user update if needed

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
    setFullName(getUserDisplayName(u));
    setEmail(u?.email || '');
  }, [userKey]);

  return (
    <div className="inicio-page">
      <div className="inicio-mobile-header">
        <MobileInicioHeader />
      </div>
      <Sidebar activeId="perfil" />

      <main className="inicio-main">
        <header className="dashboard-header">
          <h2>Meu Perfil</h2>
          <p>Gerencie suas informações pessoais e preferências</p>
        </header>

        <section className="dashboard-grid">
          <div className="dash-card featured">
            <div className="dash-card-header">
              <h3>Informações Pessoais</h3>
              <div className="dash-card-icon">👤</div>
            </div>

            <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  color: 'var(--text-secondary)',
                  border: '2px solid var(--border-color)'
                }}>
                  {displayName ? displayName[0] : 'U'}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{fullName}</h4>
                  <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0' }}>{email}</p>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    background: 'var(--color-primary-100)',
                    color: 'var(--color-primary-700)',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    Conta Verificada
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="info-field">
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Nome Completo</label>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}>{fullName}</div>
                </div>
                <div className="info-field">
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Email</label>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}>{email}</div>
                </div>
              </div>
            </div>
            <div className="dash-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn ghost">Alterar Senha</button>
              <button className="btn primary">Editar Perfil</button>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Configurações</h3>
              <div className="dash-card-icon">⚙️</div>
            </div>
            <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-primary)' }}>Notificações por Email</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
                  <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--color-primary-500)', transition: '.4s', borderRadius: '34px' }}></span>
                  <span style={{ position: 'absolute', content: '""', height: '16px', width: '16px', left: '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%', transform: 'translateX(16px)' }}></span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0' }}>
                <span style={{ color: 'var(--text-primary)' }}>Autenticação em 2 fatores</span>
                <button style={{ color: 'var(--color-primary-500)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Configurar</button>
              </div>
            </div>
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
