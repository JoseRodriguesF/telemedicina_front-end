'use client';

import Image from 'next/image';
import Input from '@/components/common/Inputs/Input';
import Button from '@/components/common/Buttons/Button';
import { useState } from 'react';

type Props = {
  onLogin?: (data?: { email: string; password: string }) => void;
};

export default function LoginCard({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Informe email e senha para continuar.');
      return;
    }
    onLogin?.({ email, password });
  }

  return (
    <section className="register-card dados-acesso-card">
      <h1 className="register-title">Bem-vindo(a) de volta!</h1>
      <p className="register-subtitle">Acesse sua conta para continuar</p>

      <form
        className="register-form"
        onSubmit={(e) => {
          handleSubmit(e);
        }}
      >
        <Input
          name="email"
          type="email"
          placeholder="seu.email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          name="password"
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="error-text">{error}</div>}

        <Button type="submit" variant="primary">Entrar</Button>
      </form>

      <div className="forgot-row">
        <a className="link-small" href="#">Esqueceu sua senha?</a>
      </div>

      <div className="divider"><span>Ou continue com</span></div>

      <Button className="google-btn" variant="google" type="button">
        <Image src="/images/googleIcon.svg" alt="Google" width={20} height={20} />
        <span>Entrar com Google</span>
      </Button>

      <div className="register-footer">
        <span>Não tem uma conta? </span>
        <a className="link-small" href="/register">Cadastre-se</a>
      </div>
    </section>
  );
}
