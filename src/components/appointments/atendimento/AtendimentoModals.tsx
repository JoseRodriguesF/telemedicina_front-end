import React from 'react';
import ContentModal from '@/components/common/Modal/ContentModal';
import Button from '@/components/common/Buttons/Button';
import ClinicalStructuredView from './ClinicalStructuredView';
import { formatDate } from '@/lib/utils/dateFormatters';
import { CID10 } from '@/lib/constants/cid10';

interface ModalsProps {
  consultaSelecionada: any;
  setConsultaSelecionada: (v: any) => void;
  loadingAnexosHistory: boolean;
  isConfirmingEnd: boolean;
  setIsConfirmingEnd: (v: boolean) => void;
  showTranscriptionModal: boolean;
  setShowTranscriptionModal: (v: boolean) => void;
  atendimentoData: any;
  setAtendimentoData: (updater: (prev: any) => any) => void;
  pacienteNotas: string;
  setPacienteNotas: (v: string) => void;
  cidSearch: string;
  onDiagnosticoChange: (v: string, modal: boolean) => void;
  showCidSugestoesModal: boolean;
  setShowCidSugestoesModal: (v: boolean) => void;
  cidSugestoes: CID10[];
  onSelectCID: (cid: CID10, modal: boolean) => void;
  onRemoveCID: (code: string) => void;
  onConfirmFinishWithValidation: () => void;
  activePrescricoes: any[];
  onDeletePrescricao: (id: number) => void;
  repousoOptions: string[];
  destinoFinalOptions: string[];
  showAnexosModal: boolean;
  setShowAnexosModal: (v: boolean) => void;
  loadingAnexos: boolean;
  anexos: any[];
  onOpenAnexo: (url: string) => void;
  confirmationStep: number;
  setConfirmationStep: (v: number) => void;
  onSummarize?: () => void;
  isSummarizing?: boolean;
}

