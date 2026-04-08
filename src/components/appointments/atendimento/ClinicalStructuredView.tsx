import React from 'react';
import { HistoriaClinicaItem } from '@/lib/axios/consultas';
import FormattedText from '@/components/common/FormattedText';

interface ClinicalStructuredViewProps {
  data: HistoriaClinicaItem | null | undefined;
  title?: string;
  showTitle?: boolean;
  variant?: 'compact' | 'report';
}

const ClinicalStructuredView: React.FC<ClinicalStructuredViewProps> = ({ 
  data, 
  title = "Triagem Inteligente", 
  showTitle = false,
  variant = 'compact'
}) => {
  if (!data) return <p className="csv-empty">Nenhum dado clínico disponível.</p>;

  // Função auxiliar para verificar se um dado é válido/não-vazio
  const hasValue = (val: any) => {
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    if (typeof val === 'string') return val.trim().length > 0 && !/^(não|nenhum|nega|n\/a|não informado)/i.test(val.trim());
    return true;
  };

  if (variant === 'report') {
    return (
      <div className="clinical-report-card">
        {/* Seção 1: Queixa e Sintomas */}
        {hasValue(data.queixaPrincipal) && (
          <div className="clinical-report-section">
            <h3>Motivo da Consulta</h3>
            <p>{data.queixaPrincipal}</p>
          </div>
        )}

        {hasValue(data.descricaoSintomas) && (
          <div className="clinical-report-section">
            <h3>Descrição dos Sintomas</h3>
            <p>{data.descricaoSintomas}</p>
          </div>
        )}

        {/* Seção 2: Histórico Pessoal */}
        {hasValue(data.historicoPessoal) && (
          <div className="clinical-report-section">
            <h3>Histórico Médico Pessoal</h3>
            {hasValue(data.historicoPessoal.doencas) && (
              <div className="clinical-report-item">
                <span className="clinical-report-label">Doenças crônicas</span>
                <span className="clinical-report-value">
                  {Array.isArray(data.historicoPessoal.doencas) 
                    ? data.historicoPessoal.doencas.join(', ') 
                    : data.historicoPessoal.doencas}
                </span>
              </div>
            )}
            {hasValue(data.historicoPessoal.medicamentos) && (
              <div className="clinical-report-item">
                <span className="clinical-report-label">Medicamentos em uso</span>
                <span className="clinical-report-value">
                  {Array.isArray(data.historicoPessoal.medicamentos) 
                    ? data.historicoPessoal.medicamentos.join(', ') 
                    : data.historicoPessoal.medicamentos}
                </span>
              </div>
            )}
            {hasValue(data.historicoPessoal.alergias) && (
              <div className="clinical-report-item">
                <span className="clinical-report-label alerta">Alergias</span>
                <span className="clinical-report-value alerta">
                  {Array.isArray(data.historicoPessoal.alergias) 
                    ? data.historicoPessoal.alergias.join(', ') 
                    : data.historicoPessoal.alergias}
                </span>
              </div>
            )}
            {hasValue(data.historicoPessoal.vacinacao) && (
              <div className="clinical-report-item">
                <span className="clinical-report-label">Vacinação</span>
                <span className="clinical-report-value">{data.historicoPessoal.vacinacao}</span>
              </div>
            )}
          </div>
        )}

        {/* Seção 3: Antecedentes Familiares */}
        {hasValue(data.antecedentesFamiliares) && (
          <div className="clinical-report-section">
            <h3>Antecedentes Familiares</h3>
            {Object.entries(data.antecedentesFamiliares).map(([key, val]: [string, any]) => (
              <div key={key} className="clinical-report-item">
                <span className="clinical-report-label" style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                <span className="clinical-report-value">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Seção 4: Estilo de Vida */}
        {hasValue(data.estiloVida) && (
          <div className="clinical-report-section">
            <h3>Estilo de Vida</h3>
            {Object.entries(data.estiloVida).map(([key, val]: [string, any]) => (
              <div key={key} className="clinical-report-item">
                <span className="clinical-report-label" style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                <span className="clinical-report-value">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Fallback */}
        {(!hasValue(data.queixaPrincipal) && !hasValue(data.historicoPessoal)) && data.conteudo && (
          <div className="clinical-report-section">
            <h3>Resumo Clínico</h3>
            <FormattedText text={data.conteudo} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="clinical-structured-view">
      {showTitle && <h3 className="csv-main-title">{title}</h3>}

      {/* Seção 1: Queixa e Sintomas */}
      {(hasValue(data.queixaPrincipal) || hasValue(data.descricaoSintomas)) && (
        <div className="csv-section">
          <div className="csv-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            Motivo do Atendimento
          </div>
          <div className="csv-grid">
            {hasValue(data.queixaPrincipal) && (
              <div className="csv-item">
                <label className="csv-label">Queixa Principal</label>
                <div className="csv-value">{data.queixaPrincipal}</div>
              </div>
            )}
            {hasValue(data.descricaoSintomas) && (
              <div className="csv-item">
                <label className="csv-label">Descrição dos Sintomas</label>
                <div className="csv-value">{data.descricaoSintomas}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seção 2: Histórico Pessoal */}
      {hasValue(data.historicoPessoal) && (
        <div className="csv-section">
          <div className="csv-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Histórico Médico Pessoal
          </div>
          <div className="csv-grid">
            {hasValue(data.historicoPessoal.doencas) && (
              <div className="csv-item">
                <label className="csv-label">Doenças Crônicas</label>
                <div className="csv-value">
                  {Array.isArray(data.historicoPessoal.doencas) 
                    ? data.historicoPessoal.doencas.join(', ') 
                    : data.historicoPessoal.doencas}
                </div>
              </div>
            )}
            {hasValue(data.historicoPessoal.medicamentos) && (
              <div className="csv-item">
                <label className="csv-label">Medicamentos em Uso</label>
                <div className="csv-value">
                  {Array.isArray(data.historicoPessoal.medicamentos) 
                    ? data.historicoPessoal.medicamentos.join(', ') 
                    : data.historicoPessoal.medicamentos}
                </div>
              </div>
            )}
            {hasValue(data.historicoPessoal.alergias) && (
              <div className="csv-item">
                <label className="csv-label">Alergias</label>
                <div className="csv-value alert">
                  ⚠️ {Array.isArray(data.historicoPessoal.alergias) 
                    ? data.historicoPessoal.alergias.join(', ') 
                    : data.historicoPessoal.alergias}
                </div>
              </div>
            )}
            {hasValue(data.historicoPessoal.vacinacao) && (
              <div className="csv-item">
                <label className="csv-label">Vacinação</label>
                <div className="csv-value">{data.historicoPessoal.vacinacao}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seção 3: Antecedentes Familiares */}
      {hasValue(data.antecedentesFamiliares) && (
        <div className="csv-section">
          <div className="csv-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Antecedentes Familiares
          </div>
          <div className="csv-grid">
            {Object.entries(data.antecedentesFamiliares).map(([key, val]: [string, any]) => (
              <div key={key} className="csv-item">
                <label className="csv-label">{key}</label>
                <div className="csv-value">{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção 4: Estilo de Vida */}
      {hasValue(data.estiloVida) && (
        <div className="csv-section">
          <div className="csv-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
            Estilo de Vida
          </div>
          <div className="csv-grid">
            {Object.entries(data.estiloVida).map(([key, val]: [string, any]) => (
              <div key={key} className="csv-item">
                <label className="csv-label">{key}</label>
                <div className="csv-value">{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback */}
      {!hasValue(data.queixaPrincipal) && !hasValue(data.historicoPessoal) && data.conteudo && (
        <div className="csv-section">
          <div className="csv-section-title">Resumo Clínico</div>
          <FormattedText text={data.conteudo} />
        </div>
      )}
    </div>
  );
};

export default ClinicalStructuredView;
