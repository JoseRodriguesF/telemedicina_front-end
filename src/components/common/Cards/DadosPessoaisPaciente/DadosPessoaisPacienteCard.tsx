'use client';

import './DadosPessoaisPacienteCard.css';
import Input from '@/components/common/Inputs/Input';
import AddressAutocomplete from '@/components/common/Inputs/AddressAutocomplete';
import Button from '@/components/common/Buttons/Button';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  isValidName,
  isValidCPF,
  isValidPhone,
  isValidDate,
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

const schema = z.object({
  name: z.string()
    .min(1, 'Informe seu nome')
    .refine(isValidName, 'Nome inválido. Use apenas letras e espaços.'),
  birthDate: z.string()
    .min(1, 'Informe a data de nascimento')
    .refine(isValidDate, 'Data de nascimento inválida.'),
  cpf: z.string()
    .min(1, 'Informe o CPF')
    .refine(isValidCPF, 'CPF inválido.'),
  gender: z.string().min(1, 'Selecione o sexo'),
  marital: z.string().min(1, 'Selecione o estado civil'),
  address: z.string().min(1, 'Informe o endereço'),
  addressNumber: z.string()
    .min(1, 'Informe o número')
    .refine(v => !isNaN(Number(v)), 'Número inválido'),
  complement: z.string().optional(),
  number: z.string()
    .min(1, 'Informe o telefone')
    .refine(isValidPhone, 'Telefone inválido.'),
  guardian: z.string().optional(),
  guardianContact: z.string().optional(),
}).superRefine((data, ctx) => {
  if (isMinor(data.birthDate)) {
    if (!data.guardian?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Preencha o nome do responsável.',
        path: ['guardian']
      });
    }
    if (!data.guardianContact?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Preencha o contato do responsável.',
        path: ['guardianContact']
      });
    } else if (!isValidPhone(data.guardianContact)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contato do responsável inválido.',
        path: ['guardianContact']
      });
    }
  }
});

