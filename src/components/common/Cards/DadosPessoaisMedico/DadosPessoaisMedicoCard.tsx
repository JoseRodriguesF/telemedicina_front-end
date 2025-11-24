 'use client';

import './DadosPessoaisMedicoCard.css';
import Input from '@/components/common/Inputs/Input';
import Button from '@/components/common/Buttons/Button';
import { useState } from 'react';
import { isValidName, isValidCPF, isValidDate, isNotEmpty } from '@/lib/validation/validators';

export type DadosPessoaisMedico = {
  name: string;
  crm: string;
  cpf: string;
  gender: string;
  birthDate: string;
};

type Props = {
  onBack?: () => void;
  onComplete?: (data?: DadosPessoaisMedico) => void;
};

export default function DadosPessoaisMedicoCard({ onBack, onComplete }: Props) {
  const [name, setName] = useState('');
  const [crm, setCrm] = useState('');
  const [cpf, setCpf] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [nameError, setNameError] = useState('');
  const [crmError, setCrmError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [genderError, setGenderError] = useState('');
  const [birthDateError, setBirthDateError] = useState('');

  function validateAll() {
    setNameError('');
    setCrmError('');
    setCpfError('');
    setGenderError('');
    setBirthDateError('');

    let ok = true;
    if (!isValidName(name)) {
      setNameError('Nome inválido. Use apenas letras e espaços.');
      ok = false;
    }
    if (!crm.trim()) {
      setCrmError('Informe o CRM.');
      ok = false;
    }
    if (!isValidCPF(cpf)) {
      setCpfError('CPF inválido.');
      ok = false;
    }
    if (!isNotEmpty(gender)) {
      setGenderError('Selecione o sexo.');
      ok = false;
    }
    if (!isValidDate(birthDate)) {
      setBirthDateError('Data de nascimento inválida.');
      ok = false;
    }
    return ok;
  }

  return (
    <section className="register-card dados-pessoais-medico-card">
      <h1 className="register-title">Crie sua conta</h1>
      <p className="register-subtitle">Etapa 2 de 3 - Dados Pessoais</p>

      <form className="register-form grid-2" onSubmit={(e) => e.preventDefault()}>
        <label className="form-label full-width">
          <span className="label-title">Nome <span className="required-asterisk">*</span></span>
          <Input placeholder="Seu nome completo" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} className={nameError ? 'c-input--error' : ''} />
          {nameError && <div className="error-text">{nameError}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">CRM <span className="required-asterisk">*</span></span>
          <Input
            placeholder="CRM: 000000/SP"
            value={crm}
            onChange={(e) => {
              const raw = (e.target.value || '').toUpperCase();
              // extract up to 6 digits for number part
              const digits = (raw.replace(/\D/g, '') || '').slice(0, 6);
              // extract up to 2 letters for state part
              const letters = (raw.replace(/[^A-Z]/g, '') || '').slice(0, 2);
              const formatted = letters ? `${digits}/${letters}` : digits;
              setCrm(formatted);
              setCrmError('');
            }}
          />
          {crmError && <div className="error-text">{crmError}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">CPF <span className="required-asterisk">*</span></span>
          <Input mask="cpf" placeholder="000.000.000-00" value={cpf} onChange={(e) => { setCpf(e.target.value); setCpfError(''); }} />
          {cpfError && <div className="error-text">{cpfError}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">Sexo <span className="required-asterisk">*</span></span>
          <select className="c-input" value={gender} onChange={(e) => { setGender(e.target.value); setGenderError(''); }}>
            <option value="">Selecione</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
            <option value="outro">Outro</option>
          </select>
          {genderError && <div className="error-text">{genderError}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">Data de nascimento <span className="required-asterisk">*</span></span>
          <Input
            type="text"
            placeholder="DD/MM/AAAA"
            value={birthDate}
            onChange={(e) => {
              // format as DD/MM/YYYY while typing
              let v = (e.target.value || '').replace(/\D/g, '').slice(0, 8);
              if (v.length >= 5) v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3');
              else if (v.length >= 3) v = v.replace(/(\d{2})(\d{1,2})/, '$1/$2');
              setBirthDate(v);
              setBirthDateError('');
            }}
          />
          {birthDateError && <div className="error-text">{birthDateError}</div>}
        </label>

        <div className="form-actions actions-full two-equal">
          <div className="left-actions">
            <Button type="button" variant="ghost" onClick={onBack}>Voltar</Button>
          </div>
          <div className="right-actions">
            <Button type="button" variant="primary" onClick={() => { if (validateAll()) onComplete?.({ name, crm, cpf, gender, birthDate }); }}>Próximo</Button>
          </div>
        </div>
      </form>
    </section>
  );
}
