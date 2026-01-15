"use client";

import './inicio.css';
import '@/components/layout/Header/header.css';
import Image from 'next/image';
import Link from 'next/link';
import ThemeToggle from '@/components/common/ThemeToggle/ThemeToggle';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { getUser, getUserFirstName, getToken, clearUser } from '@/lib/auth';
import { psListActiveRooms, psGetHistory, PSHistoryResponse } from '@/lib/axios/consultas';
import FrequencyChart from '@/components/dashboard/FrequencyChart';

export default function InicioPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [isMedico, setIsMedico] = useState<boolean>(false);
  /* State for active session */
  const [reconnectData, setReconnectData] = useState<{
    roomId: string;
    consultaId: string;
    userId: string;
    role: string;
    pacienteNome?: string;
    medicoNome?: string;
  } | null>(null);

  const [historyData, setHistoryData] = useState<PSHistoryResponse | null>(null);

  /* State for next appointment (Simulated) */
  const [nextAppointment, setNextAppointment] = useState<{
    id: string;
    doctorName: string;
    specialty: string;
    date: string;
    time: string;
    timestamp: number;
  } | null>({
    id: 'simulated-appt-123',
    doctorName: 'Dr. Carlos Silva',
    specialty: 'Cardiologista',
    date: '14/01/2026',
    time: '15:30',
    timestamp: new Date('2026-01-14T15:30:00').getTime()
  });

  /* Logic to check if "Entrar na Sala" should be enabled (e.g., 5 min before) */
  // Using a mock current time for demonstration if needed, or real time.
  // For now, enabling it always for easier testing or strict 5 min rule.
  const canEnterRoom = true;

  const handleCancelAppointment = () => {
    // In a real app, call API to cancel
    if (confirm('Tem certeza que deseja desmarcar esta consulta?')) {
      setNextAppointment(null);
    }
  };

  const handleEnterAppointment = () => {
    if (nextAppointment) {
      // In a real app, this would get the room ID from the appointment details
      router.push(`/consultas/atendimento?id=${nextAppointment.id}&scheduled=true`);
    }
  };

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
            role: calculatedRole,
            pacienteNome: sala.pacienteNome,
            medicoNome: sala.medicoNome
          });
        }
      }).catch(err => console.error(err));
    }

    if (token) {
      psGetHistory(token)
        .then(data => setHistoryData(data))
        .catch(err => console.error('Erro ao buscar histórico:', err));
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
        <MobileHeader />
      </div>
      <Sidebar activeId="inicio" />

      <main className="inicio-main">
        <header className="dashboard-header">
          <h2>Bem-vindo, {displayName}!</h2>
        </header>

        <section className="dashboard-grid">
          {/* Card 1: Consultas na Plataforma */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Consultas na plataforma</h3>
              <div className="dash-card-icon">
                <Image src="/icons/icon-checklist.png" alt="Ícone Consultas" width={24} height={24} />
              </div>
            </div>
            <div className="dash-card-value">
              {historyData ? historyData.count : '--'}
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
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Consulta em andamento.
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                    {isMedico
                      ? (reconnectData.pacienteNome ? `Paciente: ${reconnectData.pacienteNome}` : 'Paciente conectado')
                      : (reconnectData.medicoNome ? `Dr(a). ${reconnectData.medicoNome}` : 'Médico conectado')}
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

          {/* Card 3: Última Consulta */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Última Consulta</h3>
              <div className="dash-card-icon">
                <Image src="/icons/icon-calendar.png" alt="Ícone Calendário" width={24} height={24} />
              </div>
            </div>
            <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <div style={{ marginBottom: 'auto' }}>
                {historyData?.lastConsulta ? (
                  <>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      {isMedico ? 'Paciente' : 'Médico'}
                    </p>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {isMedico
                        ? historyData.lastConsulta.paciente.nome_completo
                        : historyData.lastConsulta.medico.nome_completo}
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      {new Date(historyData.lastConsulta.createdAt).toLocaleDateString('pt-BR')} - {new Date(historyData.lastConsulta.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                    {historyData ? 'Nenhuma consulta realizada.' : 'Carregando...'}
                  </p>
                )}
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
          {/* Activity Chart Card */}
          <div className="dash-card featured">
            <div className="dash-card-header">
              <h3>Frequência de Consultas</h3>
              <div className="dash-card-icon">
                <Image src="/icons/icon-chart.png" alt="Ícone Frequência" width={24} height={24} />
              </div>
            </div>
            <div style={{ flex: 1, minHeight: '300px', width: '100%', padding: '1rem 0' }}>
              <FrequencyChart />
            </div>
            <div className="dash-card-footer" style={{ textAlign: 'center' }}>Semana atual</div>
          </div>

          {/* Scheduled Appointments Card */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Próxima Consulta</h3>
              <div className="dash-card-icon">
                <Image src="/icons/icon-calendar.png" alt="Ícone Calendário" width={24} height={24} />
              </div>
            </div>
            {nextAppointment ? (
              <>
                <div className="dash-card-body">
                  <div className="appointment-info" style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {nextAppointment.doctorName}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{nextAppointment.specialty}</p>
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
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nextAppointment.date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Horário:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nextAppointment.time}</span>
                    </div>
                  </div>

                  <div className="appointment-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      className="btn ghost-danger"
                      onClick={handleCancelAppointment}
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
                      onClick={handleEnterAppointment}
                      disabled={!canEnterRoom}
                    >
                      Entrar na Sala
                    </button>
                  </div>
                </div>
                <div className="dash-card-footer" style={{ textAlign: 'center', marginTop: 'auto' }}>
                  Esteja pronto 5 min antes.
                </div>
              </>
            ) : (
              <div className="dash-card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <p>Não há consultas agendadas.</p>
              </div>
            )}
          </div>

        </section>
      </main>
    </div>
  );
}

import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
