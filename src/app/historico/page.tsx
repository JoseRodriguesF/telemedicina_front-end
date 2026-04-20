"use client";

import '../inicio/inicio.css';
import './historico.css';
import '@/components/layout/Header/header.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getUser, getUserFirstName, getToken } from '@/lib/auth';
import { PSFullHistoryItem, searchHistoricoConsultas, listAnexosConsulta, ConsultaAnexo } from '@/lib/axios/consultas';
// ✅ NOVO: Importar hooks otimizados
import { useHistoricoCompleto, useUserProfile } from '@/hooks/useApiData';
import { useDebounce } from '@/hooks/useOptimization';
import { downloadPrescricaoPdf } from '@/lib/axios/prescricoes';
import ContentModal from '@/components/common/Modal/ContentModal';
import { formatDate, formatTime } from '@/lib/utils/dateFormatters';
import FormattedText from '@/components/common/FormattedText';
import ClinicalStructuredView from '@/components/appointments/atendimento/ClinicalStructuredView';
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
  const [searchMode, setSearchMode] = useState<'nome' | 'cpf'>('nome');
  const [cpfValidationState, setCpfValidationState] = useState<'idle' | 'incomplete' | 'invalid' | 'valid'>('idle');
  const [loadingAnexos, setLoadingAnexos] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // ✅ NOVO: Usar hooks otimizados
  const { historico: history, isLoading: loadingInternal } = useHistoricoCompleto();
  const { profile } = useUserProfile();

  const loading = loadingInternal;

  // ✅ NOVO: Debounce na busca para evitar renderizações excessivas
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ─── Utilitários de CPF ───────────────────────────────────────────────────

  /** Aplica a máscara visual ao CPF: 000.000.000-00 */
  const formatCpfMask = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  /** Valida o CPF matematicamente (dígitos verificadores) */
  const isValidCpf = (cpf: string): boolean => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false; // todos iguais
    const calcDigit = (slice: string, weights: number[]): number => {
      const sum = slice.split('').reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0);
      const rem = (sum * 10) % 11;
      return rem === 10 || rem === 11 ? 0 : rem;
    };
    const d1 = calcDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = calcDigit(digits.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return d1 === parseInt(digits[9]) && d2 === parseInt(digits[10]);
  };

  const medicoRating = profile?.medico?.avaliacao || null;

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
    setUserType(u?.tipo_usuario || '');
  }, []);

  // ✅ OTIMIZADO: Identificação automática de CPF vs Nome
  const handleSearchChange = (val: string) => {
    if (userType !== 'medico') {
      setSearchTerm(val);
      setSearchMode('nome');
      return;
    }

    const hasDigits = /\d/.test(val);
    const hasLetters = /[a-zA-Z]/.test(val);

    if (hasDigits && !hasLetters) {
      setSearchMode('cpf');
      const masked = formatCpfMask(val);
      setSearchTerm(masked);

      const digits = masked.replace(/\D/g, '');
      if (digits.length === 0) setCpfValidationState('idle');
      else if (digits.length < 11) setCpfValidationState('incomplete');
      else if (isValidCpf(masked)) setCpfValidationState('valid');
      else setCpfValidationState('invalid');
    } else {
      setSearchMode('nome');
      setSearchTerm(val);
      setCpfValidationState('idle');
    }
  };

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults(null);
        setCpfValidationState('idle');
        return;
      }

      // Modo CPF: só busca se o CPF for válido e completo
      if (searchMode === 'cpf') {
        const digits = debouncedSearch.replace(/\D/g, '');
        if (digits.length < 11) {
          setCpfValidationState('incomplete');
          setSearchResults(null);
          return;
        }
        if (!isValidCpf(debouncedSearch)) {
          setCpfValidationState('invalid');
          setSearchResults(null);
          return;
        }
        setCpfValidationState('valid');
      }

      setIsSearching(true);
      try {
        const token = getToken();
        if (token) {
          // Para busca por CPF, envia parâmetro extra para o backend filtrar com precisão
          const searchParam = searchMode === 'cpf'
            ? `${debouncedSearch.replace(/\D/g, '')}&type=cpf`
            : debouncedSearch;
          const results = await searchHistoricoConsultas(searchParam, token);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, searchMode]);

  useEffect(() => {
    async function fetchAnexos() {
      if (selectedItem && showDetails && !selectedItem.anexos) {
        setLoadingAnexos(true);
        try {
          const token = getToken();
          if (token) {
            const list = await listAnexosConsulta(selectedItem.id, token);
            setSelectedItem(prev => prev ? { ...prev, anexos: list } : null);
          }
        } catch (err) {
          console.error('Erro ao buscar anexos:', err);
        } finally {
          setLoadingAnexos(false);
        }
      }
    }
    fetchAnexos();
  }, [selectedItem?.id, showDetails]);

  const getParticipantName = (item: PSFullHistoryItem) => {
    if (userType === 'paciente') {
      return item.medico?.nome_completo || 'Médico não identificado';
    } else {
      return item.paciente?.nome_completo || 'Paciente não identificado';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'finished': return 'Finalizada';
      case 'agendada': return 'Confirmada';
      case 'solicitada': return 'Solicitada';
      case 'cancelled': return 'Cancelada';
      case 'in_progress': return 'Em andamento';
      case 'scheduled': return 'Pronto Atendimento';
      case 'expired': return 'Expirada';
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'finished': return 'success';
      case 'agendada': return 'confirmed';
      case 'solicitada': return 'primary';
      case 'cancelled': return 'danger';
      case 'expired': return 'warning';
      case 'in_progress': return 'info';
      case 'scheduled': return 'secondary';
      default: return 'ghost';
    }
  };

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

  // ✅ OTIMIZADO: Usar searchResults da API ou filtro local
  const dataSource = (searchResults && searchResults.length > 0) ? searchResults : history;

  const filteredHistory = dataSource.filter(item => {
    // Se veio da API, o backend já filtrou. Se não, filtramos localmente.
    let searchMatch = true;

    if (debouncedSearch.trim()) {
      if (searchMode === 'cpf') {
        // Busca por CPF: sempre exige correspondência EXATA (11 dígitos)
        if (userType === 'medico' && item.paciente?.cpf) {
          const cleanCpf = item.paciente.cpf.replace(/\D/g, '');
          const cleanSearch = debouncedSearch.replace(/\D/g, '');
          searchMatch = cleanCpf === cleanSearch;
        } else {
          searchMatch = false;
        }
      } else {
        // Busca por nome: correspondência aproximada por termos (partes do nome)
        // Aplicamos SEMPRE a filtragem local como garantia extra de precisão
        const searchTerms = debouncedSearch.toLowerCase().split(' ').filter(part => part.length > 0);
        const itemName = getParticipantName(item).toLowerCase();
        
        // Verifica se TODOS os termos da pesquisa estão contidos no nome
        searchMatch = searchTerms.every(term => itemName.includes(term));
      }
    }

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

    return searchMatch && statusMatch && dateMatch;
  });

  // Extrair prescrições das consultas filtradas
  const allPrescriptions = filteredHistory.flatMap((consulta: PSFullHistoryItem) =>
    (consulta.prescricoes || []).map((p: any) => ({
      ...p,
      consultaStatus: consulta.status,
      medicoNome: consulta.medico?.nome_completo,
      pacienteNome: consulta.paciente?.nome_completo,
      consultaData: consulta.data_consulta || consulta.createdAt,
      // Garantir que tem_pdf seja verdadeiro se houver dados de PDF
      tem_pdf: p.tem_pdf || !!p.pdf_mimetype || !!p.pdf_data
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
            onClick={() => { setActiveTab('atendimentos'); setVisibleCount(10); }}
          >
            Atendimentos ({totalAtendimentos})
          </button>
          <button
            className={`tab-btn ${activeTab === 'prescricoes' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('prescricoes');
              setFilterStatus('all');
              setVisibleCount(10);
            }}
          >
            Prescrições ({totalPrescricoes})
          </button>
        </div>

        <div className="history-filters">
          <div className="search-input-wrapper" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '1rem', color: 'var(--text-tertiary)', zIndex: 1 }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                className={`history-search-field${
                  userType === 'medico' && searchMode === 'cpf' && cpfValidationState === 'invalid' ? ' search-field-error' :
                  userType === 'medico' && searchMode === 'cpf' && cpfValidationState === 'valid' ? ' search-field-success' : ''
                }`}
                placeholder={
                  userType === 'paciente'
                    ? 'Buscar por nome do médico...'
                    : 'Busque por nome ou CPF do paciente...'
                }
                value={searchTerm}
                maxLength={searchMode === 'cpf' ? 14 : undefined}
                onChange={(e) => { handleSearchChange(e.target.value); setVisibleCount(10); }}
              />
              {/* Ícone de status de CPF */}
              {userType === 'medico' && searchMode === 'cpf' && cpfValidationState === 'valid' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '1rem' }}>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
              {userType === 'medico' && searchMode === 'cpf' && cpfValidationState === 'invalid' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '1rem' }}>
                  <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
                </svg>
              )}
            </div>
            {/* Mensagem de validação do CPF */}
            {userType === 'medico' && searchMode === 'cpf' && (
              <div style={{
                fontSize: '0.75rem',
                marginTop: '0.35rem',
                paddingLeft: '0.25rem',
                color:
                  cpfValidationState === 'valid' ? '#16a34a' :
                  cpfValidationState === 'invalid' ? '#dc2626' :
                  cpfValidationState === 'incomplete' ? 'var(--text-tertiary)' : 'transparent',
                minHeight: '1.1rem',
                transition: 'color 0.2s'
              }}>
                {cpfValidationState === 'incomplete' && 'Digite os 11 dígitos completos do CPF'}
                {cpfValidationState === 'invalid' && 'CPF inválido — verifique o número digitado'}
                {cpfValidationState === 'valid' && '✓ CPF válido — buscando paciente...'}
                {cpfValidationState === 'idle' && '\u00a0'}
              </div>
            )}
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
              onChange={(e) => { setEndDate(e.target.value); setVisibleCount(10); }}
            />
          </div>
        </div>

        <div className="status-filters">
          <button className={`btn ${filterStatus === 'all' ? 'primary' : 'ghost'}`} onClick={() => { setFilterStatus('all'); setVisibleCount(10); }}>Todos</button>

          {activeTab === 'atendimentos' && (
            <>
              <button className={`btn ${filterStatus === 'finished' ? 'primary' : 'ghost'}`} onClick={() => { setFilterStatus('finished'); setVisibleCount(10); }}>Finalizadas</button>
              <button className={`btn ${filterStatus === 'agendada' ? 'primary' : 'ghost'}`} onClick={() => { setFilterStatus('agendada'); setVisibleCount(10); }}>Agendadas</button>
              <button className={`btn ${filterStatus === 'solicitada' ? 'primary' : 'ghost'}`} onClick={() => { setFilterStatus('solicitada'); setVisibleCount(10); }}>Solicitadas</button>
              <button className={`btn ${filterStatus === 'cancelled' ? 'primary' : 'ghost'}`} onClick={() => { setFilterStatus('cancelled'); setVisibleCount(10); }}>Canceladas</button>
              <button className={`btn ${filterStatus === 'in_progress' ? 'primary' : 'ghost'}`} onClick={() => { setFilterStatus('in_progress'); setVisibleCount(10); }}>Em andamento</button>
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
                <>
                  {filteredHistory.slice(0, visibleCount).map((item) => (
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
                ))}

                {filteredHistory.length > 0 && (
                  <div style={{ textAlign: 'center', margin: '1rem 0', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    Exibindo {Math.min(visibleCount, filteredHistory.length)} de {filteredHistory.length} atendimentos
                  </div>
                )}

                {filteredHistory.length > visibleCount && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                    <button 
                      className="btn primary" 
                      onClick={() => setVisibleCount(prev => prev + 10)}
                      style={{ padding: '0.75rem 2.5rem', borderRadius: '12px', fontWeight: 700 }}
                    >
                      Carregar Mais Atendimentos
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-history">
                <h3>Nenhum atendimento encontrado</h3>
                <p>Ajuste os filtros ou realize novas consultas.</p>
              </div>
            )
            ) : (
              /* Aba de Prescrições */
              allPrescriptions.length > 0 ? (
                <>
                  {allPrescriptions.slice(0, visibleCount).map((presc, idx) => (
                  <div
                    key={`${presc.id}-${idx}`}
                    className="history-item-card prescription-card"
                    onClick={() => { setSelectedPrescription(presc); setShowPrescriptionDetails(true); }}
                  >
                    <div className="history-item-avatar">
                      <img src="/icons/remedio-icon.png" alt="Remédio" className="blue-icon-filter" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
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
                ))}

                {allPrescriptions.length > 0 && (
                  <div style={{ textAlign: 'center', margin: '1rem 0', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    Exibindo {Math.min(visibleCount, allPrescriptions.length)} de {allPrescriptions.length} prescrições
                  </div>
                )}

                {allPrescriptions.length > visibleCount && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                    <button 
                      className="btn primary" 
                      onClick={() => setVisibleCount(prev => prev + 10)}
                      style={{ padding: '0.75rem 2.5rem', borderRadius: '12px', fontWeight: 700 }}
                    >
                      Carregar Mais Prescrições
                    </button>
                  </div>
                )}
              </>
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
                <div className="stat-icon">
                  <img src="/icons/icon-chart.png" alt="Consultas" className="stat-icon-img" />
                </div>
              </div>
              <div className="stat-value">{totalAtendimentos}</div>
              <div className="stat-label">Realizadas na plataforma</div>
            </div>

            <div className="stat-mini-card">
              <div className="stat-header">
                <h4>Prescrições</h4>
                <div className="stat-icon">
                  <img src="/icons/remedio-icon.png" alt="Prescrições" className="stat-icon-img" />
                </div>
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
            <div className="pc-relatorio-container" style={{ padding: 0 }}>
              <div className="clinical-report-card">
                <div className="clinical-report-section">
                  <h3>🗓️ Informações Gerais</h3>
                  <div className="clinical-report-item">
                    <span className="clinical-report-label">Data:</span>
                    <span>{selectedItem.data_consulta ? formatDate(selectedItem.data_consulta) : formatDate(selectedItem.createdAt)}</span>
                  </div>
                  <div className="clinical-report-item">
                    <span className="clinical-report-label">{userType === 'paciente' ? 'Médico:' : 'Paciente:'}</span>
                    <span>{getParticipantName(selectedItem)}</span>
                  </div>
                  <div className="clinical-report-item">
                    <span className="clinical-report-label">Horário:</span>
                    <span>
                      {selectedItem.hora_inicio ? formatTime(selectedItem.hora_inicio) : '-'}
                      {selectedItem.hora_fim ? ` - ${formatTime(selectedItem.hora_fim)}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {selectedItem.historiaClinica && selectedItem.historiaClinica.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <ClinicalStructuredView 
                    data={selectedItem.historiaClinica[0]} 
                    variant="report"
                  />
                </div>
              )}
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

            {selectedItem.resumo_consulta && (
              <div className="details-section">
                <h4>📋 Resumo da Consulta</h4>
                <div style={{
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(14, 165, 233, 0.04) 100%)',
                  borderRadius: '16px',
                  border: '1px solid var(--color-primary-100)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  <p className="detail-text" style={{ 
                    whiteSpace: 'pre-wrap', 
                    fontSize: '0.95rem', 
                    lineHeight: 1.7,
                    color: 'var(--text-primary)',
                    margin: 0
                  }}>
                    {selectedItem.resumo_consulta}
                  </p>
                </div>
              </div>
            )}

            {/* Bloco de dados de ambulância - exibido quando o destino final inclui ambulância */}
            {(selectedItem.ambulancia_endereco || selectedItem.ambulancia_telefone || selectedItem.ambulancia_info || selectedItem.ambulancia_complemento) && (() => {
              const isVermelho = selectedItem.destino_final?.toLowerCase().includes('vermelho');
              const accentColor = isVermelho ? '#dc2626' : '#b45309';
              const bgColor = isVermelho ? 'rgba(220, 38, 38, 0.06)' : 'rgba(245, 158, 11, 0.06)';
              const borderColor = isVermelho ? 'rgba(220, 38, 38, 0.25)' : 'rgba(245, 158, 11, 0.25)';
              const badgeBg = isVermelho ? 'rgba(220, 38, 38, 0.12)' : 'rgba(245, 158, 11, 0.12)';
              const icon = isVermelho ? '🚨' : '🚑';
              const label = isVermelho ? 'Alerta Vermelho — Envio de Ambulância' : 'Alerta Amarelo — Envio de Ambulância';
              return (
                <div className="details-section" style={{
                  background: bgColor,
                  padding: '1rem',
                  borderRadius: '10px',
                  marginTop: '1rem',
                  border: `1px solid ${borderColor}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                    <h4 style={{ color: accentColor, margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{label}</h4>
                  </div>
                  <div style={{ background: badgeBg, borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                      Ambulância foi enviada para:
                    </div>
                    {selectedItem.ambulancia_endereco && (
                      <div className="detail-item" style={{ margin: 0 }}>
                        <label style={{ color: accentColor }}>Endereço:</label>
                        <span style={{ fontWeight: 600 }}>{selectedItem.ambulancia_endereco}</span>
                      </div>
                    )}
                    {selectedItem.ambulancia_complemento && (
                      <div className="detail-item" style={{ margin: 0 }}>
                        <label style={{ color: accentColor }}>Complemento:</label>
                        <span>{selectedItem.ambulancia_complemento}</span>
                      </div>
                    )}
                    {selectedItem.ambulancia_telefone && (
                      <div className="detail-item" style={{ margin: 0 }}>
                        <label style={{ color: accentColor }}>Telefone:</label>
                        <span>{selectedItem.ambulancia_telefone}</span>
                      </div>
                    )}
                    {selectedItem.ambulancia_info && (
                      <div className="detail-item" style={{ margin: 0 }}>
                        <label style={{ color: accentColor }}>Observações:</label>
                        <span>{selectedItem.ambulancia_info}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

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

            {/* Seção de Anexos */}
            {(selectedItem.anexos && selectedItem.anexos.length > 0) || loadingAnexos ? (
              <div className="details-section" style={{ marginTop: '1.5rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  Arquivos da Consulta
                </h4>
                {loadingAnexos ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', color: 'var(--text-tertiary)' }}>
                    <div className="mini-spinner"></div>
                    <span>Carregando arquivos...</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedItem.anexos?.map((file, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        background: 'var(--bg-secondary)',
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--color-primary-500)' }}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {file.nome}
                          </span>
                        </div>
                        <button 
                          onClick={() => window.open(file.url, '_blank')}
                          className="btn-ver-anexo"
                          style={{
                            background: 'var(--color-primary-50)',
                            border: 'none',
                            color: 'var(--color-primary-600)',
                            cursor: 'pointer',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          Abrir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
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
              Prescrição gerada via Plataforma Matriarca
            </div>
          </div>
        )}
      </ContentModal>

      {/* Template para o PDF (Invisível) - Design de Prescrição Realista */}
      {selectedPrescription && (
        <div id="prescription-pdf-template">
          <div className="pdf-inner-border"></div>

          <div className="pdf-header">
            <div className="pdf-logo-wrapper">
              <div className="pdf-logo-circle" style={{ background: 'transparent', boxShadow: 'none' }}>
                <img src="/images/logo_matriarca.png" alt="Matriarca" width={48} height={48} style={{ borderRadius: '8px', objectFit: 'contain' }} />
              </div>
              <div className="pdf-logo-text">
                <h1>Matriarca</h1>
                <p>Soluções em Saúde</p>
              </div>
            </div>
            <div className="pdf-header-meta">
              <div>Matriarca Soluções em Saúde Ltda.</div>
              <div>CNPJ: 00.000.000/0001-00</div>
              <div>contato@matriarcasaude.com.br</div>
              <div>www.matriarcasaude.com.br</div>
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
