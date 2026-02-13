"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import styles from './Pacientes.module.css';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserFirstName, getToken, getUser } from '@/lib/auth';
import ContentModal from '@/components/common/Modal/ContentModal';
import { psListFila, PSFilaItem, getConsulta, ConsultaDetails, getHistoriaClinica } from '@/lib/axios/consultas';
import FormattedText from '@/components/common/FormattedText';
import { getTimeWaiting } from '@/lib/utils/dateFormatters';
import DashboardLayout from '@/components/layout/DashboardLayout';

const POLL_MS = 5000;

export default function PacientesPage() {
  const router = useRouter();
  const [medicoNome, setMedicoNome] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<PSFilaItem | null>(null);
  const [consultaDetails, setConsultaDetails] = useState<ConsultaDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    setMedicoNome(getUserFirstName());
  }, []);

  const handleViewDetails = async (paciente: PSFilaItem) => {
    setSelectedPaciente(paciente);

    const hClinica = Array.isArray(paciente.historiaClinica) && paciente.historiaClinica.length > 0
      ? paciente.historiaClinica[0]
      : null;

    // Objeto parcial inicial
    const details: ConsultaDetails = {
      id: Number(paciente.consultaId),
      pacienteId: Number(paciente.pacienteId),
      medicoId: null,
      status: paciente.status,
      createdAt: paciente.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paciente: {
        id: Number(paciente.pacienteId),
        nome_completo: paciente.pacienteNome || 'Paciente #' + paciente.pacienteId,
        cpf: '',
        sexo: '',
        data_nascimento: '',
        telefone: ''
      },
      historiaClinica: hClinica ? {
        conteudo: hClinica.conteudo
      } : undefined
    };

    // Fallback: se não veio na lista por algum motivo (embora agora venha)
    if (!details.historiaClinica?.conteudo && (paciente as any).historiaClinicaId) {
      setLoadingDetails(true);
      try {
        const token = getToken();
        if (token) {
          const historyData = await getHistoriaClinica((paciente as any).historiaClinicaId, token);
          if (historyData) {
            details.historiaClinica = {
              conteudo: historyData.conteudo
            };
          }
        }
      } catch (error) {
        console.error("Erro ao buscar história clínica detalhada:", error);
      } finally {
        setLoadingDetails(false);
      }
    } else {
      setLoadingDetails(false);
    }

    setConsultaDetails(details);
  };

  const handleCloseDetails = () => {
    setSelectedPaciente(null);
    setConsultaDetails(null);
  };

  const token = getToken();
  const user = getUser();
  const isMedico = user?.tipo_usuario === 'medico';

  const {
    data: pacientes = [],
    isLoading,
    error: queryError
  } = useQuery({
    queryKey: ['fila-pacientes'],
    queryFn: async () => {
      if (!token) throw new Error('Faça login como médico para ver a fila.');
      if (!isMedico) throw new Error('Apenas médicos podem ver a fila de pacientes.');
      const list = await psListFila(token);
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },
    enabled: !!token && isMedico,
    refetchInterval: POLL_MS,
  });

  const totalWaiting = pacientes.filter(p => p.status === 'scheduled').length;
  const error = queryError ? (queryError as any).message : null;

  return (
    <DashboardLayout>
      <div className={styles['pacientes-container']}>
        <header className={styles['pacientes-header']}>
          <div>
            <h2>Fila de Espera</h2>
            <p>Gerencie o fluxo de pacientes do Pronto Atendimento</p>
          </div>
        </header>

        <div className={styles['queue-status-bar']}>
          <div className={styles['queue-stat']}>
            <span className={styles.label}>Em Espera</span>
            <span className={styles.value}>{totalWaiting}</span>
          </div>
          <div className={styles['queue-stat']}>
            <span className={styles.label}>Tempo Médio</span>
            <span className={styles.value}>-- min</span>
          </div>
          <div className={styles['queue-stat']} style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
            <span className={styles.label}>Médico</span>
            <span className={styles.value} style={{ fontSize: '1.1rem' }}>Dr(a). {medicoNome}</span>
          </div>
        </div>

        {isLoading && pacientes.length === 0 ? (
          <div className={styles['loading-skeleton']}>
            <div className="spinner"></div>
            <p>Atualizando fila em tempo real...</p>
          </div>
        ) : error ? (
          <div className={styles['empty-state']}>
            <p style={{ color: 'var(--color-error)' }}>{error}</p>
          </div>
        ) : (
          <>
            {totalWaiting === 0 ? (
              <div className={styles['empty-state']}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.2 }}>☕</div>
                <h3>Fila vazia</h3>
                <p>Nenhum paciente aguardando atendimento no momento.</p>
              </div>
            ) : (
              <div className={styles['pac-list-grid']}>
                {pacientes
                  .filter((p) => p.status === 'scheduled')
                  .map((p) => (
                    <div key={p.consultaId} className={styles['pac-card']}>
                      <div className={styles['priority-badge']}>Normal</div>
                      <div className={styles['pac-card-header']}>
                        <div className={styles['pac-info']}>
                          <h3>
                            Paciente
                            <span className={styles['pac-id']}>#{p.pacienteId}</span>
                          </h3>
                          <div className={styles['pac-time']}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            Aguardando há {getTimeWaiting(p.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className={styles['pac-card-actions']}>
                        <button
                          className="btn secondary"
                          style={{ flex: 1, borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(p);
                          }}
                        >
                          <span>Ver Detalhes</span>
                        </button>
                        <button
                          className="btn primary"
                          style={{ flex: 1, borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem' }}
                          onClick={() => router.push(`/consultas/atendimento?id=${encodeURIComponent(p.consultaId)}`)}
                        >
                          <span>Atender</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        <ContentModal
          isOpen={!!selectedPaciente}
          onClose={handleCloseDetails}
          title="Ficha de Pré-Atendimento"
          size="md"
        >
          {loadingDetails ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner"></div>
            </div>
          ) : consultaDetails ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '0.5rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paciente</h4>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{consultaDetails.paciente?.nome_completo || 'Paciente'}</p>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>ID: #{consultaDetails.pacienteId}</span>
              </div>

              {consultaDetails.historiaClinica ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
                  <div className="detail-group">
                    <h4 style={{ margin: '0 0 0.75rem', color: 'var(--color-primary-600)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14.5 2 14.5 7.5 20 7.5" /></svg>
                      História Clínica (Triagem)
                    </h4>
                    <div style={{
                      padding: '1.25rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-color)',
                    }}>
                      <FormattedText
                        text={consultaDetails.historiaClinica.conteudo || 'Não informada'}
                        style={{
                          fontSize: '1rem',
                          color: 'var(--text-primary)',
                          lineHeight: 1.7
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', color: 'var(--text-tertiary)', border: '2px dashed var(--border-color)' }}>
                  <p>Informações de triagem não encontradas.</p>
                </div>
              )}

              <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button
                  className="btn secondary"
                  onClick={handleCloseDetails}
                  style={{ borderRadius: 'var(--radius-lg)', padding: '0.8rem' }}
                >
                  Fechar
                </button>
                <button
                  className="btn primary"
                  onClick={() => router.push(`/consultas/atendimento?id=${encodeURIComponent(selectedPaciente?.consultaId || '')}`)}
                  style={{ borderRadius: 'var(--radius-lg)', padding: '0.8rem' }}
                >
                  Atender agora
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
              Erro ao carregar os detalhes.
            </div>
          )}
        </ContentModal>
      </div>
    </DashboardLayout>
  );
}
