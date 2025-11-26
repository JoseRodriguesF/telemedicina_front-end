"use client";

import './inicio.css';
import Image from 'next/image';

export default function InicioPage() {
  const items = [
    { id: 'inicio', label: 'Início', icon: '/images/home-06.svg' },
    { id: 'perfil', label: 'Perfil', icon: '/images/user.svg' },
    { id: 'historico', label: 'Histórico', icon: '/images/clock.svg' },
    { id: 'consultas', label: 'Consultas', icon: '/images/document.svg' },
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
                <Image src={it.icon} alt={it.label} width={20} height={20} />
              </span>
              <span className="nav-label">{it.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button type="button" className="nav-item settings" onClick={() => { /* settings not available */ }}>
            <span className="nav-icon"><Image src="/images/document-upload.svg" alt="Config" width={18} height={18} /></span>
            <span className="nav-label">Configurações</span>
          </button>
        </div>
      </aside>

      <main className="inicio-main">
        <div className="center-card">
          <h2>Bem-vindo, (Usuario)!</h2>
          <div className="cards-row">
            <div className="feature-card">
              <h3>Consultas agendadas</h3>
              <p>Agende suas consultas de acordo com sua disponibilidade.</p>
              <button className="btn primary">Agendar</button>
            </div>
            <div className="feature-card">
              <h3>Pronto Socorro</h3>
              <p>Atendimento rápido para casos de urgência e emergência.</p>
              <button className="btn primary">Entrar para fila</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

