'use client';

// global styles for register are imported in app layout
import './DadosConvenioCard.css';
import Input from '@/components/common/Inputs/Input';
import Button from '@/components/common/Buttons/Button';
import TermsModal from '@/components/common/Modals/TermsModal/TermsModal';
import { useState } from 'react';
import createPessoais from '@/lib/axios/pessoais';

type Props = {
  onBack?: () => void;
  onComplete?: (data?: any) => void;
  userId?: number | null;
  pessoaisData?: any | null;
};

export default function DadosConvenioCard({ onBack, onComplete, userId, pessoaisData }: Props) {
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
        onConfirm={async () => {
          setShowTermsModal(false);
          // build final payload combining pessoaisData and convenio
          if (!userId && !pessoaisData) {
            onComplete?.(undefined);
            return;
          }
          const payload = {
            usuario_id: userId,
            nome_completo: pessoaisData?.name || pessoaisData?.nome || '',
            data_nascimento: (() => {
              const d = (pessoaisData?.birthDate || '').trim();
              if (!d) return ''; if (d.includes('/')) { const parts = d.split('/'); if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`; }
              return d;
            })(),
            cpf: (pessoaisData?.cpf || '').replace(/\D/g, ''),
            sexo: pessoaisData?.gender || pessoaisData?.sexo || '',
            estado_civil: pessoaisData?.marital || pessoaisData?.estado_civil || '',
            endereco: pessoaisData?.address || pessoaisData?.endereco || '',
            telefone: (pessoaisData?.number || '').replace(/\D/g, ''),
            responsavel_legal: pessoaisData?.guardian || null,
            telefone_responsavel: (pessoaisData?.guardianContact || '').replace(/\D/g, '') || null,
            convenio: pendingData?.convenio || null,
            numero_carteirinha: (pendingData?.numero || '') || null,
          };
          try {
            const resp = await createPessoais(payload);
            onComplete?.(resp);
          } catch (err: any) {
            // propagate error upward if desired
            onComplete?.(undefined);
          }
        }}
        onCancel={() => {
          setShowTermsModal(false);
        }}
      />
    </section>
  );
}
