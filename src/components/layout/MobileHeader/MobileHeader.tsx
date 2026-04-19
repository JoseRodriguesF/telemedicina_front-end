"use client";

import './MobileHeader.css';
import '@/components/layout/Header/header.css';
import Link from 'next/link';
import ThemeToggle from '@/components/common/ThemeToggle/ThemeToggle';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearUser } from '@/lib/auth';

export default function MobileHeader() {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        function onResize() { if (window.innerWidth > 900 && open) setOpen(false); }
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [open]);

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    const handleLogout = () => {
        clearUser();
        localStorage.removeItem('telemedicina_token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        router.push('/login');
    };

    return (
        <>
            <header className="site-header mobile-app-header">
                <div className="header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href="/inicio" style={{ display: 'flex', alignItems: 'center' }}>
                        <img src="/images/logo_matriarca_icon.png" alt="Matriarca" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            className={`hamburger ${open ? 'is-open' : ''}`}
                            aria-label="Menu"
                            aria-expanded={open}
                            onClick={() => setOpen(!open)}
                            style={{ display: 'flex' }} // Force flex as header.css might hide it on desktop but this component is mobile-only via CSS
                        >
                            <span className="bar" />
                            <span className="bar" />
                            <span className="bar" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Drawer */}
            <nav className={`mobile-menu ${open ? 'open' : ''}`} aria-hidden={!open} style={{ paddingTop: '1.5rem' }}>
                {/* Close Button */}
                <button
                    className="mobile-menu-close"
                    aria-label="Fechar menu"
                    onClick={() => setOpen(false)}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-md)',
                        transition: 'background 0.2s ease',
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div style={{ marginTop: '2.5rem' }}>
                    <Link href="/inicio" onClick={() => setOpen(false)} className="mobile-link">Início</Link>
                    <Link href="/consultas" onClick={() => setOpen(false)} className="mobile-link">Consultas</Link>
                    <Link href="/historico" onClick={() => setOpen(false)} className="mobile-link">Histórico</Link>
                    <Link href="/perfil" onClick={() => setOpen(false)} className="mobile-link">Perfil</Link>

                    <button
                        onClick={handleLogout}
                        className="mobile-link"
                        style={{
                            width: '100%',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-base)',
                            fontFamily: 'var(--font-family)',
                            color: 'var(--color-error)'
                        }}
                    >
                        Sair
                    </button>
                </div>
            </nav>

            {/* Overlay */}
            {open && (
                <div
                    className="mobile-menu-overlay open"
                    onClick={() => setOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)' }}
                />
            )}
        </>
    );
}
