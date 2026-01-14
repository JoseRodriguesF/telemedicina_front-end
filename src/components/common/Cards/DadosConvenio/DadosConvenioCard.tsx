'use client';

// global styles for register are imported in app layout
import './DadosConvenioCard.css';
import Input from '@/components/common/Inputs/Input';
import Button from '@/components/common/Buttons/Button';
import TermsModal from '@/components/common/Modals/TermsModal/TermsModal';
import { useState } from 'react';
import createPessoais from '@/lib/axios/pessoais';
import { saveUser, getUserId } from '@/lib/auth';

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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { convenio, numero };
    setPendingData(data);
    setShowTermsModal(true);
  }

  return (
    <section className="register-card dados-convenio-card">
      <div className="register-brand">
        <h1>Telemedicina</h1>
        <p>Informe seus dados de convênio (opcional)</p>
      </div>

      <h1 className="register-title">Convênio</h1>
      <p className="register-subtitle">Etapa 3 de 3</p>

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
        loading={loading}
        onConfirm={async () => {
          if (!userId && !pessoaisData) {
            setShowTermsModal(false);
            onComplete?.(undefined);
            return;
          }
          setErrorMessage('');
          setLoading(true);
          // Normalizações para backend
          const estadoCivilForApi = (() => {
            const v = String(pessoaisData?.marital || pessoaisData?.estado_civil || '').toLowerCase();
            if (v.startsWith('solte')) return 'solteiro';
            if (v.startsWith('casad')) return 'casado';
            if (v.startsWith('divorc')) return 'divorciado';
            if (v.startsWith('viuv') || v.startsWith('viúv')) return 'viuvo';
            return (pessoaisData?.estado_civil || '').toLowerCase();
          })();

          const payload = {
            usuario_id: userId ?? getUserId(),
            nome_completo: pessoaisData?.name || pessoaisData?.nome || '',
            data_nascimento: (() => {
              const d = (pessoaisData?.birthDate || '').trim();
              if (!d) return '';
              if (d.includes('/')) {
                const parts = d.split('/');
                if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
              return d;
            })(),
            cpf: (pessoaisData?.cpf || '').replace(/\D/g, ''),
            sexo: (() => {
              const s = (pessoaisData?.gender || pessoaisData?.sexo || '').toString().toLowerCase();
              if (s === 'm' || s.startsWith('masc')) return 'M';
              if (s === 'f' || s.startsWith('fem')) return 'F';
              return '';
            })(),
            estado_civil: estadoCivilForApi,
            telefone: (pessoaisData?.number || '')?.replace(/\D/g, '') || '',
            endereco: {
              endereco: pessoaisData?.address || pessoaisData?.endereco || '',
              numero: (() => {
                const n = (pessoaisData?.addressNumber ?? pessoaisData?.numero);
                if (n === null || n === undefined) return null;
                const v = Number(String(n).replace(/\D/g, ''));
                return Number.isFinite(v) ? v : null;
              })(),
              complemento: (() => {
                const v = (pessoaisData?.complement || pessoaisData?.complemento || '').trim();
                return v ? v : null;
              })(),
            },
            responsavel_legal: (() => {
              const v = (pessoaisData?.guardian || '').trim();
              return v ? v : null;
            })(),
            telefone_responsavel: (() => {
              const v = (pessoaisData?.guardianContact || '')?.replace(/\D/g, '') || '';
              return v ? v : null;
            })(),
            // NOTE: Convênio and numero_carteirinha were removed from API — do not include them
          };

          try {
            const resp = await createPessoais(payload);
            if (resp?.user) {
              try {
                saveUser(resp.user);
              } catch (_) {
                // ignore storage errors
              }
            }
            setShowTermsModal(false);
            onComplete?.(resp);
          } catch (err: any) {
            try {
              const parsed = require('@/lib/apiError').parseApiError(err);
              if (parsed.code === 'USER_NOT_FOUND') {
                setErrorMessage('Usuário não encontrado. Faça login novamente.');
              } else if (parsed.code === 'INVALID_USER_TYPE') {
                setErrorMessage('Este tipo de conta não permite registrar dados pessoais.');
              } else if (parsed.code === 'CPF_ALREADY_EXISTS') {
                setErrorMessage('Este CPF já está registrado no sistema.');
              } else if (parsed.code === 'PATIENT_ALREADY_EXISTS') {
                setErrorMessage('Dados pessoais já registrados. Acesse sua conta.');
              } else if (parsed.code === 'INVALID_INPUT') {
                setErrorMessage(parsed.message || 'Dados inválidos. Verifique os campos.');
              } else if (parsed.code === 'INTERNAL_ERROR') {
                setErrorMessage('Erro interno. Tente novamente mais tarde.');
              } else {
                setErrorMessage(parsed.message || 'Erro ao registrar dados pessoais');
              }
            } catch (e) {
              setErrorMessage('Erro ao registrar dados pessoais');
            }
            onComplete?.(undefined);
          } finally {
            setLoading(false);
          }
        }}
        onCancel={() => {
          setShowTermsModal(false);
        }}
      />

      {errorMessage && <div className="error-text" style={{ marginTop: 12 }}>{errorMessage}</div>}
    </section>
  );
}

