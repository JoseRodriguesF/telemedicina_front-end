import React from 'react';
import './button.css';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'google';
  className?: string;
  loading?: boolean;
};

export default function Button({ variant = 'primary', className = '', children, loading = false, ...rest }: Props) {
  const variantClass = `c-btn--${variant}`;
  return (
    <button className={`c-btn ${variantClass} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="c-btn__spinner" aria-hidden>Carregando...</span> : children}
    </button>
  );
}
