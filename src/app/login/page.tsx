'use client';

import './login.css';
import LoginCard from '@/components/common/Cards/LoginCard/LoginCard';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  function handleLogin(data?: { email: string; password: string }) {
    console.log('Login solicitado:', data);
    // if login returned user, you can store in state or redirect
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
