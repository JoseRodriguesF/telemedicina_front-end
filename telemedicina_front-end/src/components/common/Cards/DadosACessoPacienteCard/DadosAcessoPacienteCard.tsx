'use client';

// global styles for register are imported in app layout
import Image from 'next/image';
import { useState } from 'react';
import Input from '@/components/common/Inputs/Input';
import Button from '@/components/common/Buttons/Button';
import { isEmailAllowedDomain, doPasswordsMatch, isStrongPassword } from '@/lib/validation/validators';
import createAcesso from '@/lib/axios/acesso';
import doSocialLogin from '@/lib/axios/social';
import { doGoogleRegister } from '@/lib/axios/google';
import signInWithGoogle from '@/lib/google';
import { handleApiError } from '@/lib/errorHandler';

import { useRouter } from 'next/navigation';

type Props = {
  onNext?: (data?: { email: string; password: string; userId?: number }) => void;
  tipoUsuario?: string; // 'paciente' | 'medico'
};

export default function DadosAcessoPacienteCard({ onNext, tipoUsuario }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);

  function isFormValid() {
    return (
      email.trim().length > 0 &&
      password.length > 0 &&
      confirm.length > 0 &&
      doPasswordsMatch(password, confirm) &&
      isEmailAllowedDomain(email)
    );
  }

  function handleSubmit() {
    setEmailError('');
    setPasswordError('');
    setConfirmError('');

    let valid = true;
    if (!isEmailAllowedDomain(email)) {
      setEmailError('Informe um email válido de um provedor suportado (ex: gmail.com).');
      valid = false;
    }
    if (!isStrongPassword(password)) {
      setPasswordError('Senha fraca. Use ao menos 6 caracteres, incluindo uma letra maiúscula, uma minúscula, um número e um caractere especial.');
      valid = false;
    }
    if (!doPasswordsMatch(password, confirm)) {
      setConfirmError('As senhas não conferem.');
      valid = false;
    }
    if (!valid) return;

    // Envia para API e cria registro de acesso
    (async () => {
      setLoading(true);
      try {
        const tipoToSend = (tipoUsuario && String(tipoUsuario)) || 'paciente';
        const resp = await createAcesso({ email, senha: password, tipo_usuario: tipoToSend });
        const userId = resp?.userId;
        if (tipoToSend === 'medico') {
          // for medico registrations, continue the registration flow (do not redirect here)
          onNext?.({ email, password, userId });
          return;
        }
        onNext?.({ email, password, userId });
      } catch (err: any) {
        handleApiError(err, {
          setGlobalError: setEmailError, // Fallback to email error field for global errors or specific ones
          setFieldError: (field, msg) => {
            if (field === 'email') setEmailError(msg);
            else if (field === 'senha' || field === 'password') setPasswordError(msg);
            else setEmailError(msg);
          }
        });
      } finally {
        setLoading(false);
      }
    })();
  }

  async function handleGoogleSignup() {
    setEmailError('');
    setPasswordError('');
    setConfirmError('');
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const resp = await doGoogleRegister({ id_token: idToken, tipo_usuario: tipoUsuario || 'paciente' });
      const user = resp?.user || null;
      const userId = user?.id || resp?.userId || null;
      onNext?.({ email: user?.email || '', password: '', userId });
    } catch (err: any) {
      handleApiError(err, { setGlobalError: setEmailError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="register-card dados-acesso-card">
      <div className="register-brand">
        <img src="/images/logo_matriarca_icon.svg" alt="Matriarca" width={36} height={36} style={{ borderRadius: '8px', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
      </div>

      <h1 className="register-title">Cadastro</h1>
      <p className="register-subtitle">Crie seu acesso básico abaixo</p>

      <form
        className="register-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
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
          placeholder="Crie uma senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={passwordError ? 'c-input--error' : ''}
        />
        {passwordError && <div className="error-text">{passwordError}</div>}

        <Input
          name="confirm"
          type="password"
          placeholder="Confirme sua senha"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={confirmError ? 'c-input--error' : ''}
        />
        {confirmError && <div className="error-text">{confirmError}</div>}

        <Button type="submit" variant="primary" disabled={!isFormValid() || loading}>
          {loading ? 'Enviando...' : 'Criar conta'}
        </Button>
      </form>

      <div className="forgot-row">
        <a className="link-small" href="#">Esqueceu sua senha?</a>
      </div>

      <div className="divider"><span>Ou continue com</span></div>

      <Button className="google-btn" variant="google" type="button" onClick={handleGoogleSignup} disabled={loading}>
        <Image src="/images/googleIcon.svg" alt="Google" width={20} height={20} />
        <span>Cadastrar com Google</span>
      </Button>

      <div className="register-footer">
        <span>Já tem uma conta? </span>
        <a className="link-small" href="/login">Faça Login</a>
      </div>
    </section>
  );
}
