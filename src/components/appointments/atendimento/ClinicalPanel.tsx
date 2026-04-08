import React from 'react';
import Accordion from './Accordion';
import FormattedText from '@/components/common/FormattedText';
import ClinicalStructuredView from './ClinicalStructuredView';
import { formatDate } from '@/lib/utils/dateFormatters';
import { ConsultaDetails } from '@/lib/axios/consultas';
import { Prescricao as PrescricaoType } from '@/lib/axios/prescricoes';

interface LeftPanelProps {
  openAccordions: Record<string, boolean>;
  toggleAccordion: (id: string) => void;
  consultaDetails: ConsultaDetails | null;
  loadingHistorico: boolean;
  historicoConsultas: any[];
  onSetConsultaSelecionada: (consulta: any) => void;
  loadingHistoricoPrescricoes: boolean;
  historicoPrescricoes: PrescricaoType[];
  onDownloadPrescricaoPdf: (id: number) => void;
  loadingPrescricoes: boolean;
  activePrescricoes: PrescricaoType[];
  onDeletePrescricao: (id: number) => void;
  prescricaoGerada: boolean;
  setPrescricaoGerada: (v: boolean) => void;
  showPrescricaoForm: boolean;
  setShowPrescricaoForm: (v: boolean) => void;
  prescricaoData: {
    medicamento: string;
    marca: string;
    dosagem: string;
    frequencia: string;
    duracao: string;
    inclusoConvenio: boolean;
  };
  setPrescricaoData: (updater: (prev: any) => any) => void;
  medicamentoSugestoes: string[];
  showMedicamentoSugestoes: boolean;
  setShowMedicamentoSugestoes: (v: boolean) => void;
  onMedicamentoChange: (v: string) => void;
  marcaSugestoes: string[];
  showMarcaSugestoes: boolean;
  setShowMarcaSugestoes: (v: boolean) => void;
  onMarcaChange: (v: string) => void;
  onCancelPrescricaoForm: () => void;
  onSubmitPrescricao: () => void;
  isSubmittingPrescricao: boolean;
  onGenerateFinalPDF: () => void;
  isGeneratingPDF: boolean;
  signedPdfFile: any;
  hiddenFileInputRef: React.RefObject<HTMLInputElement | null>;
  onSignedPdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditingNotas: boolean;
  setIsEditingNotas: (v: boolean) => void;
  pacienteNotas: string;
  setPacienteNotas: (v: string) => void;
  onSaveNotas: () => void;
  isSavingNotas: boolean;
}