function parseBirthDate(value: string): Date | null {
  if (!value) return null;
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

type Props = {
  onBack?: () => void;
  onComplete?: (data?: DadosPessoais) => void;
};

export default function DadosPessoaisPacienteCard({ onBack, onComplete }: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      birthDate: '',
      cpf: '',
      gender: '',
      marital: '',
      address: '',
      addressNumber: '',
      complement: '',
      number: '',
      guardian: '',
      guardianContact: '',
    }
  });

  const birthDate = watch('birthDate');
  const minor = isMinor(birthDate);

  // Clear guardian info if not minor anymore (typing)
  useEffect(() => {
    if (!minor) {
      setValue('guardian', '');
      setValue('guardianContact', '');
    }
  }, [minor, setValue]);

  const onSubmit = (data: any) => {
    const finalData: DadosPessoais = {
      ...data,
      addressNumber: data.addressNumber ? Number(data.addressNumber) : undefined,
    };
    onComplete?.(finalData);
  };

  return (
    <section className="register-card dados-pessoais-card">
      <div className="register-brand">
        <img src="/images/logo_matriarca.png" alt="Matriarca" height={50} style={{ objectFit: 'contain' }} />
        <p>Complete seu perfil para um melhor atendimento</p>
      </div>

      <h1 className="register-title">Dados Pessoais</h1>
      <p className="register-subtitle">Etapa 2 de 3</p>

      <form className="register-form grid-2" onSubmit={handleSubmit(onSubmit)}>
        <label className="form-label full-width">
          <span className="label-title">Nome <span className="required-asterisk">*</span></span>
          <Input
            placeholder="Seu nome completo"
            {...register('name', {
              onChange: (e) => {
                const raw = e.target.value || '';
                let cleaned = raw;
                try {
                  cleaned = raw.replace(/[^\p{L} ]+/gu, '');
                } catch (ex) {
                  cleaned = raw.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ ]+/g, '');
                }
                setValue('name', cleaned);
              }
            })}
            className={errors.name ? 'c-input--error' : ''}
          />
          {errors.name && <div className="error-text">{errors.name.message as string}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">Data de nascimento <span className="required-asterisk">*</span></span>
          <Controller
            control={control}
            name="birthDate"
            render={({ field }) => (
              <Input
                type="text"
                mask="date"
                placeholder="DD/MM/AAAA"
                {...field}
                className={errors.birthDate ? 'c-input--error' : ''}
              />
            )}
          />
          {errors.birthDate && <div className="error-text">{errors.birthDate.message as string}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">CPF <span className="required-asterisk">*</span></span>
          <Controller
            control={control}
            name="cpf"
            render={({ field }) => (
              <Input
                mask="cpf"
                placeholder="000.000.000-00"
                {...field}
                className={errors.cpf ? 'c-input--error' : ''}
              />
            )}
          />
          {errors.cpf && <div className="error-text">{errors.cpf.message as string}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">Sexo <span className="required-asterisk">*</span></span>
          <select
            className={`c-input ${errors.gender ? 'c-input--error' : ''}`}
            {...register('gender')}
          >
            <option value="">Selecione</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
          </select>
          {errors.gender && <div className="error-text">{errors.gender.message as string}</div>}
        </label>

        <label className="form-label">
          <span className="label-title">Estado civil <span className="required-asterisk">*</span></span>
          <select
            className={`c-input ${errors.marital ? 'c-input--error' : ''}`}
            {...register('marital')}
          >
            <option value="">Selecione</option>
            <option value="solteiro">Solteiro(a)</option>
            <option value="casado">Casado(a)</option>
            <option value="divorciado">Divorciado(a)</option>
            <option value="viuvo">Viúvo(a)</option>
          </select>
          {errors.marital && <div className="error-text">{errors.marital.message as string}</div>}
        </label>

        <label className="form-label full-width">
          <span className="label-title">Endereço <span className="required-asterisk">*</span></span>
          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <AddressAutocomplete
                placeholder="Rua, bairro, cidade - UF"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.address && <div className="error-text">{errors.address.message as string}</div>}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ flex: '0 0 80px' }}>
              <span className="label-title">Número</span>
              <input
                className={`c-input ${errors.addressNumber ? 'c-input--error' : ''}`}
                inputMode="numeric"
                placeholder="N°123"
                {...register('addressNumber', {
                  onChange: (e) => {
                    const v = (e.target.value || '').replace(/\D/g, '').slice(0, 6);
                    setValue('addressNumber', v);
                  }
                })}
              />
              {errors.addressNumber && <div className="error-text">{errors.addressNumber.message as string}</div>}
            </label>

            <label className="form-label" style={{ flex: '0 1 160px', minWidth: '120px' }}>
              <span className="label-title">Complemento</span>
              <input
                className="c-input"
                placeholder="Apto 101, Bloco B"
                {...register('complement')}
              />
            </label>

            <label className="form-label" style={{ flex: '1 1 220px', minWidth: '180px' }}>
              <span className="label-title">Telefone <span className="required-asterisk">*</span></span>
              <Controller
                control={control}
                name="number"
                render={({ field }) => (
                  <Input
                    mask="phone"
                    placeholder="(00) 00000-0000"
                    {...field}
                    className={errors.number ? 'c-input--error' : ''}
                  />
                )}
              />
              {errors.number && <div className="error-text">{errors.number.message as string}</div>}
            </label>
          </div>
        </label>

        {minor && (
          <>
            <label className="form-label">
              Responsável legal
              <Input
                placeholder="Nome do responsável"
                {...register('guardian')}
                className={errors.guardian ? 'c-input--error' : ''}
              />
              {errors.guardian && <div className="error-text">{errors.guardian.message as string}</div>}
            </label>

            <label className="form-label">
              Contato do responsável
              <Controller
                control={control}
                name="guardianContact"
                render={({ field }) => (
                  <Input
                    mask="phone"
                    placeholder="(00) 00000-0000"
                    {...field}
                    className={errors.guardianContact ? 'c-input--error' : ''}
                  />
                )}
              />
              {errors.guardianContact && <div className="error-text">{errors.guardianContact.message as string}</div>}
            </label>
          </>
        )}

        <div className="form-actions actions-full two-equal">
          <div className="left-actions">
            <Button type="button" variant="ghost" onClick={onBack}>Voltar</Button>
          </div>
          <div className="right-actions">
            <Button
              type="submit"
              variant="primary"
            >
              Próximo
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
