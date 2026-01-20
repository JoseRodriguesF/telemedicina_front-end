"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import './pacientes.css';

import Sidebar from '@/components/layout/Sidebar/Sidebar';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUserFirstName, getToken, getUser } from '@/lib/auth';
import { psListFila, PSFilaItem } from '@/lib/axios/consultas';

const POLL_MS = 5000;

export default function PacientesPage() {
  const router = useRouter();
  const [medicoNome, setMedicoNome] = useState('');
  const [pacientes, setPacientes] = useState<PSFilaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time calculation helper
  const getTimeWaiting = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffMins = Math.floor((now - start) / 60000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    return `${hours}h ${diffMins % 60}min`;
  };

  useEffect(() => {
    setMedicoNome(getUserFirstName());
    const token = getToken();
    let mounted = true;

    const fetchList = async () => {
      if (!token) {
        if (mounted) {
          setError('Faça login como médico para ver a fila.');
          setLoading(false);
        }
        return;
      }
      const u = getUser();
      if (u?.tipo_usuario !== 'medico') {
        if (mounted) {
          setError('Apenas médicos podem ver a fila de pacientes.');
          setLoading(false);
        }
        return;
      }
      try {
        const list = await psListFila(token);
        if (mounted) {
          // Ordenar por tempo de espera (mais antigo primeiro)
          const sorted = list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          setPacientes(sorted);
          setError(null);
        }
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.error || 'Simulando: Lista vazia ou erro API');
        // Fallback for demo if API fails
        if (mounted && process.env.NODE_ENV === 'development' && pacientes.length === 0) {
          // Optional: seeding fake data for UI test if empty
          // setPacientes([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchList();
    const id = setInterval(fetchList, POLL_MS);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const totalWaiting = pacientes.filter(p => p.status === 'scheduled').length;

  return (
    <div className="inicio-page">
      <div className="inicio-mobile-header">
        <MobileHeader />
      </div>
      <Sidebar activeId="consultas" />

      <main className="inicio-main">
        <div className="pacientes-container">
          <header className="pacientes-header">
            <div>
              <h2>Fila de Espera</h2>
              <p>Gerencie o fluxo de pacientes do Pronto Atendimento</p>
            </div>
            {/* Optional: Add a refresh button or status indicator */}
          </header>

          <div className="queue-status-bar">
            <div className="queue-stat">
              <span className="label">Em Espera</span>
              <span className="value">{totalWaiting}</span>
            </div>
            <div className="queue-stat">
              <span className="label">Tempo Médio</span>
              <span className="value">-- min</span>
            </div>
            <div className="queue-stat" style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
              <span className="label">Médico</span>
              <span className="value" style={{ fontSize: '1.1rem' }}>Dr(a). {medicoNome}</span>
            </div>
          </div>

          {loading && pacientes.length === 0 ? (
            <div className="loading-skeleton">
              <div className="spinner"></div>
              <p>Atualizando fila em tempo real...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p style={{ color: 'var(--color-error)' }}>{error}</p>
            </div>
          ) : (
            <>
              {totalWaiting === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.2 }}>☕</div>
                  <h3>Fila vazia</h3>
                  <p>Nenhum paciente aguardando atendimento no momento.</p>
                </div>
              ) : (
                <div className="pac-list-grid">
                  {pacientes
                    .filter((p) => p.status === 'scheduled')
                    .map((p) => (
                      <div key={p.consultaId} className="pac-card">
                        <div className="priority-badge">Normal</div>
                        <div className="pac-card-header">
                          <div className="pac-info">
                            <h3>
                              Paciente
                              <span className="pac-id">#{p.pacienteId}</span>
                            </h3>
                            <div className="pac-time">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                              Aguardando há {getTimeWaiting(p.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div className="pac-card-actions">
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
      </main>
    </div>
  );
}
