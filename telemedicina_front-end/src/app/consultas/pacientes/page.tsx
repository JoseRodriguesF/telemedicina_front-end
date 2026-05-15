"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import styles from './Pacientes.module.css';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserFirstName, getToken, getUser } from '@/lib/auth';
import { psListFila, PSFilaItem, getConsulta, ConsultaDetails, getHistoriaClinica } from '@/lib/axios/consultas';
import { getTimeWaiting } from '@/lib/utils/dateFormatters';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ConsultaDetailsModal } from '@/components/appointments/ConsultaDetailsModal';

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
        ...hClinica,
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
              ...historyData,
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

  // Função para filtrar campos administrativos do prontuário de triagem
  const removeAdministrativeFields = (content: string): string => {
    if (!content) return content;

    const lines = content.split('\n');
    const filteredLines: string[] = [];
    let inHeader = true; // Iniciar assumindo que estamos no cabeçalho

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Se estamos no cabeçalho, verificar se é uma linha administrativa
      if (inHeader) {
        // Linhas que indicam cabeçalho administrativo
        if (
          trimmedLine.startsWith('---') ||
          trimmedLine.includes('PRONTUÁRIO DE TRIAGEM') ||
          trimmedLine.includes('ID DO PACIENTE:') ||
          trimmedLine.includes('DATA DA TRIAGEM:') ||
          trimmedLine.includes('RESPONSÁVEL:') ||
          trimmedLine.includes('⚠️ SÍNTESE DA CONDUTA:') ||
          trimmedLine.includes('PRÉ-CONSULTA') ||
          trimmedLine === '' // Linhas vazias no início
        ) {
          // Pular esta linha
          continue;
        } else {
          // Encontramos conteúdo real, não estamos mais no cabeçalho
          inHeader = false;
          filteredLines.push(line);
        }
      } else {
        // Já saímos do cabeçalho, incluir tudo
        filteredLines.push(line);
      }
    }

    return filteredLines.join('\n').trim();
  };

  const getPriority = (historiaClinica: any) => {
    if (!historiaClinica || !historiaClinica.conteudo) return { label: 'Normal', color: 'var(--color-primary-500)', bg: 'var(--color-primary-50)' };
    const content = historiaClinica.conteudo.toLowerCase();
    
    // Simple regex/keyword heuristic for urgency
    if (content.includes('dor no peito') || content.includes('falta de ar') || content.includes('desmaio') || content.includes('hemorragia') || content.includes('convulsão')) {
      return { label: 'Urgente', color: 'var(--color-error)', bg: 'var(--color-error-soft)' };
    }
    if (content.includes('dor forte') || content.includes('febre alta') || content.includes('sangramento') || content.includes('fratura')) {
      return { label: 'Prioridade', color: '#f59e0b', bg: '#fef3c7' }; // Yellow/Amber
    }
    return { label: 'Normal', color: 'var(--color-primary-500)', bg: 'var(--color-primary-50)' };
  };


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
                  .map((p) => {
                    const prio = getPriority(Array.isArray(p.historiaClinica) ? p.historiaClinica[0] : null);
                    return (
                    <div key={p.consultaId} className={styles['pac-card']}>
                      <div className={styles['priority-badge']} style={{ color: prio.color, backgroundColor: prio.bg, fontWeight: 700 }}>
                        {prio.label}
                      </div>
                      <div className={styles['pac-card-header']}>
                        <div className={styles['pac-info']}>
                          <h3>
                            Paciente
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
                    );
                  })}
              </div>
            )}
          </>
        )}

        <ConsultaDetailsModal
          isOpen={!!selectedPaciente}
          onClose={handleCloseDetails}
          consultaDetails={consultaDetails}
          selectedAppt={{ id: selectedPaciente?.consultaId, paciente: consultaDetails?.paciente, status: selectedPaciente?.status }}
          isMedico={isMedico}
          loadingDetails={loadingDetails}
          loadingAnexos={false}
          onAttend={(id) => router.push(`/consultas/atendimento?id=${encodeURIComponent(id)}`)}
        />
      </div>
    </DashboardLayout>
  );
}
