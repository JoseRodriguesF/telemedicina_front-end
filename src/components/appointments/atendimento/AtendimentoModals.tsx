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
        title="📋 Transcrição e Resumo da Consulta (IA)" 
        size="lg"
      >
        <div className="resumo-consulta-section" style={{ padding: '1rem 0' }}>
          <div className="resumo-consulta-header" style={{ marginBottom: '1.5rem' }}>
            <div className="resumo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h3 className="resumo-consulta-title">Relatório de IA</h3>
              <p className="resumo-consulta-subtitle">
                Abaixo está o resumo gerado automaticamente pela IA a partir da transcrição do áudio da consulta. Você pode editar este conteúdo livremente.
              </p>
            </div>
          </div>

          <div className="resumo-confidencial-badge" style={{ marginBottom: '1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Confidencial — Visível apenas para médicos
          </div>

          <div className="form-group">
            <label className="resumo-label">Transcrição Acumulada / Resumo Parcial</label>
            <textarea
              className="atendimento-textarea resumo-textarea"
              style={{ minHeight: '400px', borderLeft: '4px solid var(--color-primary-500)', background: 'var(--bg-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}
              placeholder="O resumo da transcrição da consulta aparecerá aqui conforme a conversa progride..."
              value={atendimentoData.resumo_consulta}
              onChange={(e) => setAtendimentoData(prev => ({ ...prev, resumo_consulta: e.target.value }))}
            />
            <div className="summarize-action-bar">
              <div className="summarize-info">
                <span className="summarize-title">Transcrição — {atendimentoData.resumo_consulta?.length || 0} caracteres</span>
                <p className="summarize-description">
                  Registro bruto da conversa. Clique para gerar um resumo clínico organizado.
                </p>
              </div>
              <Button 
                variant="primary" 
                className="btn-summarize"
                onClick={onSummarize} 
                disabled={isSummarizing || !atendimentoData.resumo_consulta}
              >
                {isSummarizing ? 'Resumindo...' : <><span className="ia-icon-pulse">✨</span> Resumir Transcrição</>}
              </Button>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={() => setShowTranscriptionModal(false)}>Fechar e Voltar</Button>
          </div>
        </div>
      </ContentModal>

      {/* Modal de Finalização em 2 Etapas (Médico) */}
      <ContentModal
        isOpen={isConfirmingEnd}
        onClose={() => setIsConfirmingEnd(false)}
        title={confirmationStep === 1 ? 'Etapa 1 de 2 — Confirmar Dados da Consulta' : 'Etapa 2 de 2 — Resumo da Consulta'}
        size="xl"
      >
        <div className="confirmation-screen">

          {/* Stepper de progresso */}
          <div className="confirmation-stepper">
            <div className={`stepper-step ${confirmationStep >= 1 ? 'active' : ''} ${confirmationStep > 1 ? 'done' : ''}`}>
              <div className="stepper-circle">
                {confirmationStep > 1 ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '1'}
              </div>
              <span className="stepper-label">Dados da Consulta</span>
            </div>
            <div className={`stepper-line ${confirmationStep > 1 ? 'done' : ''}`} />
            <div className={`stepper-step ${confirmationStep >= 2 ? 'active' : ''}`}>
              <div className="stepper-circle">2</div>
              <span className="stepper-label">Resumo da Consulta</span>
            </div>
          </div>

          {/* ─── ETAPA 1: Revisão dos dados da ficha ─── */}
          {confirmationStep === 1 && (
            <>
              <p className="confirmation-description">Revise abaixo todas as informações inseridas durante a consulta. Você pode editá-las antes de continuar.</p>
              <div className="confirmation-grid">
                <div className="confirmation-section">
                  <h4>Ficha de Atendimento</h4>
                  <div className="confirmation-form">
                    <div className="form-group"><label>Evolução</label><textarea className="atendimento-textarea" style={{ minHeight: '100px' }} value={atendimentoData.evolucao} onChange={(e) => setAtendimentoData(prev => ({ ...prev, evolucao: e.target.value }))} /></div>
                    <div className="form-group"><label>Notas Privadas</label><textarea className="atendimento-textarea" style={{ minHeight: '80px', borderLeft: '4px solid var(--color-primary-500)' }} value={pacienteNotas} onChange={(e) => setPacienteNotas(e.target.value)} /></div>
                    <div className="form-group"><label>Plano Terapêutico</label><textarea className="atendimento-textarea" style={{ minHeight: '100px' }} value={atendimentoData.plano_terapeutico} onChange={(e) => setAtendimentoData(prev => ({ ...prev, plano_terapeutico: e.target.value }))} /></div>
                    {/* CID in Modal */}
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label>Diagnóstico (CID)</label>
                      <div className="cid-chips-wrapper" style={{ marginBottom: '8px' }}>
                        {atendimentoData.selectedCIDs.map((cid: CID10) => (
                          <div key={cid.codigo} className="cid-chip">
                            <span className="cid-chip-code">{cid.codigo}</span><span className="cid-chip-name" style={{ maxWidth: '120px' }}>{cid.nome}</span>
                            <button className="cid-chip-remove" onClick={() => onRemoveCID(cid.codigo)} type="button">✕</button>
                          </div>
                        ))}
                      </div>
                      <div className="address-search-wrapper">
                        <input type="text" className="atendimento-input-small" placeholder="Adicionar CID..." value={cidSearch} onChange={(e) => onDiagnosticoChange(e.target.value, true)} onBlur={() => setTimeout(() => setShowCidSugestoesModal(false), 200)} />
                        <span className="search-icon-inside"><img src="/icons/Search.png" alt="Buscar" width="16" height="16" /></span>
                      </div>
                      {showCidSugestoesModal && cidSugestoes.length > 0 && (
                        <div className="prescricao-suggestions" style={{ width: '100%', top: '100%', zIndex: 100 }}>
                          {cidSugestoes.map((cid, idx) => (<div key={idx} className="prescricao-suggestions-item" onClick={() => onSelectCID(cid, true)}><strong style={{ color: 'var(--color-primary-600)' }}>{cid.codigo}</strong> - {cid.nome}</div>))}
                        </div>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Repouso</label><select className="atendimento-input-small" value={atendimentoData.repouso} onChange={(e) => setAtendimentoData(prev => ({ ...prev, repouso: e.target.value }))}><option value="">Selecione...</option>{repousoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                      <div className="form-group"><label>Destino Final</label><select className="atendimento-input-small" value={atendimentoData.destino_final} onChange={(e) => setAtendimentoData(prev => ({ ...prev, destino_final: e.target.value }))}><option value="">Selecione...</option>{destinoFinalOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                    </div>
                  </div>
                </div>
                <div className="confirmation-section">
                  <h4>Prescrições</h4>
                  <div className="confirmation-prescriptions">
                    {activePrescricoes.length === 0 ? <p className="no-prescriptions">Nenhuma prescrição adicionada.</p> : (
                      <div className="prescricao-list">
                        {activePrescricoes.map((p) => (
                          <div key={p.id} className="prescricao-card"><div className="prescricao-card-header"><div className="prescricao-card-medicamento">{p.medicamento}</div><button className="prescricao-delete-btn" onClick={() => onDeletePrescricao(p.id)}>Excluir</button></div><div className="prescricao-card-info">{p.dosagem} - {p.frequencia} - {p.duracao}</div></div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="confirmation-actions">
                <Button variant="ghost" onClick={() => setIsConfirmingEnd(false)}>Cancelar</Button>
                <Button variant="primary" onClick={() => setConfirmationStep(2)}>
                  Próximo: Resumo da Consulta
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', width: '16px', height: '16px' }}><polyline points="9 18 15 12 9 6" /></svg>
                </Button>
              </div>
            </>
          )}

          {/* ─── ETAPA 2: Resumo da Consulta (somente para médico) ─── */}
          {confirmationStep === 2 && (
            <>
              <div className="resumo-consulta-section">
                <div className="resumo-consulta-header">
                  <div className="resumo-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="resumo-consulta-title">Resumo da Consulta</h3>
                    <p className="resumo-consulta-subtitle">
                      Este campo contém a <strong>transcrição automática e o resumo gerado pela IA</strong> durante o atendimento. Revise-o cuidadosamente, pois ele será anexado ao prontuário.
                    </p>
                  </div>
                </div>

                <div className="resumo-confidencial-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Confidencial — Visível apenas para médicos
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label className="resumo-label">Relatório Completo da Consulta (IA)</label>
                  <textarea
                    className="atendimento-textarea resumo-textarea"
                    style={{ minHeight: '300px', borderLeft: '4px solid var(--color-primary-500)', background: 'var(--bg-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}
                    placeholder="A transcrição completa ou resumo aparecerá aqui..."
                    value={atendimentoData.resumo_consulta}
                    onChange={(e) => setAtendimentoData(prev => ({ ...prev, resumo_consulta: e.target.value }))}
                  />
                  <div className="summarize-action-bar">
                    <div className="summarize-info">
                      <span className="summarize-title">Geração de Resumo — {atendimentoData.resumo_consulta?.length || 0} caracteres</span>
                      <p className="summarize-description">Consolidar a transcrição diarizada em um relatório clínico estruturado.</p>
                    </div>
                    <Button 
                      variant="primary" 
                      className="btn-summarize"
                      onClick={onSummarize} 
                      disabled={isSummarizing || !atendimentoData.resumo_consulta}
                    >
                      {isSummarizing ? 'Resumindo...' : <><span className="ia-icon-pulse">✨</span> Gerar Resumo da Transcrição</>}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="confirmation-actions">
                <Button variant="ghost" onClick={() => setConfirmationStep(1)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', width: '16px', height: '16px' }}><polyline points="15 18 9 12 15 6" /></svg>
                  Voltar
                </Button>
                <Button variant="primary" onClick={onConfirmFinishWithValidation}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', width: '16px', height: '16px' }}><polyline points="20 6 9 17 4 12" /></svg>
                  Confirmar e Finalizar Atendimento
                </Button>
              </div>
            </>
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
