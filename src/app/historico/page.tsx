"use client";

import '../inicio/inicio.css';
import './historico.css';
import '@/components/layout/Header/header.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getUser, getUserFirstName, getToken } from '@/lib/auth';
import { psGetFullHistory, PSFullHistoryItem } from '@/lib/axios/consultas';
import ContentModal from '@/components/common/Modal/ContentModal';
import { formatDate, formatTime } from '@/lib/utils/dateFormatters';

export default function HistoricoPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [history, setHistory] = useState<PSFullHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedItem, setSelectedItem] = useState<PSFullHistoryItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [medicoRating, setMedicoRating] = useState<number | null>(null);

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

    const fetchMedicoRating = async () => {
      if (u?.tipo_usuario === 'medico') {
        try {
          const token = getToken();
          if (token) {
            const response = await fetch('/api/usuarios/me', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const profileData = await response.json();
            setMedicoRating(profileData.medico?.avaliacao || null);
          }
        } catch (error) {
          console.error('Error fetching medico rating:', error);
        }
      }
    };

    fetchHistory();
    fetchMedicoRating();
  }, []);

  const getParticipantName = (item: PSFullHistoryItem) => {
    if (userType === 'paciente') {
      return item.medico?.nome_completo || 'Médico não identificado';
    } else {
      return item.paciente?.nome_completo || 'Paciente não identificado';
    }
  };

  const filteredHistory = history.filter(item => {
    const nameMatch = getParticipantName(item).toLowerCase().includes(searchTerm.toLowerCase());

    let dateMatch = true;
    if (startDate || endDate) {
      const itemDate = new Date(item.createdAt);
      itemDate.setHours(0, 0, 0, 0);

      if (startDate) {
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const startLocal = new Date(sy, sm - 1, sd);
        if (itemDate < startLocal) dateMatch = false;
      }

      if (endDate && dateMatch) {
        const [ey, em, ed] = endDate.split('-').map(Number);
        const endLocal = new Date(ey, em - 1, ed);
        endLocal.setHours(23, 59, 59, 999);
        if (itemDate > endLocal) dateMatch = false;
      }
    }

    return nameMatch && dateMatch;
  });

  return (
    <DashboardLayout>
      <header className="dashboard-header" style={{ marginBottom: '0.75rem' }}>
        <h2>Meu Histórico</h2>
        <p>Consulte detalhes de atendimentos passados e documentos gerados.</p>
      </header>

      <div className="historico-main">
        {/* Filters Bar - Aligned with the content grid below */}
        <div className="history-filters">
          <div className="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '1rem', color: 'var(--text-tertiary)' }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              className="history-search-field"
              placeholder={userType === 'paciente' ? "Buscar por nome do médico..." : "Buscar por nome do paciente..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="date-filter-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <input
              type="date"
              className="date-range-input"
              title="Data inicial"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ color: 'var(--text-tertiary)' }}>-</span>
            <input
              type="date"
              className="date-range-input"
              title="Data final"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="history-content-grid">
          {/* List Side */}
          <div className="history-list-container">
            {loading ? (
              <div className="history-loading">
                <div className="pulse-loader"></div>
                <p>Carregando seu histórico de atendimentos...</p>
              </div>
            ) : filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <div key={item.id} className="history-item-card">
                  <div className="history-item-avatar">
                    {userType === 'paciente' ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    )}
                  </div>

                  <div className="history-item-main">
                    <div className="history-item-top">
                      <span className="history-item-name">{getParticipantName(item)}</span>
                    </div>
                    <div className="history-item-meta">
                      <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                        {formatDate(item.createdAt)}
                      </span>
                      <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="history-item-status">
                    <span className={`badge ${item.status === 'finished' ? 'success' : 'warning'}`}>
                      {item.status === 'finished' ? 'Finalizada' : 'Em andamento'}
                    </span>
                  </div>

                  <div className="history-item-actions">
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                        setShowDetails(true);
                      }}
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-history">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2, marginBottom: '1rem' }}>
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14.5 2 14.5 7.5 20 7.5" />
                </svg>
                <h3>Nenhum atendimento encontrado</h3>
                <p>Parece que você ainda não realizou consultas ou sua busca não retornou resultados.</p>
              </div>
            )}
          </div>

          {/* Sidebar Stats */}
          <aside className="stats-sidebar">
            <div className="stat-mini-card">
              <div className="stat-header">
                <h4>Total de Consultas</h4>
                <div className="stat-icon">📈</div>
              </div>
              <div className="stat-value">{history.length}</div>
              <div className="stat-label">Realizadas na plataforma</div>
            </div>

            {userType === 'medico' && (
              <div className="stat-mini-card">
                <div className="stat-header">
                  <h4>Avaliações</h4>
                  <div className="stat-icon">⭐</div>
                </div>
                <div className="stat-value">{medicoRating !== null ? medicoRating.toFixed(1) : '-'}</div>
                <div className="stat-label">Média de satisfação</div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Modal de Detalhes da Consulta */}
      <ContentModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Detalhes do Atendimento"
        size="md"
      >
        {selectedItem && (
          <div className="history-details-modal">
            <div className="details-section">
              <h4>Informações Gerais</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Data:</label>
                  <span>{selectedItem.data_consulta ? formatDate(selectedItem.data_consulta) : formatDate(selectedItem.createdAt)}</span>
                </div>
                <div className="detail-item">
                  <label>{userType === 'paciente' ? 'Médico:' : 'Paciente:'}</label>
                  <span>{getParticipantName(selectedItem)}</span>
                </div>
                <div className="detail-item">
                  <label>Hora Início:</label>
                  <span>{selectedItem.hora_inicio ? formatTime(selectedItem.hora_inicio) : '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Hora Fim:</label>
                  <span>{selectedItem.hora_fim ? formatTime(selectedItem.hora_fim) : '-'}</span>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h4>Diagnóstico</h4>
              <p className="detail-text">{selectedItem.diagnostico || 'Não registrado'}</p>
            </div>

            <div className="details-section">
              <h4>Evolução</h4>
              <p className="detail-text">{selectedItem.evolucao || 'Não registrada'}</p>
            </div>

            <div className="details-section">
              <h4>Plano Terapêutico</h4>
              <p className="detail-text">{selectedItem.plano_terapeutico || 'Não registrado'}</p>
            </div>

            <div className="details-grid-bottom">
              <div className="details-section">
                <h4>Repouso</h4>
                <p className="detail-text">{selectedItem.repouso || 'Não registrado'}</p>
              </div>
              <div className="details-section">
                <h4>Destino Final</h4>
                <p className="detail-text">{selectedItem.destino_final || 'Não registrado'}</p>
              </div>
            </div>
          </div>
        )}
      </ContentModal>
    </DashboardLayout>
  );
}
