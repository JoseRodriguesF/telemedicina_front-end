'use client';

import './register.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DadosAcessoPacienteCard from '@/components/common/Cards/DadosACessoPacienteCard/DadosAcessoPacienteCard';
import DadosPessoaisPacienteCard from '@/components/common/Cards/DadosPessoaisPaciente/DadosPessoaisPacienteCard';
// DadosConvenioCard removed — convênio step deprecated
import TermsModal from '@/components/common/Modals/TermsModal/TermsModal';
import createPessoais from '@/lib/axios/pessoais';
import { saveUser, getUserId } from '@/lib/auth';
import DadosPessoaisMedicoCard from '@/components/common/Cards/DadosPessoaisMedico/DadosPessoaisMedicoCard';
import DadosDocumentosMedicoCard from '@/components/common/Cards/DadosDocumentosMedico/DadosDocumentosMedicoCard';
import { handleApiError } from '@/lib/errorHandler';
export default function RegisterPage() {
  const [step, setStep] = useState<number>(1);
  const [credentials, setCredentials] = useState<{ email?: string; password?: string; userId?: number } | null>(null);
  const [pessoaisData, setPessoaisData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [tipoParam, setTipoParam] = useState<string>('paciente');

  useEffect(() => {
    try {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      setTipoParam(params?.get('tipo') || 'paciente');
      const resume = params?.get('resume');
      if (resume === '1') {
        // Quando retomando cadastro, tentar preencher userId a partir do localStorage
        try {
          const auth = require('@/lib/auth');
          const u = auth?.getUser?.();
          if (u?.id) {
            setCredentials({ email: u.email, password: '', userId: u.id });
          }
        } catch (e) {
          // ignore
        }
        setStep(2);
      } else {
        setStep(1);
      }
    } catch (e) {
      setTipoParam('paciente');
      setStep(1);
    }
  }, []);

  useEffect(() => {
    // Sem auto avanço por localStorage. O progresso é controlado via query 'resume=1'.
  }, []);

  // Step 1 -> recebe do card o userId após createAcesso
  function handleNextFromStep1(data?: { email: string; password: string; userId?: number }) {
    if (!data) return;
    setCredentials(data || null);
    setStep(2);
  }

  function handleBackFromStep2() {
    setStep(1);
  }

  // store pessoais data and advance to convenio step
  function handleCompleteStep2(data?: any) {
    // For patients, skip the convênio step and show terms + submit pessoais
    setPessoaisData(data || null);
    if (tipoParam === 'medico') {
      setStep(3);
      return;
    }
    // paciente: open terms modal to confirm and submit
    setShowTerms(true);
  }

  const [showTerms, setShowTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleBackFromStep3() {
    setStep(2);
  }

  // Step 3 completion: the DadosConvenioCard will call createPessoais
  function handleCompleteStep3(data?: any) {
    // data may contain result info; simply redirect to inicio or show success
    router.push('/inicio');
  }

  return (
    <div className={`register-page ${step === 2 || step === 3 ? 'dados-pessoais-active' : ''}`}>
      <main className={`register-main ${step === 2 || step === 3 ? 'dados-pessoais-wide' : ''}`}>
        {step === 1 && <DadosAcessoPacienteCard onNext={handleNextFromStep1} tipoUsuario={tipoParam} />}
        {step === 2 && (tipoParam === 'medico' ? (
          <DadosPessoaisMedicoCard onBack={handleBackFromStep2} onComplete={(data) => { setPessoaisData(data); setStep(3); }} />
        ) : (
          <DadosPessoaisPacienteCard onBack={handleBackFromStep2} onComplete={handleCompleteStep2} />
        ))}
        {step === 3 && tipoParam === 'medico' && (
          <DadosDocumentosMedicoCard
            onBack={handleBackFromStep3}
            userId={credentials?.userId}
            pessoaisData={pessoaisData}
            onComplete={(data) => {
              try {
                if (data && (data.medicoId || data.message)) {
                  router.push('/analise');
                  return;
                }
              } catch (e) {
                // fallback
              }
              router.push('/analise');
            }}
          />
        )}

        <TermsModal
          open={showTerms}
          onCancel={() => setShowTerms(false)}
          loading={submitting}
          onConfirm={async () => {
            setSubmitError(null);
            setSubmitting(true);
            try {
              const estadoCivilForApi = (() => {
                const v = String(pessoaisData?.marital || pessoaisData?.estado_civil || '').toLowerCase();
                if (v.startsWith('solte')) return 'solteiro';
                if (v.startsWith('casad')) return 'casado';
                if (v.startsWith('divorc')) return 'divorciado';
                if (v.startsWith('viuv') || v.startsWith('viúv')) return 'viuvo';
                return (pessoaisData?.estado_civil || '').toLowerCase();
              })();

              const payload: any = {
                usuario_id: credentials?.userId ?? getUserId(),
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
              };

              const resp = await createPessoais(payload);
              if (resp?.user) {
                try {
                  const user = resp.user || {};
                  const token = resp.token || user.token;
                  if (token && !user.token) {
                    user.token = token;
                  }

                  // Clear stale tokens
                  localStorage.removeItem('telemedicina_token');
                  localStorage.removeItem('token');
                  localStorage.removeItem('auth_token');

                  saveUser(user);
                } catch (_) { }
              }
              setShowTerms(false);
              router.push('/inicio');
            } catch (err: any) {
              handleApiError(err, { setGlobalError: setSubmitError });
            } finally {
              setSubmitting(false);
            }
          }}
        />
        {submitError && <div style={{ marginTop: 12, color: 'var(--error-color, #f87171)' }}>{submitError}</div>}
        {loading && <div style={{ marginTop: 12 }}>Enviando...</div>}
        {error && <div style={{ marginTop: 12, color: 'var(--error-color, #f87171)' }}>{error}</div>}
      </main>
    </div>
  );
}
