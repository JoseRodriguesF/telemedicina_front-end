"use client";

import '../inicio/inicio.css';
import './consultas.css';
import '@/components/layout/Header/header.css';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getUser, getUserFirstName, getToken } from '@/lib/auth';
import { ConsultaAgendada, ConsultaDetails, confirmarConsulta, cancelarConsulta, listAnexosConsulta } from '@/lib/axios/consultas';
// ✅ NOVO: Importar hooks otimizados
import { useConsultasAgendadas } from '@/hooks/useApiData';
import { MiniAppointmentCard } from '@/components/appointments/MiniAppointmentCard';
import ContentModal from '@/components/common/Modal/ContentModal';
import ClinicalStructuredView from '@/components/appointments/atendimento/ClinicalStructuredView';
import { useModal } from '@/components/common/Modal/useModal';
import { Modal } from '@/components/common/Modal/Modal';
import { useConsultationTimer } from '@/hooks/useConsultationTimer';
import { formatTime } from '@/lib/utils/dateFormatters';
import FormattedText from '@/components/common/FormattedText';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import DocumentsRequiredModal from '@/components/common/Modals/DocumentsRequiredModal/DocumentsRequiredModal';
import { ConsultaDetailsModal } from '@/components/appointments/ConsultaDetailsModal';

// Array vazio estável para evitar re-renders desnecessários
const EMPTY_ARRAY: any[] = [];

