'use client';

import './login.css';
import LoginCard from '@/components/common/Cards/LoginCard/LoginCard';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();

  function handleLogin(data?: { email: string; password: string }) {
    console.log('Login solicitado:', data);
    const user = (data as any)?.user || null;
    // if the user exists and didn't finish registration, redirect to register
    if (user && user.registro_full === false) {
      router.push('/register');
      return;
    }
    // otherwise go to inicio
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
