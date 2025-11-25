 'use client';

import './register.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DadosAcessoPacienteCard from '@/components/common/Cards/DadosACessoPacienteCard/DadosAcessoPacienteCard';
import DadosPessoaisPacienteCard from '@/components/common/Cards/DadosPessoaisPaciente/DadosPessoaisPacienteCard';
import DadosConvenioCard from '@/components/common/Cards/DadosConvenio/DadosConvenioCard';
import DadosPessoaisMedicoCard from '@/components/common/Cards/DadosPessoaisMedico/DadosPessoaisMedicoCard';
import DadosDocumentosMedicoCard from '@/components/common/Cards/DadosDocumentosMedico/DadosDocumentosMedicoCard';
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
    } catch (e) {
      setTipoParam('paciente');
    }
  }, []);

  useEffect(() => {
    // if the user already logged in but didn't finish the registration, initialize state
    try {
      const u = require('@/lib/auth').getUser?.();
      if (u && typeof u.registro_full !== 'undefined') {
        if (u.registro_full === false) {
          setCredentials({ email: u.email, password: '', userId: u.id });
          setStep(2);
        }
      }
    } catch (e) {
      // ignore
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

  // store pessoais data and advance to convenio step
  function handleCompleteStep2(data?: any) {
    setPessoaisData(data || null);
    setStep(3);
  }

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
        {step === 3 && (tipoParam === 'medico' ? (
          <DadosDocumentosMedicoCard
            onBack={handleBackFromStep3}
            userId={credentials?.userId}
            pessoaisData={pessoaisData}
            onComplete={(data) => {
              // finalization result from createMedico
              // if success, redirect to inicio
              try {
                if (data && (data.medicoId || data.message)) {
                  router.push('/inicio');
                  return;
                }
              } catch (e) {
                // fallback
              }
              router.push('/inicio');
            }}
          />
        ) : (
          <DadosConvenioCard
            onBack={handleBackFromStep3}
            onComplete={handleCompleteStep3}
            userId={credentials?.userId}
            pessoaisData={pessoaisData}
          />
        ))}
        {loading && <div style={{ marginTop: 12 }}>Enviando...</div>}
        {error && <div style={{ marginTop: 12, color: 'var(--error-color, #f87171)' }}>{error}</div>}
      </main>
    </div>
  );
}
