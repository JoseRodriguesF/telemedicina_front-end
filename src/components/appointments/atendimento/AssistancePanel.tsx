import React from 'react';
import Accordion from './Accordion';
import AddressAutocomplete from '@/components/common/Inputs/AddressAutocomplete';
import { ConsultaDetails } from '@/lib/axios/consultas';
import { CID10 } from '@/lib/constants/cid10';

interface AssistancePanelProps {
  consultaDetails: ConsultaDetails | null;
  calculateAge: (birthDate: any) => string;
  openAccordions: Record<string, boolean>;
  toggleAccordion: (id: string) => void;
  atendimentoData: any;
  setAtendimentoData: (updater: (prev: any) => any) => void;
  showValidation: boolean;
  cidSearch: string;
  cidSugestoes: CID10[];
  showCidSugestoes: boolean;
  onDiagnosticoChange: (v: string) => void;
  setShowCidSugestoes: (v: boolean) => void;
  onSelectCID: (cid: CID10) => void;
  onRemoveCID: (code: string) => void;
  repousoOptions: string[];
  destinoFinalOptions: string[];
  onOptionToggle: (field: 'repouso' | 'destino_final', option: string) => void;
}

const AssistancePanel: React.FC<AssistancePanelProps> = ({
  consultaDetails,
  calculateAge,
  openAccordions,
  toggleAccordion,
  atendimentoData,
  setAtendimentoData,
  showValidation,
  cidSearch,
  cidSugestoes,
  showCidSugestoes,
  onDiagnosticoChange,
  setShowCidSugestoes,
  onSelectCID,
  onRemoveCID,
  repousoOptions,
  destinoFinalOptions,
  onOptionToggle
}) => {
  return (
    <aside className="side-panel right-panel">
      <div className="panel-header">Informações pessoais do paciente</div>
      <div className="patient-info">
        {consultaDetails ? (
          <>
            <div className="patient-info-row"><span className="patient-info-label">Nome:</span><span className="patient-info-value">{consultaDetails.paciente?.nome_completo || '-'}</span></div>
            <div className="patient-info-row"><span className="patient-info-label">Gênero:</span><span className="patient-info-value" style={{ textTransform: 'capitalize' }}>{consultaDetails.paciente?.sexo || '-'}</span></div>
            <div className="patient-info-row"><span className="patient-info-label">Idade:</span><span className="patient-info-value">{calculateAge(consultaDetails.paciente?.data_nascimento)} anos</span></div>
            <div className="patient-info-row"><span className="patient-info-label">CPF:</span><span className="patient-info-value">{consultaDetails.paciente?.cpf || '-'}</span></div>
            <div className="patient-info-row"><span className="patient-info-label">Telefone:</span><span className="patient-info-value">{consultaDetails.paciente?.telefone || '-'}</span></div>
          </>
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>Carregando dados...</div>
        )}
      </div>

      <div className="panel-header">Ficha de atendimento</div>
      <div className="panel-content">
        <Accordion
          id="evolucao"
          title="Evolução"
          isOpen={!!openAccordions['evolucao']}
          onToggle={toggleAccordion}
          isFilled={!!atendimentoData.evolucao}
          isMissing={showValidation && !atendimentoData.evolucao.trim()}
        >
          <textarea
            className="atendimento-textarea"
            placeholder="Registre a evolução do paciente..."
            value={atendimentoData.evolucao}
            onChange={(e) => {
              setAtendimentoData(prev => ({ ...prev, evolucao: e.target.value }));
              e.target.style.height = 'inherit';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
        </Accordion>

        <Accordion
          id="plano-terapeutico"
          title="Plano Terapêutico"
          isOpen={!!openAccordions['plano-terapeutico']}
          onToggle={toggleAccordion}
          isFilled={!!atendimentoData.plano_terapeutico}
          isMissing={showValidation && !atendimentoData.plano_terapeutico.trim()}
        >
          <textarea
            className="atendimento-textarea"
            placeholder="Defina o plano terapêutico..."
            value={atendimentoData.plano_terapeutico}
            onChange={(e) => {
              setAtendimentoData(prev => ({ ...prev, plano_terapeutico: e.target.value }));
              e.target.style.height = 'inherit';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
        </Accordion>

        <Accordion
          id="resumo"
          title="Resumo da Consulta (AI)"
          isOpen={!!openAccordions['resumo']}
          onToggle={toggleAccordion}
          isFilled={!!atendimentoData.resumo_consulta}
        >
          <textarea
            className="atendimento-textarea"
            placeholder="O resumo gerado pela transcrição aparecerá aqui..."
            value={atendimentoData.resumo_consulta}
            onChange={(e) => {
              setAtendimentoData(prev => ({ ...prev, resumo_consulta: e.target.value }));
              // Auto-expand
              e.target.style.height = 'inherit';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
          <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '4px', fontStyle: 'italic' }}>
            Este campo pode ser preenchido automaticamente pela transcrição de áudio.
          </p>
        </Accordion>

        <Accordion
          id="diagnostico"
          title="Diagnóstico"
          isOpen={!!openAccordions['diagnostico']}
          onToggle={toggleAccordion}
          isFilled={!!atendimentoData.diagnostico}
          isMissing={showValidation && !atendimentoData.diagnostico.trim()}
        >
          <div className="cid-selection-container">
            <div className="cid-chips-wrapper">
              {atendimentoData.selectedCIDs.map((cid: CID10) => (
                <div key={cid.codigo} className="cid-chip">
                  <span className="cid-chip-code">{cid.codigo}</span>
                  <span className="cid-chip-name">{cid.nome}</span>
                  <button className="cid-chip-remove" onClick={() => onRemoveCID(cid.codigo)} type="button" title="Remover CID">✕</button>
                </div>
              ))}
            </div>
            <div className="address-search-wrapper" style={{ position: 'relative' }}>
              <input
                type="text"
                className="atendimento-input-small"
                placeholder={atendimentoData.selectedCIDs.length > 0 ? "Adicionar outro CID..." : "Buscar por CID ou nome da doença..."}
                value={cidSearch}
                onChange={(e) => onDiagnosticoChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowCidSugestoes(false), 200)}
              />
              <span className="search-icon-inside"><img src="/icons/Search.png" alt="Buscar" width="16" height="16" /></span>
              {showCidSugestoes && cidSugestoes.length > 0 && (
                <div className="prescricao-suggestions" style={{ width: '100%', top: '100%', zIndex: 100 }}>
                  {cidSugestoes.map((cid, idx) => (
                    <div key={idx} className="prescricao-suggestions-item" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }} onClick={() => onSelectCID(cid)}>
                      <strong style={{ color: 'var(--color-primary-600)' }}>{cid.codigo}</strong> - {cid.nome}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="diagnostico-manual-wrapper" style={{ marginTop: '12px' }}>
              <span className="input-label-text">Observações do Diagnóstico</span>
              <textarea
                className="atendimento-textarea"
                style={{ minHeight: '60px', padding: '8px', fontSize: '0.85rem' }}
                placeholder="Complemento manual do diagnóstico (opcional)..."
                value={atendimentoData.diagnostico.split(', ').filter((s: string) => !atendimentoData.selectedCIDs.some((c: CID10) => `${c.codigo} - ${c.nome}` === s)).join(', ')}
                onChange={(e) => {
                  const manualText = e.target.value;
                  const cidText = atendimentoData.selectedCIDs.map((c: CID10) => `${c.codigo} - ${c.nome}`).join(', ');
                  const fullText = cidText ? (manualText ? `${cidText}, ${manualText}` : cidText) : manualText;
                  setAtendimentoData(prev => ({ ...prev, diagnostico: fullText }));
                }}
              />
            </div>
          </div>
        </Accordion>

        <Accordion id="repouso" title="Repouso" isOpen={!!openAccordions['repouso']} onToggle={toggleAccordion} isFilled={!!atendimentoData.repouso} isMissing={showValidation && !atendimentoData.repouso}>
          <div className="options-grid">
            {repousoOptions.map(option => (
              <label key={option} className={`option-card ${atendimentoData.repouso === option ? 'selected' : ''}`}>
                <input type="checkbox" className="hidden-checkbox" checked={atendimentoData.repouso === option} onChange={() => onOptionToggle('repouso', option)} />
                <div className="option-indicator"></div><span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        </Accordion>

        <Accordion id="destino-final" title="Destino Final" isOpen={!!openAccordions['destino-final']} onToggle={toggleAccordion} isFilled={!!atendimentoData.destino_final} isMissing={showValidation && !atendimentoData.destino_final}>
          <div className="options-grid">
            {destinoFinalOptions.map(option => (
              <div key={option} className="option-container">
                <label className={`option-card ${atendimentoData.destino_final === option ? 'selected' : ''}`}>
                  <input type="checkbox" className="hidden-checkbox" checked={atendimentoData.destino_final === option} onChange={() => onOptionToggle('destino_final', option)} />
                  <div className="option-indicator"></div><span className="option-text">{option}</span>
                </label>
                {/* Ambulancia fields */}
                {atendimentoData.destino_final === option && option.toLowerCase().includes('ambulância') && (
                  <div className="ambulance-address-form">
                    <div className="address-row"><span className="input-label-text">Buscar endereço</span><div className="address-search-wrapper"><AddressAutocomplete placeholder="Ex: Av. Paulista, 1000" className="atendimento-input-small" value={atendimentoData.endereco_ambulancia.endereco} onChange={(v) => setAtendimentoData(prev => ({ ...prev, endereco_ambulancia: { ...prev.endereco_ambulancia, endereco: v } }))} /><span className="search-icon-inside"><img src="/icons/Search.png" alt="Buscar" width="16" height="16" /></span></div></div>
                    <div className="address-row"><span className="input-label-text">Complemento</span><input type="text" placeholder="Ex: Bloco B, Apto 101" className="atendimento-input-small" value={atendimentoData.endereco_ambulancia.complemento} onChange={(e) => setAtendimentoData(prev => ({ ...prev, endereco_ambulancia: { ...prev.endereco_ambulancia, complemento: e.target.value } }))} /></div>
                    <div className="address-row"><span className="input-label-text">Informações adicionais</span><input type="text" placeholder="Ponto de referência, observações..." className="atendimento-input-small" value={atendimentoData.endereco_ambulancia.informacoes_adicionais} onChange={(e) => setAtendimentoData(prev => ({ ...prev, endereco_ambulancia: { ...prev.endereco_ambulancia, informacoes_adicionais: e.target.value } }))} /></div>
                    <div className="address-row"><div className="input-with-label"><span className="input-label-text">Telefone de contato</span><input type="text" placeholder="(00) 00000-0000" className="atendimento-input-small" value={atendimentoData.endereco_ambulancia.telefone} onChange={(e) => setAtendimentoData(prev => ({ ...prev, endereco_ambulancia: { ...prev.endereco_ambulancia, telefone: e.target.value } }))} /></div></div>
                  </div>
                )}
                {/* Seguimento externo */}
                {atendimentoData.destino_final === option && option.toLowerCase().includes('seguimento externo') && (
                  <div className="ambulance-address-form" style={{ marginTop: '0.5rem' }}>
                    <div className="address-row"><span className="input-label-text">Especialidade recomendada</span><input type="text" placeholder="Ex: Cardiologista, Ortopedia..." className="atendimento-input-small" value={atendimentoData.especialidade_seguimento} onChange={(e) => setAtendimentoData(prev => ({ ...prev, especialidade_seguimento: e.target.value }))} /></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Accordion>
      </div>
    </aside>
  );
};

export default AssistancePanel;
