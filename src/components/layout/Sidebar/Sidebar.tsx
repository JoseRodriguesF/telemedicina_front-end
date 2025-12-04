"use client";

import './sidebar.css';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type SidebarItem = {
  id: 'inicio' | 'consultas' | 'historico' | 'perfil';
  label: string;
  icon: string;
  href: string;
};

type Props = {
  activeId?: SidebarItem['id'] | 'configuracoes';
};

const baseItems: SidebarItem[] = [
  { id: 'inicio', label: 'Início', icon: '/images/home-06.svg', href: '/inicio' },
  { id: 'consultas', label: 'Consultas', icon: '/images/first-aid.svg', href: '/consultas' },
  { id: 'historico', label: 'Histórico', icon: '/images/clock.svg', href: '/historico' },
  { id: 'perfil', label: 'Perfil', icon: '/images/user.svg', href: '/perfil' },
];

export default function Sidebar({ activeId = 'inicio' }: Props) {
  const router = useRouter();
  return (
    <aside className="inicio-sidebar" aria-label="Menu lateral">
      <div className="sidebar-top">
        <div className="platform-name">
          <span className="short">T</span>
          <span className="full">Telemedicina</span>
        </div>
      </div>

      <nav className="inicio-nav">
        {baseItems.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`nav-item ${it.id === activeId ? 'active' : ''}`}
            onClick={() => router.push(it.href)}
          >
            <span className="nav-icon">
              <Image src={it.icon} alt={it.label} width={24} height={24} />
            </span>
            <span className="nav-label">{it.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          type="button"
          className={`nav-item settings ${activeId === 'configuracoes' ? 'active' : ''}`}
          onClick={() => router.push('/configuracoes')}
        >
          <span className="nav-icon"><Image src="/images/setting-2.svg" alt="Configurações" width={24} height={24} /></span>
          <span className="nav-label">Configurações</span>
        </button>
      </div>
    </aside>
  );
}
