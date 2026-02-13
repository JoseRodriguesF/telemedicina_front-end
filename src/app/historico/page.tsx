"use client";

import '../inicio/inicio.css';
import './historico.css';
import '@/components/layout/Header/header.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getUser, getUserFirstName, getToken } from '@/lib/auth';
import { PSFullHistoryItem, searchHistoricoConsultas } from '@/lib/axios/consultas';
// ✅ NOVO: Importar hooks otimizados
import { useHistoricoCompleto, useUserProfile } from '@/hooks/useApiData';
import { useDebounce } from '@/hooks/useOptimization';
import ContentModal from '@/components/common/Modal/ContentModal';
import { formatDate, formatTime } from '@/lib/utils/dateFormatters';

export default function HistoricoPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [userType, setUserType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedItem, setSelectedItem] = useState<PSFullHistoryItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchResults, setSearchResults] = useState<PSFullHistoryItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'atendimentos' | 'prescricoes'>('atendimentos');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ✅ NOVO: Usar hooks otimizados
  const { historico: history, isLoading: loadingInternal } = useHistoricoCompleto();
  const { profile } = useUserProfile();

  const loading = loadingInternal;

  // ✅ NOVO: Debounce na busca para evitar renderizações excessivas
  const debouncedSearch = useDebounce(searchTerm, 300);

  const medicoRating = profile?.medico?.avaliacao || null;

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
    setUserType(u?.tipo_usuario || '');
  }, []);

  // ✅ NOVO: Buscar via API quando o termo de busca mudar
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults(null);
        return;
      }

      setIsSearching(true);
      try {
        const token = getToken();
        if (token) {
          const results = await searchHistoricoConsultas(debouncedSearch, token);
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Erro ao buscar consultas:', error);
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearch]);

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
      case 'agendada': return 'Confirmada';
      case 'solicitada': return 'Solicitada';
      case 'cancelled': return 'Cancelada';
      case 'in_progress': return 'Em andamento';
      case 'scheduled': return 'Pronto Atendimento';
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'finished': return 'success';
      case 'agendada': return 'info';
      case 'solicitada': return 'warning';
      case 'cancelled': return 'danger';
      case 'in_progress': return 'primary';
      case 'scheduled': return 'secondary';
      default: return 'ghost';
    }
  };

  // ✅ OTIMIZADO: Usar searchResults da API ou filtro local
  const dataSource = searchResults !== null ? searchResults : history;

  const filteredHistory = dataSource.filter(item => {
    const nameMatch = searchResults !== null ? true : getParticipantName(item).toLowerCase().includes(debouncedSearch.toLowerCase());

    let statusMatch = true;
    if (filterStatus !== 'all') statusMatch = item.status === filterStatus;

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

    return nameMatch && statusMatch && dateMatch;
  });

  // Extrair prescrições das consultas filtradas
  const allPrescriptions = filteredHistory.flatMap((consulta: PSFullHistoryItem) =>
    (consulta.prescricoes || []).map((p: any) => ({
      ...p,
      consultaStatus: consulta.status,
      medicoNome: consulta.medico?.nome_completo,
      pacienteNome: consulta.paciente?.nome_completo,
      consultaData: consulta.data_consulta || consulta.createdAt
    }))
  );

  const totalAtendimentos = history.length;
  const totalPrescricoes = history.reduce((acc, c) => acc + (c.prescricoes?.length || 0), 0);

  return (
    <DashboardLayout>
      <header className="dashboard-header" style={{ marginBottom: '0.75rem' }}>
        <h2>Meu Histórico</h2>
        <p>Consulte detalhes de atendimentos, prescrições e documentos gerados.</p>
      </header>

      <div className="historico-main">
        <div className="history-tabs">
          <button
            className={`tab-btn ${activeTab === 'atendimentos' ? 'active' : ''}`}
            onClick={() => setActiveTab('atendimentos')}
          >
            Atendimentos ({totalAtendimentos})
          </button>
          <button
            className={`tab-btn ${activeTab === 'prescricoes' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('prescricoes');
              setFilterStatus('all');
            }}
          >
            Prescrições ({totalPrescricoes})
          </button>
        </div>

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

        <div className="status-filters">
          <button className={`btn ${filterStatus === 'all' ? 'primary' : 'ghost'}`} onClick={() => setFilterStatus('all')}>Todos</button>

          {activeTab === 'atendimentos' && (
            <>
              <button className={`btn ${filterStatus === 'finished' ? 'primary' : 'ghost'}`} onClick={() => setFilterStatus('finished')}>Finalizadas</button>
              <button className={`btn ${filterStatus === 'agendada' ? 'primary' : 'ghost'}`} onClick={() => setFilterStatus('agendada')}>Agendadas</button>
              <button className={`btn ${filterStatus === 'solicitada' ? 'primary' : 'ghost'}`} onClick={() => setFilterStatus('solicitada')}>Solicitadas</button>
              <button className={`btn ${filterStatus === 'cancelled' ? 'primary' : 'ghost'}`} onClick={() => setFilterStatus('cancelled')}>Canceladas</button>
              <button className={`btn ${filterStatus === 'in_progress' ? 'primary' : 'ghost'}`} onClick={() => setFilterStatus('in_progress')}>Em andamento</button>
            </>
          )}
        </div>

        <div className="history-content-grid">
          <div className="history-list-container">
            {loading || isSearching ? (
              <div className="history-loading">
                <div className="pulse-loader"></div>
                <p>{isSearching ? 'Buscando dados...' : 'Carregando seu histórico...'}</p>
              </div>
            ) : activeTab === 'atendimentos' ? (
              filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <div key={item.id} className="history-item-card" onClick={() => { setSelectedItem(item); setShowDetails(true); }}>
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
                      <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </div>

                    <div className="history-item-actions">
                      <button className="action-btn">Ver Detalhes</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-history">
                  <h3>Nenhum atendimento encontrado</h3>
                  <p>Ajuste os filtros ou realize novas consultas.</p>
                </div>
              )
            ) : (
              /* Aba de Prescrições */
              allPrescriptions.length > 0 ? (
                allPrescriptions.map((presc, idx) => (
                  <div key={`${presc.id}-${idx}`} className="history-item-card">
                    <div className="history-item-avatar" style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5" /><path d="M12 12V2" /><path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /><path d="m15 13-3-3-3 3" /></svg>
                    </div>

                    <div className="history-item-main">
                      <div className="history-item-top">
                        <span className="history-item-name">{presc.medicamento}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>{presc.marca || 'Genérico'}</span>
                      </div>
                      <div className="history-item-meta">
                        <span title="Dosagem"><strong>Dosagem:</strong> {presc.dosagem}</span>
                        <span title="Frequência"><strong>Freq.:</strong> {presc.frequencia}</span>
                        <span title="Duração"><strong>Dur.:</strong> {presc.duracao}</span>
                      </div>
                      <div className="history-item-meta" style={{ marginTop: '0.25rem' }}>
                        <span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                          {userType === 'paciente' ? `Dr. ${presc.medicoNome}` : `Paciente: ${presc.pacienteNome}`}
                        </span>
                        <span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                          {formatDate(presc.consultaData)}
                        </span>
                      </div>
                    </div>

                    <div className="history-item-status">
                      <span className={`badge ${getStatusBadgeClass(presc.consultaStatus)}`}>
                        Consulta {getStatusLabel(presc.consultaStatus)}
                      </span>
                    </div>

                    <div className="history-item-actions">
                      <button className="action-btn" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: 'none' }}>Baixar PDF</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-history">
                  <h3>Nenhuma prescrição encontrada</h3>
                  <p>Prescrições aparecem aqui após serem geradas em consulta.</p>
                </div>
              )
            )}
          </div>

          <aside className="stats-sidebar">
            <div className="stat-mini-card">
              <div className="stat-header">
                <h4>Total de Consultas</h4>
                <div className="stat-icon">📈</div>
              </div>
              <div className="stat-value">{totalAtendimentos}</div>
              <div className="stat-label">Realizadas na plataforma</div>
            </div>

            <div className="stat-mini-card">
              <div className="stat-header">
                <h4>Prescrições</h4>
                <div className="stat-icon">💊</div>
              </div>
              <div className="stat-value">{totalPrescricoes}</div>
              <div className="stat-label">Documentos gerados</div>
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

            {selectedItem.prescricoes && selectedItem.prescricoes.length > 0 && (
              <div className="details-section" style={{ marginTop: '1.5rem' }}>
                <h4>Prescrições vinculadas</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedItem.prescricoes.map((p: any) => (
                    <div key={p.id} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.medicamento}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.dosagem} - {p.frequencia} - {p.duracao}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ContentModal>
    </DashboardLayout>
  );
}
