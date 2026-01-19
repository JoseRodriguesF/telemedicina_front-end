"use client";

import '../../inicio/inicio.css';
import '../../historico/historico.css';
import '@/components/layout/Header/header.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { getUser, getUserFirstName, getToken } from '@/lib/auth';
import { getConsultasAgendadas, ConsultaAgendada, confirmarConsulta, cancelarConsulta, ConsultaStatus } from '@/lib/axios/consultas';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';

export default function MeusAgendamentosPage() {
    const router = useRouter();
    const [displayName, setDisplayName] = useState<string>('');
    const [appointments, setAppointments] = useState<ConsultaAgendada[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'solicitada' | 'agendada'>('all');
    const [confirmingIds, setConfirmingIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        const u = getUser();
        if (!u || (u.tipo_usuario || '').toLowerCase() !== 'medico') {
            router.push('/inicio');
            return;
        }

        setDisplayName(getUserFirstName(u));

        const fetchAppointments = async () => {
            try {
                const token = getToken();
                if (token) {
                    const data = await getConsultasAgendadas(token);
                    // Agora inclui tanto 'solicitada' quanto 'agendada'
                    const consultas = data.filter(c => c.status === 'agendada' || c.status === 'solicitada');

                    // Ordenar por data e hora (mais próximas primeiro)
                    const sorted = consultas.sort((a, b) => {
                        const getTimestamp = (c: ConsultaAgendada) => {
                            if (c.hora_inicio.includes('T')) {
                                return new Date(c.hora_inicio).getTime();
                            }
                            return new Date(`${c.data_consulta}T${c.hora_inicio}`).getTime();
                        };
                        return getTimestamp(a) - getTimestamp(b);
                    });

                    setAppointments(sorted);
                }
            } catch (error) {
                console.error('Error fetching appointments:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [router]);

    const formatDate = (dateString: string) => {
        try {
            if (dateString.includes('-') && !dateString.includes('T')) {
                const [year, month, day] = dateString.split('-').map(Number);
                return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
            }
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(date);
        } catch (e) {
            return dateString;
        }
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

    const isToday = (dateStr: string) => {
        const today = new Date();
        const date = new Date(dateStr);
        return date.getUTCDate() === today.getDate() &&
            date.getUTCMonth() === today.getUTCMonth() &&
            date.getUTCFullYear() === today.getUTCFullYear();
    };

    const isThisWeek = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        return date >= today && date <= nextWeek;
    };

    const isThisMonth = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        return date.getUTCMonth() === today.getUTCMonth() &&
            date.getUTCFullYear() === today.getUTCFullYear();
    };

    const filteredAppointments = appointments.filter(item => {
        // Busca por nome do paciente
        const matchesSearch = item.paciente?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase());

        // Filtro por período
        let matchesPeriod = true;
        if (filterPeriod === 'today') matchesPeriod = isToday(item.data_consulta);
        else if (filterPeriod === 'week') matchesPeriod = isThisWeek(item.data_consulta);
        else if (filterPeriod === 'month') matchesPeriod = isThisMonth(item.data_consulta);

        // Filtro por status
        let matchesStatus = true;
        if (filterStatus === 'solicitada') matchesStatus = item.status === 'solicitada';
        else if (filterStatus === 'agendada') matchesStatus = item.status === 'agendada';

        return matchesSearch && matchesPeriod && matchesStatus;
    });

    const handleConfirmarConsulta = async (consultaId: number) => {
        setConfirmingIds(prev => new Set(prev).add(consultaId));
        try {
            const token = getToken();
            if (!token) return;

            await confirmarConsulta(consultaId, token);

            // Atualizar a consulta no estado local
            setAppointments(prev => prev.map(appt =>
                appt.id === consultaId ? { ...appt, status: 'agendada' as ConsultaStatus } : appt
            ));
            alert('Consulta confirmada com sucesso!');
        } catch (error: any) {
            console.error('Erro ao confirmar consulta:', error);
            const errorMsg = error?.response?.data?.error || error?.response?.data?.message || error?.message;
            alert(`Erro ao confirmar consulta: ${errorMsg || 'Tente novamente.'}`);
        } finally {
            setConfirmingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(consultaId);
                return newSet;
            });
        }
    };

    const handleCancelarConsulta = async (consultaId: number, pacienteNome: string) => {
        if (!confirm(`Tem certeza que deseja cancelar a consulta com ${pacienteNome}?`)) {
            return;
        }

        setConfirmingIds(prev => new Set(prev).add(consultaId));
        try {
            const token = getToken();
            if (!token) return;

            await cancelarConsulta(consultaId, token);

            // Remover a consulta do estado local
            setAppointments(prev => prev.filter(appt => appt.id !== consultaId));
            alert('Consulta cancelada com sucesso!');
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
            setConfirmingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(consultaId);
                return newSet;
            });
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
                    <h2>Meus Agendamentos</h2>
                    <p>Olá, Dr. {displayName}. Veja sua agenda de atendimentos agendados.</p>
                </header>

                <div className="historico-main">
                    {/* Filters Bar */}
                    <div className="history-filters" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '300px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '1rem', color: 'var(--text-tertiary)' }}>
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                type="text"
                                className="history-search-field"
                                placeholder="Buscar por nome do paciente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="period-filters" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                                className={`btn ${filterPeriod === 'all' ? 'primary' : 'ghost'}`}
                                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)' }}
                                onClick={() => setFilterPeriod('all')}
                            >Todos</button>
                            <button
                                className={`btn ${filterPeriod === 'today' ? 'primary' : 'ghost'}`}
                                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)' }}
                                onClick={() => setFilterPeriod('today')}
                            >Hoje</button>
                            <button
                                className={`btn ${filterPeriod === 'week' ? 'primary' : 'ghost'}`}
                                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)' }}
                                onClick={() => setFilterPeriod('week')}
                            >Semana</button>
                            <button
                                className={`btn ${filterPeriod === 'month' ? 'primary' : 'ghost'}`}
                                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)' }}
                                onClick={() => setFilterPeriod('month')}
                            >Mês</button>
                        </div>

                        <div className="status-filters" style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                className={`btn ${filterStatus === 'all' ? 'primary' : 'ghost'}`}
                                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)' }}
                                onClick={() => setFilterStatus('all')}
                            >Todas</button>
                            <button
                                className={`btn ${filterStatus === 'solicitada' ? 'primary' : 'ghost'}`}
                                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)' }}
                                onClick={() => setFilterStatus('solicitada')}
                            >Solicitadas</button>
                            <button
                                className={`btn ${filterStatus === 'agendada' ? 'primary' : 'ghost'}`}
                                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)' }}
                                onClick={() => setFilterStatus('agendada')}
                            >Confirmadas</button>
                        </div>
                    </div>

                    <div className="history-content-grid">
                        {/* List Side */}
                        <div className="history-list-container">
                            {loading ? (
                                <div className="history-loading">
                                    <div className="pulse-loader"></div>
                                    <p>Carregando sua agenda...</p>
                                </div>
                            ) : filteredAppointments.length > 0 ? (
                                filteredAppointments.map((item) => (
                                    <div key={item.id} className="history-item-card">
                                        <div className="history-item-avatar">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                        </div>

                                        <div className="history-item-main">
                                            <div className="history-item-top">
                                                <span className="history-item-name">{item.paciente.nome_completo}</span>
                                            </div>
                                            <div className="history-item-meta">
                                                <span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                                                    {formatDate(item.data_consulta)}
                                                </span>
                                                <span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                    {formatTime(item.hora_inicio)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="history-item-status">
                                            <span className={`badge ${item.status === 'agendada' ? 'success' : 'warning'}`}>
                                                {item.status === 'agendada' ? 'Confirmada' : 'Solicitada'}
                                            </span>
                                        </div>

                                        <div className="history-item-actions" style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                            {item.status === 'solicitada' && (
                                                <button
                                                    className="btn primary"
                                                    style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}
                                                    onClick={() => handleConfirmarConsulta(item.id)}
                                                    disabled={confirmingIds.has(item.id)}
                                                >
                                                    {confirmingIds.has(item.id) ? 'Confirmando...' : 'Confirmar'}
                                                </button>
                                            )}
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className={`btn ${item.status === 'solicitada' ? 'ghost' : 'primary'}`}
                                                    style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', flex: 1 }}
                                                    onClick={() => router.push(`/consultas/atendimento?id=${item.id}&scheduled=true`)}
                                                    disabled={item.status === 'solicitada'}
                                                >
                                                    Atender
                                                </button>
                                                <button
                                                    className="btn ghost"
                                                    style={{
                                                        padding: '0.4rem 1rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        fontSize: '0.9rem',
                                                        color: 'var(--color-error)',
                                                        borderColor: 'var(--color-error)'
                                                    }}
                                                    onClick={() => handleCancelarConsulta(item.id, item.paciente.nome_completo)}
                                                    disabled={confirmingIds.has(item.id)}
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-history">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2, marginBottom: '1rem' }}>
                                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
                                    </svg>
                                    <h3>Nenhum agendamento encontrado</h3>
                                    <p>Você não possui consultas agendadas para o período selecionado.</p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar Stats */}
                        <aside className="stats-sidebar">
                            <div className="stat-mini-card">
                                <div className="stat-header">
                                    <h4>Total Agendado</h4>
                                    <div className="stat-icon">📅</div>
                                </div>
                                <div className="stat-value">{appointments.length}</div>
                                <div className="stat-label">Consultas agendadas</div>
                            </div>

                            <div className="stat-mini-card">
                                <div className="stat-header">
                                    <h4>Hoje</h4>
                                    <div className="stat-icon">🔔</div>
                                </div>
                                <div className="stat-value">
                                    {appointments.filter(a => isToday(a.data_consulta)).length}
                                </div>
                                <div className="stat-label">Atendimentos previstos para hoje</div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
}
