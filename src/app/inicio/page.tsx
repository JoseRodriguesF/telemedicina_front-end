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
import { psListActiveRooms, psGetFullHistory, PSFullHistoryItem, getConsultasAgendadas, ConsultaAgendada, cancelarConsulta } from '@/lib/axios/consultas';
import FrequencyChart from '@/components/dashboard/FrequencyChart';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';

export default function InicioPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [isMedico, setIsMedico] = useState<boolean>(false);
  const [userId, setUserId] = useState<number | null>(null);

  /* State for active session */
  const [reconnectData, setReconnectData] = useState<{
    roomId: string;
    consultaId: string;
    userId: string;
    role: string;
    pacienteNome?: string;
    medicoNome?: string;
  } | null>(null);

  const [fullHistory, setFullHistory] = useState<PSFullHistoryItem[]>([]);
  const [chartData, setChartData] = useState<Array<{ name: string; consultas: number }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Próxima consulta agendada real
  const [nextAppointment, setNextAppointment] = useState<ConsultaAgendada | null>(null);
  const [cancelingAppointment, setCancelingAppointment] = useState(false);

  /* Logic to check if "Entrar na Sala" should be enabled (e.g., 5 min before) */
  // Using a mock current time for demonstration if needed, or real time.
  // For now, enabling it always for easier testing or strict 5 min rule.
  const canEnterRoom = true;

  const handleCancelAppointment = async () => {
    if (!nextAppointment) return;

    if (!confirm('Tem certeza que deseja desmarcar esta consulta?')) {
      return;
    }

    setCancelingAppointment(true);
    try {
      const token = getToken();
      if (!token) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }

      await cancelarConsulta(nextAppointment.id, token);
      setNextAppointment(null);
      alert('Consulta desmarcada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao cancelar consulta:', error);
      const errorMsg = error?.response?.data?.error;

      if (errorMsg === 'cannot_cancel_finished_consultation') {
        alert('Não é possível cancelar consultas finalizadas.');
      } else if (error?.response?.status === 403) {
        alert('Você não tem permissão para cancelar esta consulta.');
      } else {
        alert('Erro ao cancelar consulta. Tente novamente.');
      }
    } finally {
      setCancelingAppointment(false);
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
    const isMed = (u?.tipo_usuario || '').toLowerCase() === 'medico';
    setIsMedico(isMed);
    setUserId(u?.id || null);

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

    // Buscar consultas agendadas e pegar a mais próxima
    if (token) {
      getConsultasAgendadas(token)
        .then((consultas: ConsultaAgendada[]) => {
          if (consultas && consultas.length > 0) {
            // Filtrar apenas consultas agendadas
            const agendadas = consultas.filter(c => c.status === 'agendada');

            // Ordenar por data e hora mais próxima (crescente)
            const sorted = agendadas.sort((a, b) => {
              const getTimestamp = (c: ConsultaAgendada) => {
                if (c.hora_inicio.includes('T')) {
                  // Se já é ISO string completa
                  return new Date(c.hora_inicio).getTime();
                }
                // Combinar data YYYY-MM-DD com hora HH:mm:ss
                // Importante: isso cria um timestamp em hora local
                const dateTimeStr = `${c.data_consulta}T${c.hora_inicio}`;
                return new Date(dateTimeStr).getTime();
              };

              const timestampA = getTimestamp(a);
              const timestampB = getTimestamp(b);

              return timestampA - timestampB; // Crescente = mais próxima primeiro
            });

            // Debug: mostrar ordenação
            console.log('Consultas agendadas ordenadas:', sorted.map(c => ({
              id: c.id,
              data: c.data_consulta,
              hora: c.hora_inicio,
              paciente: c.paciente.nome_completo,
              medico: c.medico.nome_completo
            })));

            // Pegar a primeira (mais próxima)
            if (sorted.length > 0) {
              setNextAppointment(sorted[0]);
              console.log('Próxima consulta selecionada:', {
                data: sorted[0].data_consulta,
                hora: sorted[0].hora_inicio
              });
            }
          }
        })
        .catch((err: any) => {
          console.error('Erro ao buscar consultas agendadas:', err);
        });

      psGetFullHistory(token)
        .then((data: PSFullHistoryItem[]) => {
          setFullHistory(data);
          // Processar dados para o gráfico (últimos 30 dias)
          const processed = [];
          const now = new Date();
          for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const count = data.filter((item: PSFullHistoryItem) => {
              const itemDate = new Date(item.createdAt);
              return itemDate.toDateString() === d.toDateString();
            }).length;
            processed.push({ name: label, consultas: count });
          }
          setChartData(processed);
        })
        .catch((err: any) => console.error('Erro ao buscar histórico:', err))
        .finally(() => setLoadingHistory(false));
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
              {loadingHistory ? '--' : fullHistory.length}
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
              <div className="dash-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 13L9 20h6l-3-7z" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <path d="M16.5 9.5a6.5 6.5 0 0 0-9 0" />
                  <path d="M20 6a11.5 11.5 0 0 0-16 0" />
                </svg>
              </div>
            </div>
            <div className="dash-card-body">
              {reconnectData ? (
                <>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Consulta em andamento.
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {isMedico
                      ? (reconnectData.pacienteNome ? `Paciente: ${reconnectData.pacienteNome}` : 'Paciente conectado')
                      : (reconnectData.medicoNome ? `Dr(a). ${reconnectData.medicoNome}` : 'Médico conectado')}
                  </p>
                  <button
                    className="btn primary"
                    style={{ borderRadius: 'var(--radius-lg)', width: '100%', padding: '0.4rem' }}
                    onClick={handleReconnect}
                  >
                    Reconectar
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
                    Nenhuma consulta ativa encontrada no momento.
                  </p>
                  <button
                    className="btn ghost"
                    disabled
                    style={{ borderRadius: 'var(--radius-lg)', width: '100%', padding: '0.4rem', opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    Reconectar
                  </button>
                </>
              )}
            </div>
          </div>


          {/* Card 4: Última Consulta (Shifted ID) */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Última Consulta</h3>
              <div className="dash-card-icon">
                <Image src="/icons/icon-calendar.png" alt="Ícone Calendário" width={24} height={24} />
              </div>
            </div>
            <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <div style={{ marginBottom: 'auto' }}>
                {loadingHistory ? (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>Carregando...</p>
                ) : fullHistory.length > 0 ? (
                  <>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', gap: '0.4rem', alignItems: 'baseline', margin: '0.25rem 0' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {isMedico ? 'Paciente:' : 'Médico:'}
                      </span>
                      {isMedico
                        ? (fullHistory[0].paciente?.nome_completo?.trim().split(/\s+/)[0] || 'Paciente')
                        : (fullHistory[0].medico?.nome_completo?.trim().split(/\s+/)[0] || 'Médico')}
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginTop: '0' }}>
                      {fullHistory[0].createdAt
                        ? `${new Date(fullHistory[0].createdAt).toLocaleDateString('pt-BR')} - ${new Date(fullHistory[0].createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                        : 'Data não disponível'}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                    Nenhuma consulta realizada.
                  </p>
                )}
              </div>
              <button
                className="btn ghost"
                style={{ borderRadius: 'var(--radius-lg)', width: '100%', padding: '0.4rem', marginTop: '0.5rem' }}
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
              <h3>Consultas nos ultimos 30 dias</h3>
              <div className="dash-card-icon">
                <Image src="/icons/icon-chart.png" alt="Ícone Frequência" width={24} height={24} />
              </div>
            </div>
            <div style={{ flex: 1, minHeight: '300px', height: '100%', width: '100%', padding: '1rem 0 2.5rem', position: 'relative' }}>
              <FrequencyChart data={chartData} />
            </div>
            <div className="dash-card-footer" style={{ textAlign: 'center' }}>Últimos 30 dias</div>
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
                      {isMedico ? nextAppointment.paciente.nome_completo : nextAppointment.medico.nome_completo}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {isMedico ? 'Paciente' : 'Médico'}
                    </p>
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
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {(() => {
                          try {
                            if (nextAppointment.data_consulta.includes('-') && !nextAppointment.data_consulta.includes('T')) {
                              const [year, month, day] = nextAppointment.data_consulta.split('-').map(Number);
                              return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                            }
                            return new Date(nextAppointment.data_consulta).toLocaleDateString('pt-BR');
                          } catch {
                            return nextAppointment.data_consulta;
                          }
                        })()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Horário:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {(() => {
                          try {
                            if (nextAppointment.hora_inicio.includes('T')) {
                              return new Date(nextAppointment.hora_inicio).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            }
                            return nextAppointment.hora_inicio.substring(0, 5);
                          } catch {
                            return nextAppointment.hora_inicio;
                          }
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="appointment-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      className="btn ghost-danger"
                      onClick={handleCancelAppointment}
                      disabled={cancelingAppointment}
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        padding: '0.75rem',
                        color: 'var(--color-error)',
                        borderColor: 'var(--color-error)',
                        background: 'transparent',
                        border: '1px solid var(--color-error)',
                        opacity: cancelingAppointment ? 0.6 : 1,
                        cursor: cancelingAppointment ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {cancelingAppointment ? 'Cancelando...' : 'Desmarcar Consulta'}
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
