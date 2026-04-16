'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset accepted state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setAccepted(false);
    }
  }, [open]);

  if (!open || !mounted) return null;

  const modalContent = (
    <div className="tm-overlay">
      <div className="tm-modal">
        <div className="tm-header">
          <div className="tm-icon">ⓘ</div>
          <h3 className="tm-title">{title}</h3>
        </div>

        <div className="tm-body">
          <div className="tm-terms">{termsHtml || DefaultTerms}</div>

          <label className="tm-accept">
            <div className={`tm-checkbox ${accepted ? 'checked' : ''}`}>
              <input 
                type="checkbox" 
                checked={accepted} 
                onChange={(e) => setAccepted(e.target.checked)} 
              />
              {accepted && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span>Eu aceito os termos de uso e consentimento.</span>
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

  return createPortal(modalContent, document.body);
}

