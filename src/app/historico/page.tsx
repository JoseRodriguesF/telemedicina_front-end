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
import { downloadPrescricaoPdf } from '@/lib/axios/prescricoes';
import ContentModal from '@/components/common/Modal/ContentModal';
import { formatDate, formatTime } from '@/lib/utils/dateFormatters';
import FormattedText from '@/components/common/FormattedText';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function HistoricoPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [userType, setUserType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedItem, setSelectedItem] = useState<PSFullHistoryItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [showPrescriptionDetails, setShowPrescriptionDetails] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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

  const generatePDF = async (presc: any) => {
    setIsGeneratingPDF(true);
    // Pequeno delay para garantir que o template com os dados corretos foi renderizado
    setSelectedPrescription(presc);

    setTimeout(async () => {
      const element = document.getElementById('prescription-pdf-template');
      if (!element) {
        setIsGeneratingPDF(false);
        return;
      }

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Prescricao_${presc.medicamento}_${formatDate(presc.consultaData)}.pdf`);
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 500);
  };

  const handleDownloadRealPdf = async (presc: any) => {
    const token = getToken();
    if (!token || !presc.id) return;

    setIsGeneratingPDF(true);
    setSelectedPrescription(presc);

    try {
      const blob = await downloadPrescricaoPdf(presc.id, token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Prescricao_${presc.medicamento}_${formatDate(presc.consultaData)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      // Fallback para geração local se o usuário desejar, ou apenas erro
      // generatePDF(presc); 
    } finally {
      setIsGeneratingPDF(false);
    }
  };

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
                  <div
                    key={`${presc.id}-${idx}`}
                    className="history-item-card prescription-card"
                    onClick={() => { setSelectedPrescription(presc); setShowPrescriptionDetails(true); }}
                  >
                    <div className="history-item-avatar">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5" /><path d="M12 12V2" /><path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /><path d="m15 13-3-3-3 3" /></svg>
                    </div>

                    <div className="history-item-main">
                      <div className="history-item-top">
                        <span className="history-item-name">{presc.medicamento}</span>
                        <span className="prescription-brand">{presc.marca || 'Genérico'}</span>
                      </div>

                      <div className="prescription-info-grid">
                        <div className="prescription-info-item">
                          <label>Dosagem</label>
                          <span>{presc.dosagem}</span>
                        </div>
                        <div className="prescription-info-item">
                          <label>Frequência</label>
                          <span>{presc.frequencia}</span>
                        </div>
                        <div className="prescription-info-item">
                          <label>Duração</label>
                          <span>{presc.duracao}</span>
                        </div>
                      </div>

                      <div className="history-item-meta" style={{ marginTop: '0.75rem' }}>
                        <span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                          {userType === 'paciente' ? `Dr(a). ${presc.medicoNome}` : `Paciente: ${presc.pacienteNome}`}
                        </span>
                        <span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                          {formatDate(presc.consultaData)}
                        </span>
                      </div>
                    </div>

                    <div className="history-item-actions">
                      <button
                        className="action-btn-secondary btn-download"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadRealPdf(presc);
                        }}
                        disabled={!presc.tem_pdf || (isGeneratingPDF && selectedPrescription?.id === presc.id)}
                        style={{
                          opacity: presc.tem_pdf ? 1 : 0.3,
                          cursor: presc.tem_pdf ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {isGeneratingPDF && selectedPrescription?.id === presc.id ? (
                          <span className="flex items-center gap-2">
                            <div className="mini-spinner"></div> Gerando...
                          </span>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem' }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                            </svg>
                            PDF
                          </>
                        )}
                      </button>
                      <button className="action-btn-secondary">Detalhes</button>
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

            {selectedItem.historiaClinica && selectedItem.historiaClinica.length > 0 && (
              <div className="details-section">
                <h4>História Clínica (Triagem)</h4>
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                }}>
                  <FormattedText
                    text={selectedItem.historiaClinica[0].conteudo}
                    style={{
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.6
                    }}
                  />
                </div>
              </div>
            )}

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

      {/* Modal de Detalhes da Prescrição */}
      <ContentModal
        isOpen={showPrescriptionDetails}
        onClose={() => setShowPrescriptionDetails(false)}
        title="Detalhes da Prescrição"
        size="md"
      >
        {selectedPrescription && (
          <div className="prescription-details-container">
            <div className="prescription-header-info">
              <div>
                <h3 className="prescription-medication-title">{selectedPrescription.medicamento}</h3>
                <span className="prescription-brand">{selectedPrescription.marca || 'Laboratório Genérico'}</span>
              </div>
              <button
                className="action-btn btn-download"
                style={{
                  opacity: selectedPrescription.tem_pdf ? 1 : 0.3,
                  cursor: selectedPrescription.tem_pdf ? 'pointer' : 'not-allowed'
                }}
                onClick={() => handleDownloadRealPdf(selectedPrescription)}
                disabled={!selectedPrescription.tem_pdf || isGeneratingPDF}
              >
                {isGeneratingPDF ? 'Baixando...' : 'Baixar PDF'}
              </button>
            </div>

            <div className="prescription-details-grid">
              <div className="prescription-detail-box">
                <label>Dosagem</label>
                <span>{selectedPrescription.dosagem}</span>
              </div>
              <div className="prescription-detail-box">
                <label>Frequência</label>
                <span>{selectedPrescription.frequencia}</span>
              </div>
              <div className="prescription-detail-box">
                <label>Duração</label>
                <span>{selectedPrescription.duracao}</span>
              </div>
              <div className="prescription-detail-box">
                <label>Data da Consulta</label>
                <span>{formatDate(selectedPrescription.consultaData)}</span>
              </div>
            </div>

            <div className="details-section">
              <h4>Informações Adicionais</h4>
              <div className="prescription-detail-box" style={{ background: 'var(--bg-secondary)' }}>
                <label>Médico Responsável</label>
                <p style={{ fontWeight: 700, margin: '0.25rem 0' }}>Dr(a). {selectedPrescription.medicoNome}</p>

                <label style={{ marginTop: '1rem' }}>Paciente</label>
                <p style={{ fontWeight: 600, margin: '0.25rem 0' }}>{selectedPrescription.pacienteNome}</p>
              </div>
            </div>

            {selectedPrescription.orientacoes && (
              <div className="details-section">
                <h4>Orientações</h4>
                <div className="detail-text">
                  {selectedPrescription.orientacoes}
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Prescrição gerada via Plataforma JJ Telemedicina
            </div>
          </div>
        )}
      </ContentModal>

      {/* Template para o PDF (Invisível) - Design de Prescrição Realista */}
      {selectedPrescription && (
        <div id="prescription-pdf-template">
          <div className="pdf-watermark">JJ TELEMEDICINA</div>
          <div className="pdf-inner-border"></div>

          <div className="pdf-header">
            <div className="pdf-logo-wrapper">
              <div className="pdf-logo-circle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22v-5" /><path d="M12 12V2" /><path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /><path d="m15 13-3-3-3 3" />
                </svg>
              </div>
              <div className="pdf-logo-text">
                <h1>JJ Telemedicina</h1>
                <p>Cuidado Digital de Excelência</p>
              </div>
            </div>
            <div className="pdf-header-meta">
              <div>JJ Serviços Médicos e Tecnológicos Ltda.</div>
              <div>CNPJ: 00.000.000/0001-00</div>
              <div>contato@jjtelemedicina.com.br</div>
              <div>www.jjtelemedicina.com.br</div>
            </div>
          </div>

          <div className="pdf-title-section">
            <h2 className="pdf-title-main">Receituário</h2>
            <p className="pdf-title-sub">Prescrição Médica Digital</p>
          </div>

          <div className="pdf-patient-section">
            <span className="pdf-patient-label">Para:</span>
            <p className="pdf-patient-name">{selectedPrescription.pacienteNome}</p>
          </div>

          <div className="pdf-prescription-body">
            <div className="pdf-med-item">
              <span className="pdf-med-number">1.</span>
              <div className="pdf-med-name-row">
                <span className="pdf-med-name">{selectedPrescription.medicamento} {selectedPrescription.dosagem}</span>
                <span className="pdf-med-quantity">1 Unidade</span>
              </div>

              <div className="pdf-instructions-box">
                <div className="pdf-instruction-line">
                  <span className="pdf-instruction-label">Uso:</span>
                  {selectedPrescription.orientacoes || `Tomar conforme orientação: ${selectedPrescription.frequencia} por ${selectedPrescription.duracao}.`}
                </div>
                {selectedPrescription.marca && (
                  <div className="pdf-instruction-line" style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                    <span className="pdf-instruction-label">Obs:</span> Preferência por marca {selectedPrescription.marca}.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pdf-footer">
            <div className="pdf-seal-wrapper">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="pdf-signature-area">
              <div className="pdf-signature-line"></div>
              <p className="pdf-doctor-name">Dr(a). {selectedPrescription.medicoNome}</p>
              <p className="pdf-doctor-info">CRM/UF: 000000 - Especialista em Telemedicina</p>
            </div>

            <div className="pdf-auth-footer">
              <div>
                Emitido em: <strong>{formatDate(new Date())} às {formatTime(new Date())}</strong>
              </div>
              <div className="pdf-auth-code">
                CÓD: {Math.random().toString(36).substring(2, 10).toUpperCase()}-{selectedPrescription.id}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
