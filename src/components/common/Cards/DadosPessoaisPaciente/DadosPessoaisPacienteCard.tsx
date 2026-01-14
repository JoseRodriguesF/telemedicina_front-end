'use client';

// global styles for register are imported in app layout
import './DadosPessoaisPacienteCard.css';
import Input from '@/components/common/Inputs/Input';
import AddressAutocomplete from '@/components/common/Inputs/AddressAutocomplete';
import Button from '@/components/common/Buttons/Button';
import { useState, useEffect } from 'react';
import {
  isValidName,
  isValidCPF,
  isValidPhone,
  isValidDate,
  isNotEmpty,
  getStatesForDDD,
  isValidDDD,
  formatConstrainedDateInput,
} from '@/lib/validation/validators';

export type DadosPessoais = {
  name: string;
  birthDate: string;
  cpf: string;
  gender: string;
  marital: string;
  address: string;
  addressNumber?: number;
  complement?: string;
  number: string;
  guardian: string;
  guardianContact: string;
};

type Props = {
  onBack?: () => void;
  onComplete?: (data?: DadosPessoais) => void;
};

export default function DadosPessoaisPacienteCard({ onBack, onComplete }: Props) {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [gender, setGender] = useState('');
  const [marital, setMarital] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [number, setNumber] = useState('');
  const [guardian, setGuardian] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [guardianError, setGuardianError] = useState('');
  const [guardianContactError, setGuardianContactError] = useState('');
  const [nameError, setNameError] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [genderError, setGenderError] = useState('');
  const [maritalError, setMaritalError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [addressNumberError, setAddressNumberError] = useState('');
  const [complementError, setComplementError] = useState('');
  const [numberError, setNumberError] = useState('');


  // Determine if the entered birth date corresponds to age < 18
  function parseBirthDate(value: string): Date | null {
    if (!value) return null;
    // Accept both DD/MM/YYYY and YYYY-MM-DD formats
    try {
      if (value.includes('-')) {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
      }
      if (value.includes('/')) {
        const parts = value.split('/');
        if (parts.length === 3) {
          const day = Number(parts[0]);
          const month = Number(parts[1]) - 1;
          const year = Number(parts[2]);
          const d = new Date(year, month, day);
          return isNaN(d.getTime()) ? null : d;
        }
      }
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  }

  function isMinor(birthValue: string) {
    const d = parseBirthDate(birthValue);
    if (!d) return false;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
    return age < 18;
  }

  const minor = isMinor(birthDate);

  // No effect-based state resets; handle via birthDate onChange to avoid setState in effect

  function validateAll() {
    // reset all errors
    setNameError('');
    setBirthDateError('');
    setCpfError('');
    setGenderError('');
    setMaritalError('');
    setAddressError('');
    setAddressNumberError('');
    setComplementError('');
    setNumberError('');
    setGuardianError('');
    setGuardianContactError('');

    let valid = true;

    if (!isValidName(name)) {
      setNameError('Nome inválido. Use apenas letras e espaços (sem números, emojis ou caracteres especiais).');
      valid = false;
    }

    if (!isValidDate(birthDate)) {
      setBirthDateError('Informe uma data de nascimento válida (não futura e idade plausível).');
      valid = false;
    }

    if (!isValidCPF(cpf)) {
      setCpfError('CPF inválido. Verifique os dígitos.');
      valid = false;
    }

    if (!isNotEmpty(gender)) {
      setGenderError('Selecione o sexo.');
      valid = false;
    }

    if (!isNotEmpty(marital)) {
      setMaritalError('Selecione o estado civil.');
      valid = false;
    }

    if (!isNotEmpty(address)) {
      setAddressError('Informe o endereço.');
      valid = false;
    }

    // address number required and numeric
    const addrNumDigits = (addressNumber || '').replace(/\D/g, '');
    if (!addrNumDigits) {
      setAddressNumberError('Informe o número do endereço.');
      valid = false;
    } else {
      const numVal = Number(addrNumDigits);
      if (!Number.isFinite(numVal) || numVal < 0) {
        setAddressNumberError('Número inválido. Use apenas dígitos (inteiro não negativo).');
        valid = false;
      }
    }

    // phone validation: normalize and give specific messages for common cases
    let onlyNums = number.replace(/\D/g, '');
    // strip country code if user pasted with +55 or 55 prefix
    if (onlyNums.length > 11 && onlyNums.startsWith('55')) onlyNums = onlyNums.slice(2);
    if (!/^(?:\d{10,11})$/.test(onlyNums)) {
      setNumberError('Telefone inválido. Use DDD + número (10 ou 11 dígitos).');
      valid = false;
    } else {
      const ddd = onlyNums.slice(0, 2);
      const states = getStatesForDDD(ddd);
      if (states.length === 0) {
        setNumberError('DDD inválido. Confira o código de área.');
        valid = false;
      } else if (!isValidPhone(number)) {
        setNumberError('Telefone inválido. Confira o número.');
        valid = false;
      }
    }

    // guardian validations if minor
    if (minor) {
      if (!guardian.trim()) {
        setGuardianError('Preencha o nome do responsável.');
        valid = false;
      }
      if (!guardianContact.trim()) {
        setGuardianContactError('Preencha um contato do responsável.');
        valid = false;
      } else {
        let gNums = guardianContact.replace(/\D/g, '');
        if (gNums.length > 11 && gNums.startsWith('55')) gNums = gNums.slice(2);
        if (!/^(?:\d{10,11})$/.test(gNums)) {
          setGuardianContactError('Contato inválido. Use DDD + número (10 ou 11 dígitos).');
          valid = false;
        } else {
          const states = getStatesForDDD(gNums.slice(0, 2));
          if (states.length === 0) {
            setGuardianContactError('DDD do responsável inválido.');
            valid = false;
          }
        }
      }
    }

    return valid;
  }

  function buildData(): DadosPessoais {
    const numVal = addressNumber ? Number(addressNumber) : undefined;
    return { name, birthDate, cpf, gender, marital, address, addressNumber: numVal, complement: complement || undefined, number, guardian, guardianContact };
  }



  return (
    <section className="register-card dados-pessoais-card">
      <div className="register-brand">
        <h1>Telemedicina</h1>
        <p>Complete seu perfil para um melhor atendimento</p>
      </div>

      <h1 className="register-title">Dados Pessoais</h1>
      <p className="register-subtitle">Etapa 2 de 3</p>

      <form className="register-form grid-2" onSubmit={(e) => e.preventDefault()}>
        <label className="form-label full-width">
          <span className="label-title">Nome <span className="required-asterisk">*</span></span>
          <Input
            placeholder="Seu nome completo"
            value={name}
            onChange={(e) => {
              const raw = e.target.value || '';
              // sanitize: allow unicode letters and spaces; fallback to latin-accent range
              let cleaned = raw;
              try {
                cleaned = raw.replace(/[^\p{L} ]+/gu, '');
              } catch (ex) {
                cleaned = raw.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ ]+/g, '');
              }
              if (cleaned !== raw) {
                setNameError('Caracteres inválidos removidos. Use apenas letras e espaços.');
              } else {
                setNameError('');
              }
              setName(cleaned);
            }}
            className={nameError ? 'c-input--error' : ''}
          />
          {nameError && <div className="error-text">{nameError}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">Data de nascimento <span className="required-asterisk">*</span></span>
          <Input
            type="text"
            required
            placeholder="DD/MM/AAAA"
            value={birthDate}
            onChange={(e) => {
              const formatted = formatConstrainedDateInput(e.target.value || '');
              setBirthDate(formatted);
              setBirthDateError('');
              if (!isMinor(formatted)) {
                if (guardian || guardianContact) {
                  setGuardian('');
                  setGuardianContact('');
                }
                setGuardianError('');
                setGuardianContactError('');
              }
            }}
          />
          {birthDateError && <div className="error-text">{birthDateError}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">CPF <span className="required-asterisk">*</span></span>
          <Input mask="cpf" placeholder="000.000.000-00" value={cpf} onChange={(e) => { setCpf(e.target.value); setCpfError(''); }} />
          {cpfError && <div className="error-text">{cpfError}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">Sexo <span className="required-asterisk">*</span></span>
          <select className="c-input" required value={gender} onChange={(e) => { setGender(e.target.value); setGenderError(''); }}>
            <option value="">Selecione</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
          </select>
          {genderError && <div className="error-text">{genderError}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">Estado civil <span className="required-asterisk">*</span></span>
          <select className="c-input" required value={marital} onChange={(e) => { setMarital(e.target.value); setMaritalError(''); }}>
            <option value="">Selecione</option>
            <option value="solteiro">Solteiro(a)</option>
            <option value="casado">Casado(a)</option>
            <option value="divorciado">Divorciado(a)</option>
            <option value="viuvo">Viúvo(a)</option>
          </select>
          {maritalError && <div className="error-text">{maritalError}</div>}
        </label>

        <label className="form-label full-width">
          <span className="label-title">Endereço <span className="required-asterisk">*</span></span>
          <AddressAutocomplete
            placeholder="Rua, bairro, cidade - UF"
            value={address}
            onChange={(v) => { setAddress(v); setAddressError(''); }}
            onPlaceSelected={({ description }) => {
              setAddressError('');
            }}
          />
          {addressError && <div className="error-text">{addressError}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ flex: '0 0 80px' }}>
              <span className="label-title">Número</span>
              <input
                className="c-input"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="N°123"
                value={addressNumber}
                onChange={(e) => {
                  const v = (e.target.value || '').replace(/\D/g, '').slice(0, 6);
                  setAddressNumber(v);
                  setAddressNumberError('');
                }}
                type="text"
              />
              {addressNumberError && <div className="error-text">{addressNumberError}</div>}
            </label>
            <label className="form-label" style={{ flex: '0 1 160px', minWidth: '120px' }}>
              <span className="label-title">Complemento</span>
              <input
                className="c-input"
                placeholder="Apto 101, Bloco B"
                value={complement}
                onChange={(e) => { setComplement(e.target.value); setComplementError(''); }}
                type="text"
              />
              {complementError && <div className="error-text">{complementError}</div>}
            </label>
            <label className="form-label" style={{ flex: '1 1 220px', minWidth: '180px' }}>
              <span className="label-title">Telefone <span className="required-asterisk">*</span></span>
              <Input mask="phone" placeholder="(00) 00000-0000" value={number} onChange={(e) => { setNumber(e.target.value); setNumberError(''); }} />
              {numberError && <div className="error-text">{numberError}</div>}
            </label>
          </div>
        </label>



        {minor && (
          <>
            <label className="form-label">
              Responsável legal
              <Input placeholder="Nome do responsável" value={guardian} onChange={(e) => setGuardian(e.target.value)} />
              {guardianError && <div className="error-text">{guardianError}</div>}
            </label>

            <label className="form-label">
              Contato do responsável
              <Input mask="phone" placeholder="(00) 00000-0000" value={guardianContact} onChange={(e) => setGuardianContact(e.target.value)} />
              {guardianContactError && <div className="error-text">{guardianContactError}</div>}
            </label>
          </>
        )}

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
                if (ok) {
                  onComplete?.(buildData());
                }
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
