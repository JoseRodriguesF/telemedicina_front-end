"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import styles from './Pacientes.module.css';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserFirstName, getToken, getUser } from '@/lib/auth';
import ContentModal from '@/components/common/Modal/ContentModal';
import { psListFila, PSFilaItem, getConsulta, ConsultaDetails } from '@/lib/axios/consultas';
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
    setLoadingDetails(true);
    try {
      const token = getToken();
      if (token) {
        const data = await getConsulta(paciente.consultaId, token);
        setConsultaDetails(data);
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes da consulta:", error);
    } finally {
      setLoadingDetails(false);
    }
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
          title={`Detalhes do Paciente #${selectedPaciente?.pacienteId}`}
          size="md"
        >
          {loadingDetails ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
            </div>
          ) : consultaDetails ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {consultaDetails.paciente && (
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                  <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Paciente</h4>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{consultaDetails.paciente.nome_completo || 'Nome não disponível'}</p>
                </div>
              )}

              {consultaDetails.historiaClinica ? (
                <>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Queixa Principal</h4>
                    <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.6 }}>{consultaDetails.historiaClinica.queixaPrincipal || '-'}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Sintomas</h4>
                      <p style={{ margin: 0, fontSize: '1rem' }}>{consultaDetails.historiaClinica.sintomas || '-'}</p>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Duração</h4>
                      <p style={{ margin: 0, fontSize: '1rem' }}>{consultaDetails.historiaClinica.tempoSintomas || '-'}</p>
                    </div>
                  </div>

                  {consultaDetails.historiaClinica.historico && (
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Histórico / Observações</h4>
                      <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{consultaDetails.historiaClinica.historico}</p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)' }}>
                  <p>Nenhuma pré-história clínica disponível.</p>
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  className="btn secondary"
                  onClick={handleCloseDetails}
                  style={{ borderRadius: 'var(--radius-lg)' }}
                >
                  Fechar
                </button>
                <button
                  className="btn primary"
                  onClick={() => router.push(`/consultas/atendimento?id=${encodeURIComponent(selectedPaciente?.consultaId || '')}`)}
                  style={{ borderRadius: 'var(--radius-lg)' }}
                >
                  Iniciar Atendimento
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              Não foi possível carregar os detalhes.
            </div>
          )}
        </ContentModal>
      </div>
    </DashboardLayout>
  );
}
