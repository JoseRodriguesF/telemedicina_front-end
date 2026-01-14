"use client";

import './inicio.css';
import '@/components/layout/Header/header.css';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { getUser, getUserFirstName, getToken } from '@/lib/auth';
import { psListActiveRooms } from '@/lib/axios/consultas';

export default function InicioPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [reconnectData, setReconnectData] = useState<{ roomId: string; consultaId: string; userId: string; role: string } | null>(null);
  const [isMedico, setIsMedico] = useState<boolean>(false);

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
    setIsMedico((u?.tipo_usuario || '').toLowerCase() === 'medico');

    const token = getToken();
    let found = false;
    try {
      const raw = sessionStorage.getItem('consulta_reconnect');
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.userId && u && String(data.userId) === String(u.id)) {
          setReconnectData(data);
          found = true;
        }
      }
    } catch { }
    if (!found && token && u) {
      const currentUserId = String(u.id);
      psListActiveRooms(token, currentUserId).then((rooms) => {
        if (Array.isArray(rooms) && rooms.length > 0) {
          const sala = rooms[0];
          const calculatedRole = u.tipo_usuario === 'medico' ? 'medico' : 'paciente';
          setReconnectData({
            roomId: sala.roomId || (sala as any).room_id || '',
            consultaId: sala.consultaId || (sala as any).consulta_id || '',
            userId: currentUserId,
            role: calculatedRole
          });
        }
      }).catch(err => console.error(err));
    }
  }, []);

  const handleReconnect = () => {
    if (reconnectData) {
      router.push(`/consultas/atendimento?id=${reconnectData.consultaId}`);
    }
  };

  return (
    <div className="inicio-page">
      <div className="inicio-mobile-header">
        <MobileInicioHeader />
      </div>
      <Sidebar activeId="inicio" />

      <main className="inicio-main">
        <header className="dashboard-header">
          <h2>Bem-vindo, {displayName}!</h2>
          <p>Seu resumo de saúde e consultas para esta semana</p>
        </header>

        <section className="dashboard-grid">
          {/* Card 1: Consultas na Plataforma */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Consultas na plataforma</h3>
              <div className="dash-card-icon">📋</div>
            </div>
            <div className="dash-card-value">
              12
              <span className="dash-card-trend trend-up">↑ 15%</span>
            </div>
            <div className="dash-card-footer">
              {isMedico
                ? 'Parabéns continue atendendo na plataforma!'
                : 'Parabéns, continue cuidando da sua saúde!'}
            </div>
          </div>

          {/* Card 2: Sessão Ativa (Swapped Position) */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Sessão Ativa</h3>
              <div className="dash-card-icon" style={{
                color: reconnectData ? 'var(--color-primary-500)' : 'var(--text-tertiary)',
                background: reconnectData ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'
              }}>
                {reconnectData ? '🟢' : '⚪'}
              </div>
            </div>
            <div className="dash-card-body">
              {reconnectData ? (
                <>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Você possui uma consulta em andamento.
                  </p>
                  <button
                    className="btn primary"
                    style={{ borderRadius: 'var(--radius-lg)', width: '100%', padding: '0.5rem' }}
                    onClick={handleReconnect}
                  >
                    Reconectar
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
                    Nenhuma consulta ativa encontrada no momento.
                  </p>
                  <button
                    className="btn ghost"
                    disabled
                    style={{ borderRadius: 'var(--radius-lg)', width: '100%', padding: '0.5rem', opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    Reconectar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Card 3: Última Consulta (Swapped Position with Tempo de Atendimento logic) */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Última Consulta</h3>
              <div className="dash-card-icon">🕒</div>
            </div>
            <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <div style={{ marginBottom: 'auto' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  {isMedico ? 'Paciente' : 'Médico'}
                </p>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {isMedico ? 'João Silva' : 'Dr. House'}
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                  12/01/2026 - 14:00
                </p>
              </div>
              <button
                className="btn ghost"
                style={{ borderRadius: 'var(--radius-lg)', width: '100%', padding: '0.5rem', marginTop: '1rem' }}
                onClick={() => router.push('/historico')}
              >
                Ver Resumo
              </button>
            </div>
          </div>

          {/* Activity Chart Card */}
          <div className="dash-card featured">
            <div className="dash-card-header">
              <h3>Frequência de Consultas</h3>
              <div className="dash-card-icon">📈</div>
            </div>
            <div className="dash-chart">
              <div className="chart-bar" style={{ height: '60%' }}></div>
              <div className="chart-bar" style={{ height: '85%' }}></div>
              <div className="chart-bar" style={{ height: '45%' }}></div>
              <div className="chart-bar" style={{ height: '70%' }}></div>
              <div className="chart-bar" style={{ height: '95%' }}></div>
              <div className="chart-bar" style={{ height: '55%' }}></div>
              <div className="chart-bar" style={{ height: '80%' }}></div>
            </div>
            <div className="dash-card-footer" style={{ textAlign: 'center' }}>Junho / Julho 2024</div>
          </div>
          {/* Scheduled Appointments Card */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Próxima Consulta</h3>
              <div className="dash-card-icon">📅</div>
            </div>
            <div className="dash-card-body">
              <div className="appointment-info" style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  Dr. Carlos Silva
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cardiologista</p>
              </div>

              <div className="appointment-time" style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Data:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>14/01/2026</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Horário:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>15:30</span>
                </div>
              </div>

              <div className="appointment-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  className="btn ghost-danger"
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    width: '100%',
                    padding: '0.75rem',
                    color: 'var(--color-error)',
                    borderColor: 'var(--color-error)',
                    background: 'transparent',
                    border: '1px solid var(--color-error)'
                  }}
                >
                  Desmarcar Consulta
                </button>
                <button
                  className="btn primary"
                  style={{ borderRadius: 'var(--radius-lg)', width: '100%', padding: '0.75rem' }}
                  // Logic to enable only if it's time (simulated here since it matches today's date in mock)
                  disabled={false} // In a real app check date/time
                >
                  Entrar na Sala
                </button>
              </div>
            </div>
            <div className="dash-card-footer" style={{ textAlign: 'center', marginTop: 'auto' }}>
              Esteja pronto 5 min antes.
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
