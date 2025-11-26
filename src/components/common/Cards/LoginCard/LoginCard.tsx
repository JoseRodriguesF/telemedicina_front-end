'use client';

import Image from 'next/image';
import Input from '@/components/common/Inputs/Input';
import Button from '@/components/common/Buttons/Button';
import { useState } from 'react';
import doLogin from '@/lib/axios/login';
import doSocialLogin from '@/lib/axios/social';
import { doGoogleAuth } from '@/lib/axios/google';
import signInWithGoogle from '@/lib/google';
import { saveUser } from '@/lib/auth';
import { parseApiError } from '@/lib/apiError';

type Props = {
  onLogin?: (data?: any) => void;
};

export default function LoginCard({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Informe email e senha para continuar.');
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const resp = await doLogin({ email, senha: password });
        // resp expected: { message, user }
        const user = resp?.user || null;
        // save user to localStorage
        saveUser(user);
        onLogin?.({ email, password, user, raw: resp });
      } catch (err: any) {
        const parsed = parseApiError(err);
        // reset field errors
        setEmailError('');
        setPasswordError('');
        if (parsed.code === 'USER_NOT_FOUND') {
          setError('Email não cadastrado. Deseja criar uma conta?');
        } else if (parsed.code === 'WRONG_PASSWORD') {
          setPasswordError(parsed.message || 'Senha incorreta.');
        } else if (parsed.code === 'INVALID_INPUT' && Array.isArray(parsed.details)) {
          parsed.details.forEach((d: any) => {
            const p = Array.isArray(d.path) ? String(d.path[0]) : undefined;
            const msg = d.message || parsed.message;
            if (p === 'email') setEmailError(msg);
            if (p === 'senha' || p === 'password') setPasswordError(msg);
          });
        } else if (parsed.code === 'INTERNAL_ERROR') {
          setError('Erro interno. Tente novamente mais tarde.');
        } else {
          setError(parsed.message || 'Erro ao efetuar login');
        }
      } finally {
        setLoading(false);
      }
    })();
  }

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const resp = await doGoogleAuth({ id_token: idToken });
      const user = resp?.user || null;
      saveUser(user);
      onLogin?.({ email: user?.email, password: '', user, raw: resp });
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed.message || (err && err.message) || 'Erro ao efetuar login com Google');
    } finally {
      setLoading(false);
    }
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
          className={emailError ? 'c-input--error' : ''}
        />
        {emailError && <div className="error-text">{emailError}</div>}

        <Input
          name="password"
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={passwordError ? 'c-input--error' : ''}
        />
        {passwordError && <div className="error-text">{passwordError}</div>}

        {error && <div className="error-text">{error}</div>}

        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</Button>
      </form>

      <div className="forgot-row">
        <a className="link-small" href="#">Esqueceu sua senha?</a>
      </div>

      <div className="divider"><span>Ou continue com</span></div>

      <Button className="google-btn" variant="google" type="button" onClick={handleGoogleSignIn} disabled={loading}>
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
