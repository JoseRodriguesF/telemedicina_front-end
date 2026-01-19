"use client";

import '../inicio/inicio.css';
import './consultas.css';
import '@/components/layout/Header/header.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, getUserFirstName, getToken } from '@/lib/auth';
import { getConsultasAgendadas, ConsultaAgendada } from '@/lib/axios/consultas';

export default function ConsultasPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [isMedico, setIsMedico] = useState<boolean>(false);
  const [scheduledAppointments, setScheduledAppointments] = useState<ConsultaAgendada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const u = getUser();
    const token = getToken();
    setDisplayName(getUserFirstName(u));
    const isMed = (u?.tipo_usuario || '').toLowerCase() === 'medico';
    setIsMedico(isMed);

    if (token) {
      getConsultasAgendadas(token)
        .then((data) => {
          // Filtrar apenas agendadas e ordenar por data mais próxima
          const filtered = data
            .filter(c => c.status === 'agendada')
            .sort((a, b) => {
              const getTimestamp = (c: ConsultaAgendada) => {
                if (c.hora_inicio.includes('T')) {
                  return new Date(c.hora_inicio).getTime();
                }
                return new Date(`${c.data_consulta}T${c.hora_inicio}`).getTime();
              };
              return getTimestamp(a) - getTimestamp(b);
            })
            .slice(0, 3); // Máximo 3 cards
          setScheduledAppointments(filtered);
        })
        .catch(err => console.error('Erro ao buscar consultas:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const getMonthAbbreviation = (dateStr: string) => {
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

    // Se for YYYY-MM-DD, fazer parse direto
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [, month] = dateStr.split('-');
      return months[parseInt(month) - 1];
    }

    const date = new Date(dateStr);
    return months[date.getMonth()];
  };

  const getDay = (dateStr: string) => {
    // Se for YYYY-MM-DD, fazer parse direto
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [, , day] = dateStr.split('-');
      return day;
    }

    const date = new Date(dateStr);
    return String(date.getDate()).padStart(2, '0');
  };

  const formatTime = (timeString: string) => {
    try {
      if (timeString.includes('T')) {
        return new Date(timeString).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return timeString.substring(0, 5);
    } catch (e) {
      return timeString;
    }
  };

  return (
    <div className="inicio-page">
      <div className="inicio-mobile-header">
        <MobileHeader />
      </div>
      <Sidebar activeId="consultas" />

      <main className="inicio-main">
        <header className="dashboard-header" style={{ marginBottom: '0.75rem' }}>
          <h2>Central de Consultas</h2>
          <p>Olá, {displayName}. Como podemos cuidar de você hoje?</p>
        </header>

        <div className="consultas-main">
          {/* Main Services Selection */}
          <section className="services-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="service-card urgency">
              <div className="service-icon-wrapper">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div className="service-info">
                <h3>Pronto Atendimento</h3>
                <p>Urgências e sintomas imediatos. Entre na fila agora para falar com um clínico geral disponível.</p>
              </div>
              <button
                className="btn primary"
                style={{ marginTop: '1rem', width: 'fit-content', padding: '0.75rem 2rem', borderRadius: 'var(--radius-lg)' }}
                onClick={() => router.push(isMedico ? '/consultas/pacientes' : '/consultas/pre-consulta')}
              >
                {isMedico ? 'Ver Fila de Espera' : 'Entrar na Fila'}
              </button>
            </div>

            <div className="service-card scheduling">
              <div className="service-icon-wrapper">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                  <path d="m9 16 2 2 4-4" />
                </svg>
              </div>
              <div className="service-info">
                <h3>{isMedico ? 'Meus Agendamentos' : 'Agendamento'}</h3>
                <p>
                  {isMedico
                    ? 'Veja sua agenda completa de atendimentos confirmados com pacientes.'
                    : 'Marque uma consulta com especialistas para a data e horário de sua preferência.'}
                </p>
              </div>
              <button
                className="btn secondary"
                style={{ marginTop: '1rem', width: 'fit-content', padding: '0.75rem 2rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-tertiary)' }}
                onClick={() => router.push(isMedico ? '/consultas/meus-agendamentos' : '/consultas/agendamento')}
              >
                {isMedico ? 'Ver Minha Agenda' : 'Agendar Consulta'}
              </button>
            </div>
          </section>

          {/* Seção de Próximos Atendimentos Adaptável */}
          <section className="appointments-section">
            <h3 className="section-title">
              {isMedico ? 'Seus Próximos Atendimentos' : 'Suas Próximas Consultas'}
            </h3>
            <div className="appointments-list">
              {loading ? (
                <div className="appointment-mini-card">
                  <div className="appt-details">
                    <p>Carregando informações...</p>
                  </div>
                </div>
              ) : scheduledAppointments.length > 0 ? (
                scheduledAppointments.map(appt => (
                  <div key={appt.id} className="appointment-mini-card">
                    <div className="appt-date-box">
                      <span className="day">{getDay(appt.data_consulta)}</span>
                      <span className="month">{getMonthAbbreviation(appt.data_consulta)}</span>
                    </div>
                    <div className="appt-details">
                      <h4>{isMedico ? appt.paciente.nome_completo : appt.medico.nome_completo}</h4>
                      <p>{isMedico ? 'Paciente' : 'Médico'} • {formatTime(appt.hora_inicio)}</p>
                      <span className="badge success" style={{ marginTop: '0.5rem', display: 'inline-block' }}>{appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}</span>
                    </div>
                    <button
                      className="btn ghost"
                      style={{ fontSize: '1.2rem', padding: '0.5rem' }}
                      onClick={() => router.push(`/consultas/atendimento?id=${appt.id}&scheduled=true`)}
                    >→</button>
                  </div>
                ))
              ) : (
                <div className="appointment-mini-card">
                  <div className="appt-details">
                    <p>Nenhum agendamento encontrado no momento.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
