import './login.css';
import LoginCard from '@/components/common/Cards/LoginCard/LoginCard';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();

  function handleLogin(data?: { email: string; password: string }) {
    // aqui você faria chamada à API e trataria resposta/erros
    console.log('Login solicitado:', data);
    // por enquanto, apenas redireciona como exemplo
    router.push('/inicio');
  }

  return (
    <div className="login-page">
      <main className="login-main">
        <LoginCard onLogin={handleLogin} />
      </main>
    </div>
  );
}
