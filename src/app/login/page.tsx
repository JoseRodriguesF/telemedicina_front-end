'use client';

import './login.css';
import LoginCard from '@/components/common/Cards/LoginCard/LoginCard';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();

  function handleLogin(data?: { email: string; password: string }) {

    const user = (data as any)?.user || null;
    // if the user exists and didn't finish registration, redirect to register
    if (user && user.registro_full === false) {
      // determine user type (backend may use 'tipo_usuario', 'tipo' or similar)
      const rawTipo = (user.tipo_usuario || user.tipo || user.tipoUsuario || 'paciente');
      const tipo = String(rawTipo || 'paciente').toLowerCase() === 'medico' ? 'medico' : 'paciente';
      router.push(`/register?tipo=${encodeURIComponent(tipo)}&resume=1`);
      return;
    }
    // if medico and verification is in analysis, go to analysis page
    if (user) {
      const tipo = String(user.tipo_usuario || user.tipo || '').toLowerCase();
      const verificacao = String(user.verificacao || '').toLowerCase();
      if (tipo === 'medico' && verificacao === 'analise') {
        router.push('/analise');
        return;
      }
    }
    // determine where to go based on user type
    const tipo = String(user.tipo_usuario || user.tipo || '').toLowerCase();
    
    if (tipo === 'admin') {
      router.push('/admin/dashboard');
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
