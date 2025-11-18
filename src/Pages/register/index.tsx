import './register.css';
import { useState } from 'react';
import { useRouter } from 'next/router';
import DadosAcessoPacienteCard from '@/components/common/Cards/DadosACessoPacienteCard/DadosAcessoPacienteCard';
import DadosPessoaisPacienteCard from '@/components/common/Cards/DadosPessoaisPaciente/DadosPessoaisPacienteCard';
import DadosConvenioCard from '@/components/common/Cards/DadosConvenio/DadosConvenioCard';

export default function RegisterPage() {
  const [step, setStep] = useState<number>(1);
  const [credentials, setCredentials] = useState<{ email?: string; password?: string } | null>(null);
  const router = useRouter();

  function handleNextFromStep1(data?: { email: string; password: string }) {
    // aqui você normalmente chamaria a API para salvar email/senha e receber um id
    setCredentials(data || null);
    setStep(2);
  }

  function handleBackFromStep2() {
    setStep(1);
  }

  function handleCompleteStep2(data?: any) {
    // passar para a etapa 3
    console.log('Step2 salvo, avançando para step3:', { credentials, ...data });
    setStep(3);
  }

  function handleBackFromStep3() {
    setStep(2);
  }

  function handleCompleteStep3(data?: any) {
    // aqui concatena todos os dados e finaliza o cadastro
    console.log('Finalizar cadastro (step3) com:', { credentials, ...data });
    // redireciona para a página de início ao concluir o fluxo
    router.push('/inicio');
  }

  return (
    <div className={`register-page ${step === 2 || step === 3 ? 'dados-pessoais-active' : ''}`}>
      <main className={`register-main ${step === 2 || step === 3 ? 'dados-pessoais-wide' : ''}`}>
        {step === 1 && <DadosAcessoPacienteCard onNext={handleNextFromStep1} />}
        {step === 2 && <DadosPessoaisPacienteCard onBack={handleBackFromStep2} onComplete={handleCompleteStep2} />}
        {step === 3 && <DadosConvenioCard onBack={handleBackFromStep3} onComplete={handleCompleteStep3} />}
      </main>
    </div>
  );
}
