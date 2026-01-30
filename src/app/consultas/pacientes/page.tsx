"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import styles from './Pacientes.module.css';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserFirstName, getToken, getUser } from '@/lib/auth';
import { psListFila } from '@/lib/axios/consultas';
import { getTimeWaiting } from '@/lib/utils/dateFormatters';
import DashboardLayout from '@/components/layout/DashboardLayout';

const POLL_MS = 5000;

export default function PacientesPage() {
  const router = useRouter();
  const [medicoNome, setMedicoNome] = useState('');

  useEffect(() => {
    setMedicoNome(getUserFirstName());
  }, []);

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
                          className="btn primary"
                          style={{ width: '100%', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                          onClick={() => router.push(`/consultas/atendimento?id=${encodeURIComponent(p.consultaId)}`)}
                        >
                          <span>Iniciar Atendimento</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