const AtendimentoModals: React.FC<ModalsProps> = ({
  consultaSelecionada,
  setConsultaSelecionada,
  loadingAnexosHistory,
  isConfirmingEnd,
  setIsConfirmingEnd,
  showTranscriptionModal,
  setShowTranscriptionModal,
  atendimentoData,
  setAtendimentoData,
  pacienteNotas,
  setPacienteNotas,
  cidSearch,
  onDiagnosticoChange,
  showCidSugestoesModal,
  setShowCidSugestoesModal,
  cidSugestoes,
  onSelectCID,
  onRemoveCID,
  onConfirmFinishWithValidation,
  activePrescricoes,
  onDeletePrescricao,
  repousoOptions,
  destinoFinalOptions,
  showAnexosModal,
  setShowAnexosModal,
  loadingAnexos,
  anexos,
  onOpenAnexo,
  confirmationStep,
  setConfirmationStep,
  onSummarize,
  isSummarizing,
}) => {
  return (
    <>
      {/* Modal de Detalhes da Consulta */}
      <ContentModal isOpen={!!consultaSelecionada} onClose={() => setConsultaSelecionada(null)} title="Detalhes do Atendimento" size="md">
        {consultaSelecionada && (
          <div className="history-details-modal">
            <div className="pc-relatorio-container" style={{ padding: 0 }}>
              <div className="clinical-report-card">
                <div className="clinical-report-section">
                  <h3>Informações Gerais</h3>
                  <div className="clinical-report-item">
                    <span className="clinical-report-label">Data</span>
                    <span className="clinical-report-value">{consultaSelecionada.data_consulta ? formatDate(consultaSelecionada.data_consulta) : formatDate(consultaSelecionada.createdAt)}</span>
                  </div>
                  <div className="clinical-report-item">
                    <span className="clinical-report-label">Médico</span>
                    <span className="clinical-report-value">{consultaSelecionada.medico?.nome_completo || '-'}</span>
                  </div>
                  <div className="clinical-report-item">
                    <span className="clinical-report-label">Horário</span>
                    <span className="clinical-report-value">
                      {consultaSelecionada.hora_inicio ? new Date(consultaSelecionada.hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      {consultaSelecionada.hora_fim ? ` - ${new Date(consultaSelecionada.hora_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {(consultaSelecionada.historiaClinica || (Array.isArray(consultaSelecionada.historiaClinica) && consultaSelecionada.historiaClinica.length > 0)) && (
                <div style={{ marginTop: '1rem' }}>
                  <ClinicalStructuredView 
                    data={Array.isArray(consultaSelecionada.historiaClinica) 
                      ? consultaSelecionada.historiaClinica[0] 
                      : consultaSelecionada.historiaClinica
                    } 
                    variant="report"
                  />
                </div>
              )}
            </div>

            <div className="details-section"><h4>Diagnóstico</h4><p className="detail-text">{consultaSelecionada.diagnostico || 'Não registrado'}</p></div>
            <div className="details-section"><h4>Evolução</h4><p className="detail-text">{consultaSelecionada.evolucao || 'Não registrada'}</p></div>
            <div className="details-section"><h4>Plano Terapêutico</h4><p className="detail-text">{consultaSelecionada.plano_terapeutico || 'Não registrado'}</p></div>
            {consultaSelecionada.resumo_consulta && (
              <div className="details-section">
                <h4>Resumo da Consulta</h4>
                <p className="detail-text">{consultaSelecionada.resumo_consulta}</p>
              </div>
            )}
            <div className="details-grid-bottom">
              <div className="details-section"><h4>Repouso</h4><p className="detail-text">{consultaSelecionada.repouso || 'Não registrado'}</p></div>
              <div className="details-section"><h4>Destino Final</h4><p className="detail-text">{consultaSelecionada.destino_final || 'Não registrado'}</p></div>
            </div>
            {consultaSelecionada.observacaoTecnica && (
              <div className="details-section" style={{ borderLeft: '4px solid #ef4444', paddingLeft: '1rem', background: '#fef2f2', marginTop: '1rem', borderRadius: '4px' }}>
                <h4 style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Relatório Técnico (CFM Art. 10)
                </h4>
                <p className="detail-text" style={{ color: '#b91c1c', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{consultaSelecionada.observacaoTecnica}</p>
              </div>
            )}
          </div>
        )}
      </ContentModal>

      {/* Modal de Transcrição da IA */}
      <ContentModal 
        isOpen={showTranscriptionModal} 
        onClose={() => setShowTranscriptionModal(false)} 
        title="Transcrição em Tempo Real" 
        size="lg"
      >
        <div className="transcription-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', 
              background: 'var(--color-primary-50)', color: 'var(--color-primary-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Relatório de Inteligência Artificial</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Esta é a transcrição gerada automaticamente durante a consulta. Você pode refinar este texto usando nossa IA para obter um resumo estruturado.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  Texto da Transcrição
                </span>
                <span style={{ fontSize: '0.75rem', background: 'var(--color-warning-50)', color: 'var(--color-warning-700)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  CONFIDENCIAL
                </span>
              </div>
              
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(atendimentoData.resumo_consulta || '');
                  alert('Copiado para a área de transferência!');
                }}
                className="btn ghost"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', height: 'auto', minHeight: '0' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copiar
              </button>
            </div>

            <textarea
              className="atendimento-textarea"
              style={{ 
                minHeight: '350px', 
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem',
                fontSize: '0.95rem', 
                lineHeight: '1.6',
                background: 'var(--bg-secondary)',
                resize: 'vertical',
                color: 'var(--text-primary)'
              }}
              placeholder="O resumo ou transcrição da consulta aparecerá aqui..."
              value={atendimentoData.resumo_consulta}
              onChange={(e) => setAtendimentoData(prev => ({ ...prev, resumo_consulta: e.target.value }))}
            />
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '1.25rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Refinamento por IA</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{atendimentoData.resumo_consulta?.length || 0} caracteres registrados.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="ghost" onClick={() => setShowTranscriptionModal(false)}>Fechar</Button>
              <Button 
                variant="primary" 
                onClick={onSummarize} 
                disabled={isSummarizing || !atendimentoData.resumo_consulta}
                style={{ borderRadius: '8px', minWidth: '160px' }}
              >
                {isSummarizing ? 'Processando...' : <><img src="/icons/ai-icon.png" alt="IA" className="white-icon-filter" style={{ width: '24px', height: '24px', marginRight: '8px', verticalAlign: 'middle', objectFit: 'contain' }} /> Refinar Resumo</>}
              </Button>
            </div>
          </div>
        </div>
      </ContentModal>

      {/* Modal de Finalização em 2 Etapas (Médico) */}
      <ContentModal
        isOpen={isConfirmingEnd}
        onClose={() => setIsConfirmingEnd(false)}
        title={confirmationStep === 1 ? 'Finalizar Atendimento — Revisão' : 'Finalizar Atendimento — Resumo Clínico'}
        size="xl"
      >
        <div className="confirmation-screen">

          {/* Stepper de progresso */}
          <div className="confirmation-stepper" style={{ marginBottom: '2.5rem' }}>
            <div className={`stepper-step ${confirmationStep >= 1 ? 'active' : ''} ${confirmationStep > 1 ? 'done' : ''}`}>
              <div className="stepper-circle">
                {confirmationStep > 1 ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '1'}
              </div>
              <span className="stepper-label">Revisão de Dados</span>
            </div>
            <div className={`stepper-line ${confirmationStep > 1 ? 'done' : ''}`} />
            <div className={`stepper-step ${confirmationStep >= 2 ? 'active' : ''}`}>
              <div className="stepper-circle">2</div>
              <span className="stepper-label">Relatório IA</span>
            </div>
          </div>

          {/* ─── ETAPA 1: Revisão dos dados da ficha ─── */}
          {confirmationStep === 1 && (
            <>
              <div className="confirmation-grid">
                <div className="confirmation-section">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                    Ficha de Atendimento
                  </h4>
                  <div className="confirmation-form">
                    <div className="form-group"><label>Evolução Clínica</label><textarea className="atendimento-textarea" style={{ minHeight: '120px' }} value={atendimentoData.evolucao} onChange={(e) => setAtendimentoData(prev => ({ ...prev, evolucao: e.target.value }))} /></div>
                    <div className="form-group"><label>Notas Privadas (Apenas Médico)</label><textarea className="atendimento-textarea" style={{ minHeight: '80px', borderLeft: '4px solid var(--color-primary-500)' }} value={pacienteNotas} onChange={(e) => setPacienteNotas(e.target.value)} /></div>
                    <div className="form-group"><label>Plano Terapêutico</label><textarea className="atendimento-textarea" style={{ minHeight: '100px' }} value={atendimentoData.plano_terapeutico} onChange={(e) => setAtendimentoData(prev => ({ ...prev, plano_terapeutico: e.target.value }))} /></div>
                    {/* CID in Modal */}
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label>Diagnóstico (CID-10)</label>
                      <div className="cid-chips-wrapper" style={{ marginBottom: '10px' }}>
                        {atendimentoData.selectedCIDs.map((cid: CID10) => (
                          <div key={cid.codigo} className="cid-chip" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                            <span className="cid-chip-code" style={{ background: 'var(--color-primary-500)' }}>{cid.codigo}</span>
                            <span className="cid-chip-name" style={{ maxWidth: '150px' }}>{cid.nome}</span>
                            <button className="cid-chip-remove" onClick={() => onRemoveCID(cid.codigo)} type="button">✕</button>
                          </div>
                        ))}
                      </div>
                      <div className="address-search-wrapper">
                        <input type="text" className="atendimento-input-small" placeholder="Pesquisar por código ou descrição do CID..." value={cidSearch} onChange={(e) => onDiagnosticoChange(e.target.value, true)} onBlur={() => setTimeout(() => setShowCidSugestoesModal(false), 200)} />
                        <span className="search-icon-inside"><img src="/icons/Search.png" alt="Buscar" width="16" height="16" /></span>
                      </div>
                      {showCidSugestoesModal && cidSugestoes.length > 0 && (
                        <div className="prescricao-suggestions" style={{ width: '100%', top: '100%', zIndex: 100 }}>
                          {cidSugestoes.map((cid, idx) => (<div key={idx} className="prescricao-suggestions-item" onClick={() => onSelectCID(cid, true)}><strong style={{ color: 'var(--color-primary-600)' }}>{cid.codigo}</strong> - {cid.nome}</div>))}
                        </div>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group" style={{ flex: 1 }}><label>Repouso</label><select className="atendimento-input-small" value={atendimentoData.repouso} onChange={(e) => setAtendimentoData(prev => ({ ...prev, repouso: e.target.value }))}><option value="">Selecione...</option>{repousoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                      <div className="form-group" style={{ flex: 1 }}><label>Destino Final</label><select className="atendimento-input-small" value={atendimentoData.destino_final} onChange={(e) => setAtendimentoData(prev => ({ ...prev, destino_final: e.target.value }))}><option value="">Selecione...</option>{destinoFinalOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                    </div>
                  </div>
                </div>
                <div className="confirmation-section">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                    Prescrições Geradas
                  </h4>
                  <div className="confirmation-prescriptions" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '1rem', border: '1px solid var(--border-color)', minHeight: '300px' }}>
                    {activePrescricoes.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6 }}>
                        <p className="no-prescriptions">Nenhuma prescrição adicionada.</p>
                      </div>
                    ) : (
                      <div className="prescricao-list">
                        {activePrescricoes.map((p) => (
                          <div key={p.id} className="prescricao-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                            <div className="prescricao-card-header">
                              <div className="prescricao-card-medicamento" style={{ color: 'var(--color-primary-600)' }}>{p.medicamento}</div>
                              <button className="prescricao-delete-btn" onClick={() => onDeletePrescricao(p.id)} style={{ color: 'var(--color-error)' }}>Excluir</button>
                            </div>
                            <div className="prescricao-card-info">{p.dosagem} • {p.frequencia} • {p.duracao}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="confirmation-actions" style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <Button variant="ghost" onClick={() => setIsConfirmingEnd(false)}>Cancelar</Button>
                <Button variant="primary" onClick={() => setConfirmationStep(2)}>
                  Próximo: Resumo da Consulta
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px', width: '18px', height: '18px' }}><polyline points="9 18 15 12 9 6" /></svg>
                </Button>
              </div>
            </>
          )}

          {/* ─── ETAPA 2: Resumo da Consulta (somente para médico) ─── */}
          {confirmationStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ 
                  width: '48px', height: '48px', borderRadius: '12px', 
                  background: 'var(--color-primary-50)', color: 'var(--color-primary-600)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Resumo Estruturado pela IA</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Este conteúdo será anexado ao prontuário do paciente. Você pode editar o texto livremente antes de finalizar a consulta.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                      Relatório Clínico
                    </span>
                    <span style={{ fontSize: '0.75rem', background: 'var(--color-warning-50)', color: 'var(--color-warning-700)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      VISÍVEL APENAS PARA MÉDICOS
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(atendimentoData.resumo_consulta || '');
                      alert('Copiado para a área de transferência!');
                    }}
                    className="btn ghost"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', height: 'auto', minHeight: '0' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copiar
                  </button>
                </div>

                <textarea
                  className="atendimento-textarea"
                  style={{ 
                    minHeight: '350px', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    fontSize: '0.95rem', 
                    lineHeight: '1.6',
                    background: 'var(--bg-secondary)',
                    resize: 'vertical',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="A transcrição completa ou resumo aparecerá aqui..."
                  value={atendimentoData.resumo_consulta}
                  onChange={(e) => setAtendimentoData(prev => ({ ...prev, resumo_consulta: e.target.value }))}
                />
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '1.25rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Gerar Resumo Clínico</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{atendimentoData.resumo_consulta?.length || 0} caracteres. Use a IA para estruturar os dados.</p>
                </div>
                <Button 
                  variant="primary" 
                  onClick={onSummarize} 
                  disabled={isSummarizing || !atendimentoData.resumo_consulta}
                  style={{ borderRadius: '8px' }}
                >
                  {isSummarizing ? 'Processando...' : <><img src="/icons/ai-icon.png" alt="IA" className="white-icon-filter" style={{ width: '24px', height: '24px', marginRight: '8px', verticalAlign: 'middle', objectFit: 'contain' }} /> Estruturar com IA</>}
                </Button>
              </div>

              <div className="confirmation-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <Button variant="ghost" onClick={() => setConfirmationStep(1)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', width: '18px', height: '18px' }}><polyline points="15 18 9 12 15 6" /></svg>
                  Voltar para Revisão
                </Button>
                <Button variant="primary" onClick={onConfirmFinishWithValidation} style={{ padding: '0.85rem 2rem' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', width: '20px', height: '20px' }}><polyline points="20 6 9 17 4 12" /></svg>
                  Confirmar e Finalizar Atendimento
                </Button>
              </div>
            </div>
          )}

        </div>
      </ContentModal>

      {/* Modal de Anexos */}
      <ContentModal isOpen={showAnexosModal} onClose={() => setShowAnexosModal(false)} title="📁 Arquivos Enviados pelo Paciente" size="md">
        <div style={{ padding: '0.25rem 0' }}>
          {loadingAnexos ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem' }}><div className="spinner" style={{ width: '32px', height: '32px' }} /><span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Buscando arquivos...</span></div> : (
            <>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '1rem', padding: '0 0.25rem' }}>{anexos.length} arquivo{anexos.length !== 1 ? 's' : ''} enviado{anexos.length !== 1 ? 's' : ''} pelo paciente.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {anexos.map((file) => (
                  <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0, flex: 1 }}>
                      <div style={{ width: '44px', height: '44px', background: 'var(--bg-tertiary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📂</div>
                      <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.nome}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{file.createdAt ? formatDate(file.createdAt) : '-'}</div></div>
                    </div>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn primary" style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem', borderRadius: '8px' }}>Abrir</a>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ContentModal>
    </>
  );
};

export default AtendimentoModals;
