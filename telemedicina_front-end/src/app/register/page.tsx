'use client';

import './register.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DadosAcessoPacienteCard from '@/components/common/Cards/DadosACessoPacienteCard/DadosAcessoPacienteCard';
import DadosPessoaisPacienteCard from '@/components/common/Cards/DadosPessoaisPaciente/DadosPessoaisPacienteCard';
// DadosConvenioCard removed — convênio step deprecated
// DadosDocumentosMedicoCard removed — documents moved to profile page
import TermsModal from '@/components/common/Modals/TermsModal/TermsModal';
import createPessoais from '@/lib/axios/pessoais';
import { saveUser, getUserId } from '@/lib/auth';
import DadosPessoaisMedicoCard from '@/components/common/Cards/DadosPessoaisMedico/DadosPessoaisMedicoCard';
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

  // Step 1 -> recebe do card o userId após createAcesso
  function handleNextFromStep1(data?: { email: string; password: string; userId?: number }) {
    if (!data) return;
    setCredentials(data || null);
    setStep(2);
  }

  function handleBackFromStep2() {
    setStep(1);
  }

  // store pessoais data and advance
  function handleCompleteStep2(data?: any) {
    // For patients, skip the convênio step and show terms + submit pessoais
    setPessoaisData(data || null);
    if (tipoParam === 'medico') {
      // Médicos agora não precisam mais enviar documentos no cadastro
      // Vamos submeter os dados pessoais direto e redirecionar para a plataforma
      handleSubmitMedico(data);
      return;
    }
    // paciente: open terms modal to confirm and submit
    setShowTerms(true);
  }

  const [showTerms, setShowTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Submissão de cadastro médico (sem documentos — serão enviados pelo perfil)
   */
  async function handleSubmitMedico(data: any) {
    if (!data) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const createMedico = (await import('@/lib/axios/medicos')).default;

      const pd = data || {};
      const toISODate = (d: string) => {
        if (!d) return '';
        if (d.includes('/')) {
          const parts = d.split('/');
          if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return d;
      };

      const payload: any = {
        usuario_id: credentials?.userId || null,
        nome_completo: pd?.name || pd?.nome || '',
        data_nascimento: toISODate(pd?.birthDate || pd?.data_nascimento || ''),
        cpf: (pd?.cpf || '').toString().replace(/\D/g, ''),
        sexo: (pd?.gender || pd?.sexo || '').toString().toLowerCase(),
        crm: pd?.crm || '',
        crm_uf: pd?.crm_uf || '',
        rqe: pd?.rqe || null,
        telefone_celular: (pd?.telefone_celular || '').replace(/\D/g, ''),
      };

      // Remove null/undefined keys
      Object.keys(payload).forEach((k) => {
        if (payload[k] === null || typeof payload[k] === 'undefined') {
          delete payload[k];
        }
      });

      console.log('[RegisterMedico] Enviando payload:', payload);
      const resp = await createMedico(payload);
      console.log('[RegisterMedico] Sucesso:', resp);

      try {
        const { saveUser } = await import('@/lib/auth');
        if (resp?.user) {
          const user = resp.user || {};
          const token = (resp as any).token || user.token;
          if (token && !user.token) {
            user.token = token;
          }
          if (token) {
            localStorage.setItem('telemedicina_token', token);
          } else {
            localStorage.removeItem('telemedicina_token');
          }
          localStorage.removeItem('token');
          localStorage.removeItem('auth_token');
          saveUser(user);
        }
      } catch (e) {
        // ignore save failures
      }

      // Redirecionar para a página inicial (médico pode navegar, mas precisa enviar docs)
      router.push('/inicio');
    } catch (err: any) {
      console.error('[RegisterMedico] Erro:', err);
      handleApiError(err, { setGlobalError: setSubmitError });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`register-page ${step === 2 ? 'dados-pessoais-active' : ''}`}>
      <main className={`register-main ${step === 2 ? 'dados-pessoais-wide' : ''}`}>
        {step === 1 && <DadosAcessoPacienteCard onNext={handleNextFromStep1} tipoUsuario={tipoParam} />}
        {step === 2 && (tipoParam === 'medico' ? (
          <DadosPessoaisMedicoCard
            onBack={handleBackFromStep2}
            onComplete={handleCompleteStep2}
            stepLabel="Etapa 2 de 2"
            loading={submitting}
          />
        ) : (
          <DadosPessoaisPacienteCard onBack={handleBackFromStep2} onComplete={handleCompleteStep2} />
        ))}

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
                  numero: String(pessoaisData?.addressNumber || '').replace(/\D/g, ''),
                  complemento: (pessoaisData?.complement || '').trim() || null,
                  bairro: (pessoaisData?.bairro || '').trim() || null,
                  cep: (pessoaisData?.cep || '').replace(/\D/g, '') || null,
                  cidade: (pessoaisData?.cidade || '').trim() || null,
                  estado: (pessoaisData?.estado || '').trim() || null,
                },
                nome_mae: (pessoaisData?.motherName || '').trim(),
                telefone_responsavel: (() => {
                  const v = (pessoaisData?.motherContact || '')?.replace(/\D/g, '') || '';
                  return v ? v : null;
                })(),
                aceitou_tcle: true,
              };

              const resp = await createPessoais(payload);
              if (resp?.user) {
                try {
                  const user = resp.user || {};
                  const token = resp.token || user.token;
                  if (token && !user.token) {
                    user.token = token;
                  }

                  // ✅ NOVO: Salvar token em localStorage se existir
                  if (token) {
                    localStorage.setItem('telemedicina_token', token);
                  } else {
                    localStorage.removeItem('telemedicina_token');
                  }
                  // Clear other stale tokens
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
