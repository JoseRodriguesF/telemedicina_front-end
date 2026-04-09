'use client';

import Image from 'next/image';
import Input from '@/components/common/Inputs/Input';
import Button from '@/components/common/Buttons/Button';
import { useState } from 'react';
import { isEmailFormatValid } from '@/lib/validation/validators';
import doLogin from '@/lib/axios/login';
import doSocialLogin from '@/lib/axios/social';
import { doGoogleAuth } from '@/lib/axios/google';
import signInWithGoogle from '@/lib/google';
import { saveUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

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
    setEmailError('');
    // Validar formato
    if (!isEmailFormatValid(email)) {
      setEmailError('Formato de email inválido.');
      return;
    }
    if (!email || !password) {
      setError('Informe email e senha para continuar.');
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const resp = await doLogin({ email, senha: password });
        // resp expected: { message, user, token? }

        // Ensure token is captured and associated with user
        const token = resp.token || resp.user?.token || resp.accessToken || resp.access_token || resp.jwt || resp.id_token;
        const user = resp.user || {};

        if (token) {
          user.token = token;
          // ✅ NOVO: Salvar token em localStorage para que getToken() encontre
          localStorage.setItem('telemedicina_token', token);
        }

        // Clear other standalone tokens to avoid conflicts
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');

        // save user to localStorage
        saveUser(user);
        onLogin?.({ email, password, user, raw: resp });
      } catch (err: any) {
        // reset field errors
        setEmailError('');
        setPasswordError('');
        setError('');

        handleApiError(err, {
          setGlobalError: setError,
          setFieldError: (field, msg) => {
            if (field === 'email') setEmailError(msg);
            if (field === 'senha' || field === 'password') setPasswordError(msg);
          }
        });
      } finally {
        setLoading(false);
      }
    })();
  }

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      // Não validar domínio aqui (Google garante email); apenas fluxo social.
      const idToken = await signInWithGoogle();
      const resp = await doGoogleAuth({ id_token: idToken });

      // ✅ NOVO: Validações defensivas
      if (!resp) {
        throw new Error('Resposta vazia do servidor. Tente novamente.');
      }

      const token = resp.token || resp.user?.token || resp.accessToken || resp.access_token || resp.jwt || resp.id_token;
      const user = resp?.user || null;

      // Debug logging (remover em produção se necessário)
      console.log('[GoogleLogin] Response keys:', Object.keys(resp));
      console.log('[GoogleLogin] Has token:', !!token);
      console.log('[GoogleLogin] Has user:', !!user);
      console.log('[GoogleLogin] User keys:', user ? Object.keys(user) : 'no user');

      // ✅ NOVO: Validar token
      if (!token) {
        console.error('[GoogleLogin] No token found in response:', resp);
        throw new Error('Falha na autenticação Google. Token não recebido. Tente novamente ou use email/senha.');
      }

      // ✅ NOVO: Validar user
      if (!user) {
        console.error('[GoogleLogin] No user data in response:', resp);
        throw new Error('Falha ao carregar dados do usuário. Tente novamente com outra conta Google.');
      }

      // ✅ NOVO: Validar email (mínimo necessário)
      if (!user.email) {
        console.error('[GoogleLogin] User missing email:', user);
        throw new Error('Sua conta Google não forneceu um email. Tente usar outra conta Google.');
      }

      user.token = token;
      // ✅ Salvar token em localStorage para que getToken() encontre
      localStorage.setItem('telemedicina_token', token);

      saveUser(user);
      onLogin?.({ email: user?.email, password: '', user, raw: resp });
    } catch (err: any) {
      console.error('[GoogleLogin] Error:', err);
      handleApiError(err, { setGlobalError: setError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="register-card dados-acesso-card">
      <div className="login-brand">
        <h1>Telemedicina</h1>
      </div>

      <h2 className="register-title">Bem-vindo(a) de volta!</h2>
      <p className="register-subtitle">Acesse sua conta para continuar</p>

      <form
        className="register-form"
        onSubmit={(e) => {
          handleSubmit(e);
        }}
        autoComplete="new-password"
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
        <a className="link-small" href="/register?tipo=paciente">Cadastre-se</a>
      </div>
    </section>
  );
}
