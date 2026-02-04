"use client";

import './sidebar.css';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import ThemeToggle from '@/components/common/ThemeToggle/ThemeToggle';
import { getUser, clearUser } from '@/lib/auth';

type SidebarItem = {
  id: 'inicio' | 'consultas' | 'historico' | 'perfil';
  label: string;
  icon: string;
  href: string;
};

type Props = {
  activeId?: SidebarItem['id'] | 'configuracoes';
  className?: string;
};

const baseItems: SidebarItem[] = [
  { id: 'inicio', label: 'Início', icon: '/images/home-06.svg', href: '/inicio' },
  { id: 'consultas', label: 'Consultas', icon: '/images/first-aid.svg', href: '/consultas' },
  { id: 'historico', label: 'Histórico', icon: '/images/clock.svg', href: '/historico' },
];

export default function Sidebar({ activeId: propActiveId, className = '' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  const activeId = useMemo(() => {
    if (propActiveId) return propActiveId;
    if (pathname.startsWith('/inicio')) return 'inicio';
    if (pathname.startsWith('/consultas')) return 'consultas';
    if (pathname.startsWith('/historico')) return 'historico';
    if (pathname.startsWith('/perfil')) return 'perfil';
    if (pathname.startsWith('/configuracoes')) return 'configuracoes';
    return 'inicio';
  }, [propActiveId, pathname]);

  useEffect(() => {
    setMounted(true);
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    clearUser();
    // Clear all possible tokens from localStorage
    localStorage.removeItem('telemedicina_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <aside
      className={`inicio-sidebar ${className}`}
      aria-label="Menu lateral"
    >
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <div className="logo-inner">
            <span className="logo-t">T</span>
          </div>
        </div>
      </div>

      <nav className="inicio-nav">
        {baseItems.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`nav-item ${it.id === activeId ? 'active' : ''}`}
            onClick={() => router.push(it.href)}
            title={it.label}
          >
            <span className="nav-icon">
              <Image src={it.icon} alt={it.label} width={22} height={22} />
            </span>
            <span className="nav-label">{it.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-tools">
          <div className="tool-item">
            <ThemeToggle minimal />
          </div>



          <button
            type="button"
            className="tool-btn logout"
            title="Sair"
            onClick={handleLogout}
          >
            <span className="tool-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image src="/icons/icon-logout.png" alt="Sair" width={20} height={20} />
            </span>
          </button>
        </div>

        <div className="sidebar-user" onClick={() => router.push('/perfil')}>
          <div className="user-avatar">
            {user?.profile_image || user?.foto ? (
              <Image src={user.profile_image || user.foto} alt="Perfil" width={40} height={40} />
            ) : (
              <div className="avatar-placeholder">
                {user?.nome?.[0] || user?.email?.[0] || 'U'}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
