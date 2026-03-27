import React from 'react';

interface TemplateProps {
  consultaDetails: any;
  activePrescricoes: any[];
}

const PrescriptionPDFTemplate: React.FC<TemplateProps> = ({ consultaDetails, activePrescricoes }) => {
  return (
    <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
      <div id="atendimento-prescription-pdf-template" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', background: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif' }}>
        <header style={{ borderBottom: '2px solid #2563eb', paddingBottom: '5mm', marginBottom: '8mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1 style={{ fontSize: '24pt', fontWeight: 800, color: '#2563eb', marginBottom: '2mm' }}>JJ Telemedicina</h1><p style={{ fontSize: '10pt', color: '#64748b' }}>Atendimento Médico Digital</p></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: '11pt', fontWeight: 600 }}>PRESCRICAO MÉDICA</div><div style={{ fontSize: '9pt', color: '#64748b' }}>{new Date().toLocaleDateString('pt-BR')}</div></div>
        </header>

        <section style={{ marginBottom: '8mm', padding: '5mm', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '3mm', borderBottom: '1px solid #cbd5e1', paddingBottom: '1mm' }}>Paciente</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm' }}>
            <div><label style={{ fontSize: '8pt', color: '#64748b', display: 'block' }}>Nome Completo</label><div style={{ fontSize: '12pt', fontWeight: 700 }}>{consultaDetails?.paciente?.nome_completo || 'NOME DO PACIENTE'}</div></div>
            <div><label style={{ fontSize: '8pt', color: '#64748b', display: 'block' }}>CPF</label><div style={{ fontSize: '12pt', fontWeight: 600 }}>{consultaDetails?.paciente?.cpf || '000.000.000-00'}</div></div>
          </div>
        </section>

        <section style={{ marginBottom: '10mm', minHeight: '120mm' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '5mm', borderBottom: '1px solid #cbd5e1', paddingBottom: '1mm' }}>Prescrição</h2>
          {activePrescricoes.map((p, idx) => (
            <div key={idx} style={{ marginBottom: '6mm', padding: '4mm', borderLeft: '3px solid #2563eb', background: '#fcfcfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5mm' }}>
                <span style={{ fontSize: '13pt', fontWeight: 800 }}>{idx + 1}. {p.medicamento}</span>
                {p.marca && <span style={{ fontSize: '10pt', fontStyle: 'italic', color: '#64748b' }}>({p.marca})</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2mm', fontSize: '10.5pt' }}>
                <div><strong>Dosagem:</strong> {p.dosagem}</div>
                <div><strong>Frequência:</strong> {p.frequencia}</div>
                <div><strong>Duração:</strong> {p.duracao}</div>
              </div>
            </div>
          ))}
        </section>

        <footer style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '5mm', fontSize: '9pt', color: '#64748b' }}>
          <div style={{ textAlign: 'center', marginBottom: '4mm' }}><div style={{ fontSize: '11pt', fontWeight: 700, color: '#1e40af' }}>Dr(a). {consultaDetails?.medico?.nome_completo || 'NOME DO MÉDICO'}</div><div>CRM: {consultaDetails?.medico?.crm || '000000'}</div></div>
          <p style={{ textAlign: 'center', fontSize: '8pt' }}>Esta prescrição deve ser assinada digitalmente através do portal Gov.br para ter validade legal conforme a legislação brasileira de telemedicina.</p>
        </footer>
      </div>
    </div>
  );
};

export default PrescriptionPDFTemplate;
