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
                    <h1 className="brand">
                        <Link href="/inicio">Telemedicina</Link>
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ThemeToggle minimal />
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
            <nav className={`mobile-menu ${open ? 'open' : ''}`} aria-hidden={!open} style={{ paddingTop: '5rem' }}>
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
