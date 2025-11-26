"use client";

import './inicio.css';
import Image from 'next/image';

export default function InicioPage() {
  const items = [
    { id: 'inicio', label: 'Início', icon: '/images/home-06.svg' },
    { id: 'perfil', label: 'Perfil', icon: '/images/user.svg' },
    { id: 'historico', label: 'Histórico', icon: '/images/clock.svg' },
    { id: 'consultas', label: 'Consultas', icon: '/images/first-aid.svg' },
  ];

  return (
    <div className="inicio-page">
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
          <h2>Bem-vindo, (Usuario)!</h2>
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

