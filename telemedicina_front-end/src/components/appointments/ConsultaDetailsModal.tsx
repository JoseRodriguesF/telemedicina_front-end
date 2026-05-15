import React from 'react';
import ContentModal from '@/components/common/Modal/ContentModal';
import ClinicalStructuredView from '@/components/appointments/atendimento/ClinicalStructuredView';
import { ConsultaDetails } from '@/lib/axios/consultas';
import { formatTime } from '@/lib/utils/dateFormatters';

interface ConsultaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultaDetails: ConsultaDetails | null;
  selectedAppt?: any;
  isMedico: boolean;
  loadingDetails: boolean;
  loadingAnexos?: boolean;
  canJoin?: boolean;
  timeRemaining?: string;
  onAttend?: (id: number) => void;
  onCancel?: (id: number) => void;
}

export function ConsultaDetailsModal({
  isOpen,
  onClose,
  consultaDetails,
  selectedAppt,
  isMedico,
  loadingDetails,
  loadingAnexos = false,
  canJoin = true,
  timeRemaining = '',
  onAttend,
  onCancel
}: ConsultaDetailsModalProps) {
  return (
    <ContentModal
      isOpen={isOpen}
      onClose={onClose}
      title={isMedico ? "Ficha de Pré-Atendimento" : "Detalhes da Consulta"}
      size="md"
    >
      {loadingDetails ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      ) : consultaDetails ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '0.5rem' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isMedico ? 'Paciente' : 'Médico'}</h4>
            {isMedico && <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{consultaDetails.paciente?.nome_completo || 'Paciente'}</p>}
            {!isMedico && (
              <>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedAppt?.medico?.nome_completo || 'Médico'}</p>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Clínico Geral</span>
              </>
            )}
          </div>

          {selectedAppt?.data_consulta && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 0.25rem', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Data</h4>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(selectedAppt.data_consulta).toLocaleDateString('pt-BR')}</p>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 0.25rem', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Horário</h4>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{formatTime(selectedAppt.hora_inicio)}</p>
              </div>
            </div>
          )}

          <div className="pc-relatorio-container" style={{ padding: 0, marginTop: selectedAppt?.data_consulta ? '1rem' : '0' }}>
            <div className="clinical-report-card">
              <div className="clinical-report-section">
                <h3>👤 Dados do Paciente</h3>
                <div className="clinical-report-item">
                  <span className="clinical-report-label">Nome:</span>
                  <span>{selectedAppt?.paciente?.nome_completo || consultaDetails.paciente?.nome_completo || 'Paciente'}</span>
                </div>
              </div>
            </div>

            {consultaDetails.historiaClinica ? (
              <ClinicalStructuredView data={consultaDetails.historiaClinica} variant="report" />
            ) : (
              <div className="clinical-report-card">
                <div className="clinical-report-section" style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '2px dashed var(--border-color)', borderRadius: '1.25rem' }}>
                  <p style={{ margin: 0 }}>Informações de triagem não encontradas.</p>
                </div>
              </div>
            )}
          </div>

          {/* Seção de Anexos */}
          {(consultaDetails?.anexos && consultaDetails.anexos.length > 0) || loadingAnexos ? (
            <div style={{ marginTop: '0.25rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', color: 'var(--color-primary-500)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                Arquivos de Suporte / Exames
              </h4>
              {loadingAnexos ? (
                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                  <div className="mini-spinner"></div>
                  Buscando anexos...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {consultaDetails.anexos?.map((file: any, idx: number) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      background: 'var(--bg-tertiary)',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--color-primary-500)' }}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {file.nome}
                        </span>
                      </div>
                      <button 
                        onClick={() => window.open(file.url, '_blank')}
                        style={{
                          background: 'var(--color-primary-50)',
                          border: 'none',
                          color: 'var(--color-primary-600)',
                          cursor: 'pointer',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700
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

          {isMedico ? (
            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                className="btn btn-modal-back"
                onClick={onClose}
                style={{ borderRadius: 'var(--radius-lg)', padding: '0.8rem' }}
              >
                Fechar
              </button>
              {onAttend && (
                <button
                  className="btn primary"
                  onClick={() => onAttend(selectedAppt?.id || consultaDetails.id)}
                  disabled={selectedAppt?.status !== 'solicitada' && selectedAppt?.status !== 'scheduled' && !canJoin}
                  style={{ 
                    borderRadius: 'var(--radius-lg)', 
                    padding: '0.8rem',
                    opacity: (selectedAppt?.status !== 'solicitada' && selectedAppt?.status !== 'scheduled' && !canJoin) ? 0.6 : 1,
                    cursor: (selectedAppt?.status !== 'solicitada' && selectedAppt?.status !== 'scheduled' && !canJoin) ? 'not-allowed' : 'pointer',
                    flexDirection: 'column',
                    height: 'auto',
                    minHeight: '3rem'
                  }}
                >
                  <span style={{ display: 'block' }}>
                    {selectedAppt?.status === 'solicitada' ? 'Confirmar Agora' : 'Atender agora'}
                  </span>
                  {selectedAppt?.status !== 'solicitada' && selectedAppt?.status !== 'scheduled' && !canJoin && (
                    <span style={{ fontSize: '0.7rem', opacity: 0.9, fontWeight: 400 }}>
                      {timeRemaining === 'Consulta expirada' ? 'Prazo excedido' : 'Fora do horário'}
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                className="btn btn-modal-back"
                onClick={onClose}
                style={{ borderRadius: 'var(--radius-lg)', padding: '0.8rem' }}
              >
                Voltar
              </button>
              {onCancel && (
                <button
                  className="btn danger"
                  onClick={() => onCancel(selectedAppt?.id || consultaDetails.id)}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.8rem',
                    backgroundColor: 'var(--color-error-soft, #fee2e2)',
                    color: 'var(--color-error, #dc2626)',
                    border: '1px solid var(--color-error-border, #fecaca)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {selectedAppt?.status === 'solicitada' ? 'Retirar Solicitação' : 'Desmarcar Consulta'}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
          Erro ao carregar os detalhes.
        </div>
      )}
    </ContentModal>
  );
}