export default function ConsultasPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [isMedico, setIsMedico] = useState<boolean>(false);
  const [verificacao, setVerificacao] = useState<string | undefined>(undefined);
  const [showDocsModal, setShowDocsModal] = useState(false);

  // ✅ NOVO: Usar hooks otimizados
  const { consultas: allConsultasRaw, isLoading: loading, error: consultasError, refresh: refreshConsultas } = useConsultasAgendadas();

  // Garantir que sempre temos um array válido com referência estável
  const allConsultas = Array.isArray(allConsultasRaw) ? allConsultasRaw : EMPTY_ARRAY;

  // ✅ OTIMIZADO: Filtrar e ordenar consultas com proteção contra dados nulos
  const scheduledAppointments = allConsultas
    .filter(c => c && c.status === 'agendada' || c?.status === 'solicitada')
    .filter(c => c.medico && c.paciente) // ✅ NOVO: Garantir que médico e paciente existem
    .sort((a, b) => {
      const getTimestamp = (c: ConsultaAgendada) => {
        if (c.hora_inicio?.includes('T')) {
          return new Date(c.hora_inicio).getTime();
        }
        return new Date(`${c.data_consulta}T${c.hora_inicio}`).getTime();
      };
      try {
        return getTimestamp(a) - getTimestamp(b);
      } catch (err) {
        console.error('Erro ao ordenar consultas:', err);
        return 0;
      }
    });

  // Modal logic for patient details
  const globalModal = useModal();
  const [selectedAppt, setSelectedAppt] = useState<ConsultaAgendada | null>(null);
  const [consultaDetails, setConsultaDetails] = useState<ConsultaDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingAnexos, setLoadingAnexos] = useState(false);

  // ✅ NOVO: Monitorar disponibilidade da consulta selecionada
  const { canJoin, timeRemaining } = useConsultationTimer(
    selectedAppt?.data_consulta || '',
    selectedAppt?.hora_inicio || ''
  );

  const handleViewDetails = async (appt: ConsultaAgendada) => {
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

    // ✅ NOVO: Buscar anexos da consulta
    const token = getToken();
    if (token) {
      setLoadingAnexos(true);
      try {
        const anexos = await listAnexosConsulta(appt.id, token);
        setConsultaDetails(prev => prev ? { ...prev, anexos } : null);
      } catch (err) {
        console.error('Erro ao buscar anexos da consulta:', err);
      } finally {
        setLoadingAnexos(false);
      }
    }
  };

  const handleAttend = async (id: number) => {
    // Verificar se médico tem documentos verificados antes de atender
    if (isMedico && verificacao && verificacao !== 'verificado') {
      setShowDocsModal(true);
      return;
    }
    const appt = scheduledAppointments.find(a => a.id === id);
    if (appt?.status === 'solicitada') {
      try {
        const token = getToken();
        if (token) {
          await confirmarConsulta(id, token);

          // ✅ NOVO: Atualizar cache do SWR
          refreshConsultas();

          globalModal.success('Sucesso', 'Consulta confirmada com sucesso!');
        }
      } catch (error) {
        console.error('Erro ao confirmar consulta:', error);
        globalModal.error('Erro', 'Não foi possível confirmar a consulta.');
      }
    } else {
      router.push(`/consultas/atendimento?id=${id}&scheduled=true`);
    }
  };

  const handleCancelConsultation = async (id: number) => {
    globalModal.confirm(
      'Confirmar Cancelamento',
      'Tem certeza que deseja desmarcar esta consulta? Esta ação não pode ser desfeita.',
      async () => {
        try {
          const token = getToken();
          if (token) {
            await cancelarConsulta(id, token);

            // ✅ NOVO: Atualizar cache do SWR
            refreshConsultas();

            setSelectedAppt(null);
            globalModal.success('Sucesso', 'Consulta cancelada com sucesso!');
          }
        } catch (error) {
          console.error('Erro ao cancelar consulta:', error);
          globalModal.error('Erro', 'Não foi possível cancelar a consulta.');
        }
      }
    );
  };

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
    const isMed = (u?.tipo_usuario || '').toLowerCase() === 'medico';
    setIsMedico(isMed);
    setVerificacao(u?.verificacao);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 5);
      }
    };

    const el = scrollRef.current;
    if (el) {
      setTimeout(checkScroll, 100);
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) {
        el.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [scheduledAppointments]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 380;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <ErrorBoundary>
      <DashboardLayout>
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
                onClick={() => {
                  if (isMedico && verificacao && verificacao !== 'verificado') {
                    setShowDocsModal(true);
                    return;
                  }
                  router.push(isMedico ? '/consultas/pacientes' : '/consultas/pre-consulta');
                }}
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
                className="btn secondary btn-scheduling"
                style={{ marginTop: '1rem', width: 'fit-content', padding: '0.75rem 2rem', borderRadius: 'var(--radius-lg)' }}
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
            <div className="appointments-wrapper">
              {showLeftArrow && (
                <button className="scroll-btn left" onClick={() => scroll('left')} aria-label="Anterior">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
              )}
              <div className="appointments-list" ref={scrollRef}>
                {consultasError ? (
                  <div className="appointment-mini-card" style={{ background: 'var(--bg-error, #fee)' }}>
                    <div className="appt-details">
                      <p style={{ color: 'var(--color-error, #c33)' }}>
                        ⚠️ Erro ao carregar consultas. Tente recarregar a página.
                      </p>
                      <button
                        onClick={() => refreshConsultas()}
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.5rem 1rem',
                          background: 'var(--color-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="appointment-mini-card">
                    <div className="appt-details">
                      <p>Carregando informações...</p>
                    </div>
                  </div>
                ) : scheduledAppointments.length > 0 ? (
                  scheduledAppointments.map(appt => (
                    <MiniAppointmentCard
                      key={appt.id}
                      appointment={appt}
                      isMedico={isMedico}
                      onAttend={handleAttend}
                      onViewDetails={handleViewDetails}
                    />
                  ))
                ) : (
                  <div className="appointment-mini-card">
                    <div className="appt-details">
                      <p>Nenhum agendamento encontrado no momento.</p>
                    </div>
                  </div>
                )}
              </div>
              {showRightArrow && (
                <button className="scroll-btn right" onClick={() => scroll('right')} aria-label="Próximo">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              )}
            </div>
          </section>
        </div>
        <ConsultaDetailsModal
          isOpen={!!selectedAppt}
          onClose={() => setSelectedAppt(null)}
          consultaDetails={consultaDetails}
          selectedAppt={selectedAppt}
          isMedico={isMedico}
          loadingDetails={loadingDetails}
          loadingAnexos={loadingAnexos}
          canJoin={canJoin}
          timeRemaining={timeRemaining}
          onAttend={handleAttend}
          onCancel={handleCancelConsultation}
        />

        <Modal
          isOpen={globalModal.isOpen}
          config={globalModal.config}
          onConfirm={globalModal.onConfirm}
          onCancel={globalModal.onCancel}
        />
        <DocumentsRequiredModal
          open={showDocsModal}
          onClose={() => setShowDocsModal(false)}
          status={verificacao as any}
        />
      </DashboardLayout>
    </ErrorBoundary>
  );
}
