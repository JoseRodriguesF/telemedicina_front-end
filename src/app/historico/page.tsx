"use client";

import '../inicio/inicio.css';
import './historico.css';
import '@/components/layout/Header/header.css';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { getUser, getUserFirstName, getToken } from '@/lib/auth';
import { psGetFullHistory, PSFullHistoryItem } from '@/lib/axios/consultas';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';

export default function HistoricoPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [history, setHistory] = useState<PSFullHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string>('');

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
    setUserType(u?.tipo_usuario || '');

    const fetchHistory = async () => {
      try {
        const token = getToken();
        if (token) {
          const data = await psGetFullHistory(token);
          setHistory(data);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const getParticipantName = (item: PSFullHistoryItem) => {
    if (userType === 'paciente') {
      return item.medico?.nome_completo || 'Médico não identificado';
    } else {
      return item.paciente?.nome_completo || 'Paciente não identificado';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'finished': return 'Finalizada';
      case 'in_progress': return 'Em andamento';
      default: return status;
    }
  };

  return (
    <div className="inicio-page">
      <div className="inicio-mobile-header">
        <MobileHeader />
      </div>
      <Sidebar activeId="historico" />

      <main className="inicio-main">
        <header className="dashboard-header">
          <h2>Histórico</h2>
          <p>Acesse detalhes de suas consultas e prescrições anteriores</p>
        </header>

        <section className="dashboard-grid">
          <div className="dash-card featured">
            <div className="dash-card-header">
              <h3>Consultas Anteriores</h3>
              <div className="dash-card-icon">
                <Image src="/icons/icon-checklist.png" alt="Ícone Histórico" width={24} height={24} />
              </div>
            </div>
            <div className="dash-card-body" style={{ padding: '1rem 0' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ marginBottom: '1rem' }}>⌛</div>
                  <p>Carregando seu histórico...</p>
                </div>
              ) : history.length > 0 ? (
                <div className="history-list">
                  {history.map((item) => (
                    <div key={item.id} className="history-item-modal">
                      <div className="history-item-icon">
                        {userType === 'paciente' ? '👨‍⚕️' : '👤'}
                      </div>
                      <div className="history-item-details">
                        <div className="history-item-header">
                          <span className="history-item-name">{getParticipantName(item)}</span>
                          <span className={`history-item-status status-${item.status}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                        <div className="history-item-footer">
                          <span className="history-item-date">
                            📅 {formatDate(item.createdAt)}
                          </span>
                          <span className="history-item-id">ID: #{item.id}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>📂</div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                    Nenhuma consulta encontrada
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto' }}>
                    Seu histórico de atendimentos aparecerá aqui assim que você realizar sua primeira consulta.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Resumo de Saúde</h3>
              <div className="dash-card-icon">
                <Image src="/icons/icon-chart.png" alt="Ícone Gráfico" width={24} height={24} />
              </div>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Acompanhe a evolução do seu bem-estar através dos dados coletados em suas consultas.
              </p>
            </div>
            <div className="dash-card-footer">Dados atualizados após cada consulta.</div>
          </div>
        </section>
      </main>
    </div>
  );
}

