'use client';

// global styles for register are imported in app layout
import Image from 'next/image';
import { useState } from 'react';
import Input from '@/components/common/Inputs/Input';
import Button from '@/components/common/Buttons/Button';
import { isEmailAllowedDomain, doPasswordsMatch, isStrongPassword } from '@/lib/validation/validators';
import createAcesso from '@/lib/axios/acesso';
import { parseApiError } from '@/lib/apiError';

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
        const parsed = parseApiError(err);
        if (parsed.code === 'EMAIL_ALREADY_EXISTS') {
          setEmailError(parsed.message + ' Já possui conta? Faça login.');
        } else if (parsed.code === 'INVALID_INPUT' && Array.isArray(parsed.details)) {
          // map details to field errors
          parsed.details.forEach((d: any) => {
            const p = Array.isArray(d.path) ? String(d.path[0]) : undefined;
            const msg = d.message || parsed.message || 'Dados inválidos';
            if (p === 'email') setEmailError(String(msg));
            else if (p === 'senha' || p === 'password') setPasswordError(String(msg));
            else setEmailError(String(msg));
          });
        } else if (parsed.code === 'INTERNAL_ERROR') {
          setEmailError('Erro interno. Tente novamente mais tarde.');
        } else {
          setEmailError(parsed.message || 'Erro ao criar dados de acesso');
        }
      } finally {
        setLoading(false);
      }
    })();
  }

  return (
    <section className="register-card dados-acesso-card">
      <h1 className="register-title">Crie sua conta</h1>
      <p className="register-subtitle">Bem-vindo! Vamos começar!</p>

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

      <Button className="google-btn" variant="google" type="button">
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