const ClinicalPanel: React.FC<LeftPanelProps> = ({
  openAccordions,
  toggleAccordion,
  consultaDetails,
  loadingHistorico,
  historicoConsultas,
  onSetConsultaSelecionada,
  loadingHistoricoPrescricoes,
  historicoPrescricoes,
  onDownloadPrescricaoPdf,
  loadingPrescricoes,
  activePrescricoes,
  onDeletePrescricao,
  prescricaoGerada,
  setPrescricaoGerada,
  showPrescricaoForm,
  setShowPrescricaoForm,
  prescricaoData,
  setPrescricaoData,
  medicamentoSugestoes,
  showMedicamentoSugestoes,
  setShowMedicamentoSugestoes,
  onMedicamentoChange,
  marcaSugestoes,
  showMarcaSugestoes,
  setShowMarcaSugestoes,
  onMarcaChange,
  onCancelPrescricaoForm,
  onSubmitPrescricao,
  isSubmittingPrescricao,
  onGenerateFinalPDF,
  isGeneratingPDF,
  signedPdfFile,
  hiddenFileInputRef,
  onSignedPdfUpload,
  isEditingNotas,
  setIsEditingNotas,
  pacienteNotas,
  setPacienteNotas,
  onSaveNotas,
  isSavingNotas
}) => {
  return (
    <aside className="side-panel left-panel">
      <div className="panel-header">Ficha de atendimento</div>
      <div className="panel-content">
        <Accordion
          id="triagem"
          title="História Clínica (Triagem)"
          isOpen={!!openAccordions['triagem']}
          onToggle={toggleAccordion}
          isFilled={!!consultaDetails?.historiaClinica}
        >
          {consultaDetails?.historiaClinica ? (
            <div className="triagem-content-wrapper" style={{ padding: '0.25rem 0' }}>
              <ClinicalStructuredView 
                data={consultaDetails.historiaClinica} 
                variant="report"
              />
            </div>
          ) : (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
              Informações de triagem não encontradas.
            </div>
          )}
        </Accordion>

        <Accordion
          id="historico-consultas"
          title="Histórico de consultas"
          isOpen={!!openAccordions['historico-consultas']}
          onToggle={toggleAccordion}
        >
          {loadingHistorico ? (
            <p className="accordion-placeholder">Carregando histórico...</p>
          ) : historicoConsultas.length === 0 ? (
            <p className="accordion-placeholder">Nenhuma consulta anterior registrada.</p>
          ) : (
            <div className="historico-list">
              {historicoConsultas.map((consulta) => (
                <div key={consulta.id} className="historico-item">
                  <div className="historico-item-avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                  </div>
                  <div className="historico-item-info">
                    <div className="historico-item-date">
                      📅 {formatDate(consulta.data_consulta || consulta.createdAt)}
                    </div>
                  </div>
                  <button className="historico-item-button" onClick={() => onSetConsultaSelecionada(consulta)}>Ver</button>
                </div>
              ))}
            </div>
          )}
        </Accordion>

        <Accordion
          id="historico-prescricoes"
          title="Histórico de prescrições"
          isOpen={!!openAccordions['historico-prescricoes']}
          onToggle={toggleAccordion}
        >
          {loadingHistoricoPrescricoes ? (
            <p className="accordion-placeholder">Carregando histórico...</p>
          ) : historicoPrescricoes.length === 0 ? (
            <p className="accordion-placeholder">Nenhuma prescrição anterior registrada.</p>
          ) : (
            <div className="historico-list">
              {historicoPrescricoes.map((prescrito) => (
                <div key={prescrito.id} className="historico-item">
                  <div className="historico-item-avatar" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></svg>
                  </div>
                  <div className="historico-item-info">
                    <div className="historico-item-date" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {prescrito.medicamento} {prescrito.marca ? `(${prescrito.marca})` : ''}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                      {formatDate((prescrito as any).consulta?.data_consulta || (prescrito as any).consulta?.createdAt || prescrito.createdAt)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {prescrito.dosagem} • {prescrito.frequencia} • {prescrito.duracao}
                    </div>
                  </div>
                  <div className="historico-item-actions">
                    <button
                      className="action-btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.75rem', opacity: (prescrito as any).tem_pdf ? 1 : 0.4, cursor: (prescrito as any).tem_pdf ? 'pointer' : 'not-allowed' }}
                      disabled={!(prescrito as any).tem_pdf}
                      onClick={() => onDownloadPrescricaoPdf(prescrito.id)}
                      title={(prescrito as any).tem_pdf ? 'Baixar PDF Assinado' : 'PDF não disponível'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Accordion>

        <Accordion
          id="prescricoes"
          title="Prescrições"
          isOpen={!!openAccordions['prescricoes']}
          onToggle={toggleAccordion}
          isFilled={activePrescricoes.length > 0 || !!signedPdfFile}
        >
          {!prescricaoGerada ? (
            <>
              <div className="prescricoes-list" style={{ marginBottom: activePrescricoes.length > 0 ? '1rem' : '0' }}>
                {loadingPrescricoes ? (
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', textAlign: 'center' }}>Carregando...</p>
                ) : activePrescricoes.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' }}>Nenhuma prescrição adicionada.</p>
                ) : (
                  activePrescricoes.map((p) => (
                    <div key={p.id} className="prescricao-card">
                      <div className="prescricao-card-header">
                        <div>
                          <div className="prescricao-card-medicamento">{p.medicamento}</div>
                          {p.marca && <div className="prescricao-card-marca">{p.marca}</div>}
                        </div>
                        <button className="prescricao-card-btn-delete" onClick={() => onDeletePrescricao(p.id)} title="Excluir">✕</button>
                      </div>
                      <div className="prescricao-card-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span><strong>Dosagem:</strong> {p.dosagem}</span>
                        <span><strong>Frequência:</strong> {p.frequencia}</span>
                        <span><strong>Duração:</strong> {p.duracao}</span>
                      </div>
                      {p.inclusoConvenio && <div className="prescricao-card-badge">Convênio</div>}
                    </div>
                  ))
                )}
              </div>
              <div className="prescricao-form">
                {!showPrescricaoForm ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button className="prescricao-add-button" onClick={() => setShowPrescricaoForm(true)} style={{ width: '100%' }}><span>+</span> Adicionar Medicamento</button>
                    {activePrescricoes.length > 0 && (
                      <button className="prescricao-btn prescricao-btn-submit" style={{ width: '100%', padding: '12px', background: 'var(--color-primary-600)' }} onClick={onGenerateFinalPDF} disabled={isGeneratingPDF}>{isGeneratingPDF ? 'Processando...' : 'Gerar PDF para Assinar'}</button>
                    )}
                  </div>
                ) : (
                  <div className="prescricao-form-inputs">
                    <div className="prescricao-checkbox-wrapper">
                      <input type="checkbox" id="incluso-convenio" checked={prescricaoData.inclusoConvenio} onChange={(e) => setPrescricaoData(prev => ({ ...prev, inclusoConvenio: e.target.checked }))} />
                      <label htmlFor="incluso-convenio">Incluso no convênio</label>
                    </div>
                    <div className="prescricao-input-wrapper">
                      <label className="prescricao-input-label">Medicamento *</label>
                      <input type="text" className="prescricao-input" placeholder="Digite o nome do medicamento..." value={prescricaoData.medicamento} onChange={(e) => onMedicamentoChange(e.target.value)} onBlur={() => setTimeout(() => setShowMedicamentoSugestoes(false), 200)} />
                      {showMedicamentoSugestoes && medicamentoSugestoes.length > 0 && (
                        <div className="prescricao-suggestions">
                          {medicamentoSugestoes.map((sugestao, idx) => (
                            <div key={idx} className="prescricao-suggestions-item" onClick={() => { setPrescricaoData(prev => ({ ...prev, medicamento: sugestao })); setShowMedicamentoSugestoes(false); }}>{sugestao}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="prescricao-input-wrapper">
                      <label className="prescricao-input-label">Marca</label>
                      <input type="text" className="prescricao-input" placeholder="Digite a marca (opcional)..." value={prescricaoData.marca} onChange={(e) => onMarcaChange(e.target.value)} onBlur={() => setTimeout(() => setShowMarcaSugestoes(false), 200)} />
                      {showMarcaSugestoes && marcaSugestoes.length > 0 && (
                        <div className="prescricao-suggestions">
                          {marcaSugestoes.map((sugestao, idx) => (
                            <div key={idx} className="prescricao-suggestions-item" onClick={() => { setPrescricaoData(prev => ({ ...prev, marca: sugestao })); setShowMarcaSugestoes(false); }}>{sugestao}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="prescricao-input-wrapper"><label className="prescricao-input-label">Dosagem *</label><input type="text" className="prescricao-input" placeholder="Ex: 500mg, 1 comprimido, 5ml..." value={prescricaoData.dosagem} onChange={(e) => setPrescricaoData(prev => ({ ...prev, dosagem: e.target.value }))} /></div>
                    <div className="prescricao-input-wrapper"><label className="prescricao-input-label">Frequência *</label><input type="text" className="prescricao-input" placeholder="Ex: 8/8h, uma vez ao dia, se dor..." value={prescricaoData.frequencia} onChange={(e) => setPrescricaoData(prev => ({ ...prev, frequencia: e.target.value }))} /></div>
                    <div className="prescricao-input-wrapper"><label className="prescricao-input-label">Duração *</label><input type="text" className="prescricao-input" placeholder="Ex: 7 dias, uso contínuo..." value={prescricaoData.duracao} onChange={(e) => setPrescricaoData(prev => ({ ...prev, duracao: e.target.value }))} /></div>
                    <div className="prescricao-form-actions">
                      <button className="prescricao-btn prescricao-btn-cancel" onClick={onCancelPrescricaoForm} disabled={isSubmittingPrescricao}>Cancelar</button>
                      <button className="prescricao-btn prescricao-btn-submit" onClick={onSubmitPrescricao} disabled={isSubmittingPrescricao || !prescricaoData.medicamento || !prescricaoData.dosagem}>{isSubmittingPrescricao ? 'Salvando...' : 'Agregar'}</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="signed-upload-zone" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '2px dashed var(--border-color)', textAlign: 'center' }}>
                <input type="file" accept=".pdf" style={{ display: 'none' }} ref={hiddenFileInputRef} onChange={onSignedPdfUpload} />
                {signedPdfFile ? (
                  <div style={{ color: '#22c55e', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span>✅ PDF Assinado Anexado</span>
                    <button className="action-btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => hiddenFileInputRef.current?.click()}>Substituir</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Assine o PDF no <strong>Gov.br</strong> e anexe o arquivo final abaixo.</p>
                    <button className="prescricao-add-button" style={{ width: '100%', marginTop: '5px' }} onClick={() => hiddenFileInputRef.current?.click()}>Anexar PDF Assinado</button>
                  </div>
                )}
              </div>
              <button className="prescricao-btn-cancel" style={{ background: 'none', border: 'none', borderBottom: '1px solid currentColor', fontSize: '0.8rem', cursor: 'pointer', alignSelf: 'center', padding: '2px 0' }} onClick={() => setPrescricaoGerada(false)}>Voltar para edição de itens</button>
            </div>
          )}
        </Accordion>

        <Accordion id="notas" title="Notas" isOpen={!!openAccordions['notas']} onToggle={toggleAccordion}>
          <div className="notas-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!isEditingNotas ? (
              <>
                {pacienteNotas ? (
                  <div className="prescricao-card" style={{ marginBottom: '8px' }}>
                    <div className="prescricao-card-header"><div className="prescricao-card-medicamento">Notas do Paciente</div></div>
                    <div className="prescricao-card-info" style={{ whiteSpace: 'pre-wrap' }}>{pacienteNotas}</div>
                    <button className="prescricao-add-button" onClick={() => setIsEditingNotas(true)} style={{ marginTop: '12px', width: '100%', fontSize: '0.8rem', padding: '6px' }}>Editar Notas</button>
                  </div>
                ) : (
                  <button className="prescricao-add-button" onClick={() => setIsEditingNotas(true)} style={{ width: '100%' }}><span>+</span> Adicionar Notas</button>
                )}
              </>
            ) : (
              <>
                <textarea className="atendimento-textarea" placeholder="Notas exclusivas do médico sobre este paciente..." value={pacienteNotas} onChange={(e) => setPacienteNotas(e.target.value)} rows={6} style={{ minHeight: '150px', width: '100%' }} autoFocus />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="prescricao-btn prescricao-btn-cancel" onClick={() => setIsEditingNotas(false)} disabled={isSavingNotas} style={{ flex: 1 }}>Cancelar</button>
                  <button className="prescricao-btn prescricao-btn-submit" onClick={onSaveNotas} disabled={isSavingNotas} style={{ flex: 2 }}>{isSavingNotas ? 'Salvando...' : 'Salvar Notas'}</button>
                </div>
              </>
            )}
          </div>
        </Accordion>
      </div>
    </aside>
  );
};

export default ClinicalPanel;
