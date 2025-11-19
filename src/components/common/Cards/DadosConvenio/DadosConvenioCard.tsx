// global styles for register are imported in app layout
import './DadosConvenioCard.css';
import Input from '@/components/common/Inputs/Input';
import Button from '@/components/common/Buttons/Button';
import TermsModal from '@/components/common/Modals/TermsModal/TermsModal';
import { useState } from 'react';

type Props = {
  onBack?: () => void;
  onComplete?: (data?: any) => void;
};

export default function DadosConvenioCard({ onBack, onComplete }: Props) {
  const [convenio, setConvenio] = useState('');
  const [numero, setNumero] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { convenio, numero };
    setPendingData(data);
    setShowTermsModal(true);
  }

  return (
    <section className="register-card dados-convenio-card">
      <h1 className="register-title">Convênio</h1>
      <p className="register-subtitle">Etapa 3 de 3 - Convênio</p>

      <form className="register-form" onSubmit={handleSubmit}>
        <label className="form-label">
          <span className="label-title">Selecione seu convênio</span>
          <select className="c-input" value={convenio} onChange={(e) => setConvenio(e.target.value)}>
            <option value="">Selecione</option>
            <option value="unimed">Unimed</option>
            <option value="amil">Amil</option>
            <option value="bradesco">Bradesco Saúde</option>
            <option value="sulamerica">SulAmérica</option>
          </select>
        </label>

        <label className="form-label">
          <span className="label-title">Numero da carteirinha</span>
          <Input mask="cpf" placeholder="000.000.000-00" value={numero} onChange={(e) => setNumero(e.target.value)} />
        </label>

        {/* Validade removed per request */}

        <div className="skip-row" style={{ gridColumn: '1 / -1', textAlign: 'center', margin: '0.5rem 0 0' }}>
          <Button
            type="button"
            variant="ghost"
            className="skip-step"
            onClick={() => {
              setPendingData(undefined);
              setShowTermsModal(true);
            }}
          >
            Pular essa etapa
          </Button>
        </div>

        <div className="form-actions actions-full">
          <Button type="button" variant="ghost" onClick={onBack} className="btn-equal">Voltar</Button>
          <Button type="submit" variant="primary" className="btn-equal">Próximo</Button>
        </div>
      </form>
      <TermsModal
        open={showTermsModal}
        onConfirm={() => {
          setShowTermsModal(false);
          onComplete?.(pendingData);
        }}
        onCancel={() => {
          setShowTermsModal(false);
        }}
      />
    </section>
  );
}
