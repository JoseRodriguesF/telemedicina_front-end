import React from 'react';
import ContentModal from '@/components/common/Modal/ContentModal';
import Button from '@/components/common/Buttons/Button';
import { formatDate } from '@/lib/utils/dateFormatters';
import { CID10 } from '@/lib/constants/cid10';

interface ModalsProps {
  consultaSelecionada: any;
  setConsultaSelecionada: (v: any) => void;
  loadingAnexosHistory: boolean;
  isConfirmingEnd: boolean;
  setIsConfirmingEnd: (v: boolean) => void;
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
}

const AtendimentoModals: React.FC<ModalsProps> = ({
  consultaSelecionada,
  setConsultaSelecionada,
  loadingAnexosHistory,
  isConfirmingEnd,
  setIsConfirmingEnd,
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
  anexos
}) => {
  return (
    <>
      {/* Modal de Detalhes da Consulta */}
      <ContentModal isOpen={!!consultaSelecionada} onClose={() => setConsultaSelecionada(null)} title="Detalhes do Atendimento" size="md">
        {consultaSelecionada && (
          <div className="history-details-modal">
            <div className="details-section">
              <h4>Informações Gerais</h4>
              <div className="details-grid">
                <div className="detail-item"><label>Data:</label><span>{consultaSelecionada.data_consulta ? formatDate(consultaSelecionada.data_consulta) : formatDate(consultaSelecionada.createdAt)}</span></div>
                <div className="detail-item"><label>Médico:</label><span>{consultaSelecionada.medico?.nome_completo || '-'}</span></div>
                <div className="detail-item"><label>Hora Início:</label><span>{consultaSelecionada.hora_inicio ? new Date(consultaSelecionada.hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span></div>
                <div className="detail-item"><label>Hora Fim:</label><span>{consultaSelecionada.hora_fim ? new Date(consultaSelecionada.hora_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span></div>
              </div>
            </div>
            <div className="details-section"><h4>Diagnóstico</h4><p className="detail-text">{consultaSelecionada.diagnostico || 'Não registrado'}</p></div>
            <div className="details-section"><h4>Evolução</h4><p className="detail-text">{consultaSelecionada.evolucao || 'Não registrada'}</p></div>
            <div className="details-section"><h4>Plano Terapêutico</h4><p className="detail-text">{consultaSelecionada.plano_terapeutico || 'Não registrado'}</p></div>
            <div className="details-grid-bottom">
              <div className="details-section"><h4>Repouso</h4><p className="detail-text">{consultaSelecionada.repouso || 'Não registrado'}</p></div>
              <div className="details-section"><h4>Destino Final</h4><p className="detail-text">{consultaSelecionada.destino_final || 'Não registrado'}</p></div>
            </div>
            {/* ... other detail sections ... */}
          </div>
        )}
      </ContentModal>

      {/* Modal de Finalização (Médico) */}
      <ContentModal isOpen={isConfirmingEnd} onClose={() => setIsConfirmingEnd(false)} title="Confirmar Informações do Atendimento" size="xl">
        <div className="confirmation-screen">
          <p className="confirmation-description">Revise abaixo todas as informações inseridas durante a consulta. Você pode editá-las antes de finalizar definitivamente.</p>
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
            <Button variant="ghost" onClick={() => setIsConfirmingEnd(false)}>Voltar</Button>
            <Button variant="primary" onClick={onConfirmFinishWithValidation}>Confirmar e Finalizar Atendimento</Button>
          </div>
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
