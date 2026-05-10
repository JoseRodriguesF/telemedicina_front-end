"use client";

import './MobileHeader.css';
import '@/components/layout/Header/header.css';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, clearUser } from '@/lib/auth';

type NavItem = {
    id: string;
    label: string;
    icon: string;
    href: string;
};

const baseItems: NavItem[] = [
    { id: 'inicio', label: 'Início', icon: '/images/home-06.svg', href: '/inicio' },
    { id: 'consultas', label: 'Consultas', icon: '/images/first-aid.svg', href: '/consultas' },
    { id: 'historico', label: 'Histórico', icon: '/images/clock.svg', href: '/historico' },
];

const adminItems: NavItem[] = [
    { id: 'inicio', label: 'Dashboard', icon: '/images/home-06.svg', href: '/admin/dashboard' },
    { id: 'medicos', label: 'Verificar Médicos', icon: '/images/user.svg', href: '/admin/medicos' },
    { id: 'analytics', label: 'Análise Avançada', icon: '/icons/icon-chart.png', href: '/admin/logs/analytics' },
    { id: 'logs', label: 'Logs do Sistema', icon: '/icons/historia.png', href: '/admin/logs' },
];

export default function MobileHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setUser(getUser());
    }, []);

    useEffect(() => {
        function onResize() { if (window.innerWidth > 767 && open) setOpen(false); }
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [open]);

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    const items = useMemo(() => {
        if (user?.tipo_usuario === 'admin') return adminItems;
        return baseItems;
    }, [user]);

    const activeId = useMemo(() => {
        if (pathname.startsWith('/inicio')) return 'inicio';
        if (pathname.startsWith('/consultas')) return 'consultas';
        if (pathname.startsWith('/historico')) return 'historico';
        if (pathname.startsWith('/perfil')) return 'perfil';
        if (pathname.startsWith('/admin/dashboard')) return 'inicio';
        if (pathname.startsWith('/admin/medicos')) return 'medicos';
        if (pathname.startsWith('/admin/logs/analytics')) return 'analytics';
        if (pathname.startsWith('/admin/logs')) return 'logs';
        return 'inicio';
    }, [pathname]);

    const handleLogout = () => {
        clearUser();
        localStorage.removeItem('telemedicina_token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        setOpen(false);
        router.push('/login');
    };

    const handleNavigate = (href: string) => {
        setOpen(false);
        router.push(href);
    };

    return (
        <>
            <header className="site-header mobile-app-header">
                <div className="mobile-header-inner">
                    <Link href={user?.tipo_usuario === 'admin' ? '/admin/dashboard' : '/inicio'} className="mobile-header-brand">
                        <img src="/images/logo_matriarca_icon.svg" alt="Matriarca" className="mobile-header-logo" />
                    </Link>

                    <div className="mobile-header-right">
                        {/* User avatar mini */}
                        {user?.tipo_usuario !== 'admin' && (
                            <button
                                className="mobile-header-avatar-btn"
                                onClick={() => handleNavigate('/perfil')}
                                aria-label="Perfil"
                            >
                                {user?.profile_image || user?.foto ? (
                                    <Image src={user.profile_image || user.foto} alt="Perfil" width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <span className="mobile-avatar-letter">
                                        {user?.nome?.[0] || user?.email?.[0] || 'U'}
                                    </span>
                                )}
                            </button>
                        )}

                        <button
                            className={`mobile-hamburger ${open ? 'is-open' : ''}`}
                            aria-label="Menu"
                            aria-expanded={open}
                            onClick={() => setOpen(!open)}
                        >
                            <span className="hamburger-line" />
                            <span className="hamburger-line" />
                            <span className="hamburger-line" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Drawer Menu */}
            <nav className={`mobile-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
                {/* Drawer Header */}
                <div className="mobile-drawer-header">
                    <div className="mobile-drawer-brand">
                        <img src="/images/logo_matriarca_icon.svg" alt="Matriarca" className="mobile-drawer-logo" />
                        <span className="mobile-drawer-title">Matriarca</span>
                    </div>
                    <button
                        className="mobile-drawer-close"
                        aria-label="Fechar menu"
                        onClick={() => setOpen(false)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* User Info Card */}
                {user && user.tipo_usuario !== 'admin' && (
                    <div className="mobile-drawer-user" onClick={() => handleNavigate('/perfil')}>
                        <div className="mobile-drawer-avatar">
                            {user?.profile_image || user?.foto ? (
                                <Image src={user.profile_image || user.foto} alt="Perfil" width={44} height={44} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <span className="drawer-avatar-letter">
                                    {user?.nome?.[0] || user?.email?.[0] || 'U'}
                                </span>
                            )}
                        </div>
                        <div className="mobile-drawer-user-info">
                            <span className="drawer-user-name">{user?.nome || 'Usuário'}</span>
                            <span className="drawer-user-email">{user?.email || ''}</span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginLeft: 'auto', flexShrink: 0 }}>
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </div>
                )}

                {user?.tipo_usuario === 'admin' && (
                    <div className="mobile-drawer-admin-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>Painel Administrativo</span>
                    </div>
                )}

                {/* Navigation Links */}
                <div className="mobile-drawer-nav">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            className={`mobile-drawer-link ${item.id === activeId ? 'active' : ''}`}
                            onClick={() => handleNavigate(item.href)}
                        >
                            <span className="mobile-drawer-link-icon">
                                {item.icon.endsWith('.svg') ? (
                                    <Image src={item.icon} alt={item.label} width={20} height={20} />
                                ) : (
                                    <img src={item.icon} alt={item.label} width={20} height={20} />
                                )}
                            </span>
                            <span className="mobile-drawer-link-label">{item.label}</span>
                            {item.id === activeId && (
                                <span className="mobile-drawer-active-dot" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Drawer Footer */}
                <div className="mobile-drawer-footer">
                    <button className="mobile-drawer-logout" onClick={handleLogout}>
                        <Image src="/icons/icon-logout.png" alt="Sair" width={18} height={18} />
                        <span>Sair da conta</span>
                    </button>
                </div>
            </nav>

            {/* Overlay */}
            <div
                className={`mobile-drawer-overlay ${open ? 'open' : ''}`}
                onClick={() => setOpen(false)}
            />
        </>
    );
}
