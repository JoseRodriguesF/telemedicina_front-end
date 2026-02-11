import React from 'react';
import './input.css';

type MaskType = 'cpf' | 'phone' | 'date' | undefined;

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  mask?: MaskType;
  sanitize?: (value: string) => string;
};

function formatCPF(value: string) {
  const nums = value.replace(/\D/g, '').slice(0, 11);
  return nums
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
    .slice(0, 14);
}

function formatPhone(value: string) {
  // allow up to 11 digits (DDD + number)
  const nums = value.replace(/\D/g, '').slice(0, 11);
  if (nums.length === 0) return '';
  const ddd = nums.slice(0, 2);
  const rest = nums.slice(2);
  if (!rest) return `(${ddd}`;
  if (rest.length <= 4) {
    return `(${ddd}) ${rest}`;
  }
  const last4 = rest.slice(-4);
  const prefix = rest.slice(0, -4);
  return `(${ddd}) ${prefix}-${last4}`;
}

function formatDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length >= 5) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
  return digits;
}

export default function Input({ className = '', mask, sanitize, onChange, ...rest }: Props) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let val = e.target.value || '';
    if (sanitize) {
      try {
        val = sanitize(val);
      } catch (err) {
        // ignore sanitize errors and fallback to original
      }
    }
    if (mask === 'cpf') val = formatCPF(val);
    if (mask === 'phone') val = formatPhone(val);
    if (mask === 'date') val = formatDate(val);

    if (onChange) {
      // create a synthetic event with the formatted value
      const synthetic = {
        ...e,
        target: { ...e.target, value: val },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(synthetic);
    }
  }

  return <input className={`c-input ${className}`} onChange={handleChange} {...rest} />;
}
