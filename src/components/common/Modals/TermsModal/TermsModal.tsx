'use client';

import React, { useState } from 'react';
import './TermsModal.css';
import Button from '@/components/common/Buttons/Button';
import DefaultTerms from './termsContent';

type Props = {
  open: boolean;
  title?: string;
  termsHtml?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export default function TermsModal({ open, title = 'Termos de Uso e Consentimento', termsHtml, onConfirm, onCancel, loading = false }: Props) {
  const [accepted, setAccepted] = useState(false);

  if (!open) return null;

  return (
    <div className="tm-overlay">
      <div className="tm-modal">
        <div className="tm-header">
          <div className="tm-icon">ⓘ</div>
          <h3 className="tm-title">{title}</h3>
        </div>

        <div className="tm-body">
          <div className="tm-terms">{termsHtml || DefaultTerms}</div>

          <label className="tm-accept">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />{' '}
            Eu aceito os termos de uso e consentimento.
          </label>
        </div>

        <div className="tm-actions">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button variant="primary" loading={loading} onClick={() => accepted && onConfirm()} disabled={!accepted || loading}>
            {loading ? 'Carregando...' : 'Aceito e Continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
