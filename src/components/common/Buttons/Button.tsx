import React from 'react';
import './button.css';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'google';
  className?: string;
};

export default function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  const variantClass = `c-btn--${variant}`;
  return (
    <button className={`c-btn ${variantClass} ${className}`} {...rest}>
      {children}
    </button>
  );
}
