'use client';

import './DadosPessoaisMedicoCard.css';
import Input from '@/components/common/Inputs/Input';
import Button from '@/components/common/Buttons/Button';
import { useState } from 'react';
import { isValidName, isValidCPF, isValidDate, isNotEmpty, isValidCRM, formatConstrainedDateInput } from '@/lib/validation/validators';

export type DadosPessoaisMedico = {
  name: string;
  crm: string;
  cpf: string;
  gender: string;
  birthDate: string;
  crm_uf: string;
  rqe?: string;
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
  const [crmUf, setCrmUf] = useState('');
  const [rqe, setRqe] = useState('');

  const [nameError, setNameError] = useState('');
  const [crmError, setCrmError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [genderError, setGenderError] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const [crmUfError, setCrmUfError] = useState('');

  function validateAll() {
    setNameError('');
    setCrmError('');
    setCpfError('');
    setGenderError('');
    setBirthDateError('');
    setCrmUfError('');

    let ok = true;
    if (!isValidName(name)) {
      setNameError('Nome inválido. Use apenas letras e espaços.');
      ok = false;
    }
    if (!crm.trim()) {
      setCrmError('Informe o CRM.');
      ok = false;
    }
    if (!crmUf.trim()) {
      setCrmUfError('Informe a UF do CRM.');
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
      <div className="register-brand">
        <h1>Telemedicina</h1>
        <p>Dados profissionais para cadastro médico</p>
      </div>

      <h1 className="register-title">Dados Pessoais</h1>
      <p className="register-subtitle">Etapa 2 de 3</p>

      <form className="register-form grid-2" onSubmit={(e) => e.preventDefault()}>
        <label className="form-label full-width">
          <span className="label-title">Nome <span className="required-asterisk">*</span></span>
          <Input placeholder="Seu nome completo" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} className={nameError ? 'c-input--error' : ''} />
          {nameError && <div className="error-text">{nameError}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">CRM <span className="required-asterisk">*</span></span>
          <Input
            placeholder="CRM: 0000000-0/UF"
            value={crm}
            onChange={(e) => {
              const raw = (e.target.value || '').toUpperCase();
              const nums = (raw.replace(/\D/g, '') || '').slice(0, 8); // 7 + 1 dígito verificador
              const letters = (raw.replace(/[^A-Z]/g, '') || '').slice(0, 2);
              const left = nums.slice(0, 7);
              const dv = nums.slice(7, 8);
              let formatted = left;
              if (dv) formatted += `-${dv}`;
              if (letters) formatted += `/${letters}`;
              setCrm(formatted);
              setCrmError('');
            }}
          />
          {crmError && <div className="error-text">{crmError}</div>}
        </label>
        
        <label className="form-label">
           <span className="label-title">UF do CRM <span className="required-asterisk">*</span></span>
           <select className="c-input" value={crmUf} onChange={(e) => { setCrmUf(e.target.value); setCrmUfError(''); }}>
             <option value="">UF</option>
             {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
               <option key={uf} value={uf}>{uf}</option>
             ))}
           </select>
           {crmUfError && <div className="error-text">{crmUfError}</div>}
        </label>

        <label className="form-label">
           <span className="label-title">RQE (Opcional)</span>
           <Input placeholder="Nº do RQE" value={rqe} onChange={(e) => setRqe(e.target.value)} />
           <div className="input-tip">Obrigatório para anunciar especialidade</div>
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
            mask="date"
            placeholder="DD/MM/AAAA"
            value={birthDate}
            onChange={(e) => {
              setBirthDate(e.target.value);
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
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                const ok = validateAll();
                if (!isValidCRM(crm)) {
                  setCrmError('CRM inválido. Formato: 0000000-0/UF (UF brasileira válida, ex.: 1234567-8/SP).');
                  return;
                }
                if (ok) onComplete?.({ name, crm, cpf, gender, birthDate, crm_uf: crmUf, rqe });
              }}
            >
              Próximo
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
