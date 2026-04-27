"use client";

import '../../inicio/inicio.css';
import '../../historico/historico.css';
import '@/components/layout/Header/header.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { getUser, getUserFirstName, getToken } from '@/lib/auth';
import { confirmarConsulta, cancelarConsulta, ConsultaStatus, ConsultaAgendada, ConsultaDetails } from '@/lib/axios/consultas';
// ✅ NOVO: Importar hooks otimizados
import { useConsultasAgendadas } from '@/hooks/useApiData';
import { useDebounce } from '@/hooks/useOptimization';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';

import { Modal } from '@/components/common/Modal/Modal';
import { useModal } from '@/components/common/Modal/useModal';
import { formatDate, formatTime } from '@/lib/utils/dateFormatters';
import ContentModal from '@/components/common/Modal/ContentModal';
import ClinicalStructuredView from '@/components/appointments/atendimento/ClinicalStructuredView';
import { AppointmentActionButtons } from '@/components/appointments/AppointmentActionButtons';

// Array vazio estável
const EMPTY_ARRAY: any[] = [];

export default function MeusAgendamentosPage() {
    const router = useRouter();
    const modal = useModal();
    const [displayName, setDisplayName] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'solicitada' | 'agendada'>('all');
    const [confirmingIds, setConfirmingIds] = useState<Set<number>>(new Set());

    // ✅ NOVO: Usar hooks otimizados
    const { consultas: allConsultasRaw, isLoading: loading, refresh: refreshConsultas } = useConsultasAgendadas();

    // Garantir que sempre temos um array válido com referência estável
    const allConsultas = Array.isArray(allConsultasRaw) ? allConsultasRaw : EMPTY_ARRAY;

    // ✅ NOVO: Debounce na busca
    const debouncedSearch = useDebounce(searchTerm, 300);

    // ✅ OTIMIZADO: Filtrar e ordenar consultas
    const appointments = allConsultas
        .filter(c => c.status === 'agendada' || c.status === 'solicitada')
        .sort((a, b) => {
            const getTimestamp = (c: ConsultaAgendada) => {
                if (c.hora_inicio.includes('T')) {
                    return new Date(c.hora_inicio).getTime();
                }
                return new Date(`${c.data_consulta}T${c.hora_inicio}`).getTime();
            };
            return getTimestamp(a) - getTimestamp(b);
        });

    useEffect(() => {
        const u = getUser();
        if (!u || (u.tipo_usuario || '').toLowerCase() !== 'medico') {
            router.push('/inicio');
            return;
        }

        setDisplayName(getUserFirstName(u));
    }, [router]);

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

    // ✅ OTIMIZADO: Usar debouncedSearch para evitar filtros excessivos
    const filteredAppointments = appointments.filter(item => {
        const matchesSearch = item.paciente?.nome_completo?.toLowerCase().includes(debouncedSearch.toLowerCase());
        let matchesPeriod = true;
        if (filterPeriod === 'today') matchesPeriod = isToday(item.data_consulta);
        else if (filterPeriod === 'week') matchesPeriod = isThisWeek(item.data_consulta);
        else if (filterPeriod === 'month') matchesPeriod = isThisMonth(item.data_consulta);

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

            // ✅ NOVO: Atualizar cache do SWR
            refreshConsultas();

            modal.success('Sucesso', 'Consulta confirmada com sucesso!');
        } catch (error: any) {
            console.error('Erro ao confirmar consulta:', error);
            const errorMsg = error?.response?.data?.error || error?.response?.data?.message || error?.message;
            modal.error('Erro', `Erro ao confirmar consulta: ${errorMsg || 'Tente novamente.'}`);
        } finally {
            setConfirmingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(consultaId);
                return newSet;
            });
        }
    };

    const handleCancelarConsulta = (consultaId: number, pacienteNome: string) => {
        modal.confirm(
            'Confirmar Cancelamento',
            `Tem certeza que deseja cancelar a consulta com ${pacienteNome}?`,
            async () => {
                setConfirmingIds(prev => new Set(prev).add(consultaId));
                try {
                    const token = getToken();
                    if (!token) return;

                    await cancelarConsulta(consultaId, token);

                    // ✅ NOVO: Atualizar cache do SWR
                    refreshConsultas();

                    modal.success('Sucesso', 'Consulta cancelada com sucesso!');
                } catch (error: any) {
                    console.error('Erro ao cancelar consulta:', error);
                    const errorMsg = error?.response?.data?.error;

                    if (errorMsg === 'cannot_cancel_finished_consultation') {
                        modal.error('Ação Inválida', 'Não é possível cancelar consultas finalizadas.');
                    } else if (error?.response?.status === 403) {
                        modal.error('Acesso Negado', 'Você não tem permissão para cancelar esta consulta.');
                    } else {
                        modal.error('Erro', 'Erro ao cancelar consulta. Tente novamente.');
                    }
                } finally {
                    setConfirmingIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(consultaId);
                        return newSet;
                    });
                }
            }
        );
    };

    const [selectedAppt, setSelectedAppt] = useState<ConsultaAgendada | null>(null);
    const [consultaDetails, setConsultaDetails] = useState<ConsultaDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const handleViewDetails = (appt: ConsultaAgendada) => {
        if (appt.status !== 'solicitada') return; // Apenas para confirmação conforme solicitado

        setSelectedAppt(appt);
        const hClinica = Array.isArray(appt.historiaClinica) && appt.historiaClinica.length > 0
            ? appt.historiaClinica[0]
            : null;

        const details: ConsultaDetails = {
            id: appt.id,
            pacienteId: appt.pacienteId,
            medicoId: appt.medicoId,
            status: appt.status,
            createdAt: appt.createdAt,
            updatedAt: appt.updatedAt,
            paciente: {
                id: appt.paciente?.id ?? 0,
                nome_completo: appt.paciente?.nome_completo ?? '',
                cpf: '',
                sexo: '',
                data_nascimento: '',
                telefone: ''
            },
            historiaClinica: hClinica ? {
                ...hClinica,
                conteudo: hClinica.conteudo
            } : undefined
        };

        setConsultaDetails(details);
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
                                    <div
                                        key={item.id}
                                        className="history-item-card"
                                        onClick={() => handleViewDetails(item)}
                                        style={{ cursor: item.status === 'solicitada' ? 'pointer' : 'default' }}
                                    >
                                        <div className="history-item-avatar">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                        </div>

                                        <div className="history-item-main">
                                            <div className="history-item-top">
                                                <span className="history-item-name">{item.paciente?.nome_completo || 'Paciente'}</span>
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

                                        <AppointmentActionButtons
                                            id={item.id}
                                            data={item.data_consulta}
                                            hora={item.hora_inicio}
                                            status={item.status}
                                            pacienteNome={item.paciente?.nome_completo || 'Paciente'}
                                            isConfirming={confirmingIds.has(item.id)}
                                            onConfirm={(id) => {
                                                // Se clicar no botão, não abre o modal (stopPropagation já é tratado no botão geralmente, mas bom garantir)
                                                handleConfirmarConsulta(id);
                                            }}
                                            onCancel={(id, nome) => handleCancelarConsulta(id, nome)}
                                            onAttend={(id) => router.push(`/consultas/atendimento?id=${id}&scheduled=true`)}
                                        />
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
                                    <div className="stat-icon">
                                        <img src="/icons/bell-icon.png" alt="Notificações" className="stat-icon-img" />
                                    </div>
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

            <ContentModal
                isOpen={!!selectedAppt}
                onClose={() => setSelectedAppt(null)}
                title="Ficha de Pré-Atendimento"
                size="md"
            >
                {loadingDetails ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                        <div className="spinner"></div>
                    </div>
                ) : consultaDetails ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '0.5rem' }}>
                        <div className="clinical-report-card">
                            <div className="clinical-report-section">
                                <h3>👤 Dados do Paciente</h3>
                                <div className="clinical-report-item">
                                    <span className="clinical-report-label">Nome:</span>
                                    <span>{consultaDetails.paciente?.nome_completo || 'Paciente'}</span>
                                </div>
                            </div>
                            <div className="clinical-report-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="clinical-report-item" style={{ flexDirection: 'column', gap: '2px' }}>
                                    <span className="clinical-report-label" style={{ fontSize: '0.75rem' }}>Data:</span>
                                    <span style={{ fontWeight: 600 }}>{selectedAppt && new Date(selectedAppt.data_consulta).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div className="clinical-report-item" style={{ flexDirection: 'column', gap: '2px' }}>
                                    <span className="clinical-report-label" style={{ fontSize: '0.75rem' }}>Horário:</span>
                                    <span style={{ fontWeight: 600 }}>{selectedAppt && formatTime(selectedAppt.hora_inicio)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pc-relatorio-container" style={{ padding: 0, marginTop: '1rem' }}>
                            {consultaDetails.historiaClinica ? (
                                <ClinicalStructuredView data={consultaDetails.historiaClinica} variant="report" />
                            ) : (
                                <div className="clinical-report-card">
                                    <div className="clinical-report-section" style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '2px dashed var(--border-color)', borderRadius: '1.25rem' }}>
                                        <p style={{ margin: 0 }}>Informações de triagem não encontradas.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button
                                className="btn secondary"
                                onClick={() => setSelectedAppt(null)}
                                style={{ borderRadius: 'var(--radius-lg)', padding: '0.8rem' }}
                            >
                                Fechar
                            </button>
                            {selectedAppt?.status === 'solicitada' && (
                                <button
                                    className="btn primary"
                                    onClick={() => {
                                        if (selectedAppt) {
                                            handleConfirmarConsulta(selectedAppt.id);
                                            setSelectedAppt(null); // Fecha modal após confirmar
                                        }
                                    }}
                                    style={{ borderRadius: 'var(--radius-lg)', padding: '0.8rem' }}
                                >
                                    Confirmar Agora
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                        Erro ao carregar os detalhes.
                    </div>
                )}
            </ContentModal>

            <Modal
                isOpen={modal.isOpen}
                config={modal.config}
                onConfirm={modal.onConfirm}
                onCancel={modal.onCancel}
            />
        </div>
    );
}
