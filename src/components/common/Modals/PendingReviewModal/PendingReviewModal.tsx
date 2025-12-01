'use client';

import React from 'react';
import './PendingReviewModal.css';
import Button from '@/components/common/Buttons/Button';

type Props = {
  open: boolean;
  email?: string | null;
  onClose?: () => void;
  onGoHome?: () => void;
};

export default function PendingReviewModal({ open, email, onClose, onGoHome }: Props) {
  if (!open) return null;

  return (
    <div className="prm-overlay">
      <div className="prm-modal" role="dialog" aria-modal="true" aria-labelledby="prm-title">
        <div className="prm-header">
          <div className="prm-icon">⏳</div>
          <h3 id="prm-title" className="prm-title">Cadastro em análise</h3>
        </div>
        <div className="prm-body">
          <p>Seu cadastro de médico está em análise. Por favor, volte mais tarde.</p>
          <p>Quando a análise for concluída, você receberá uma mensagem no seu email{email ? ` (${email})` : ''}.</p>
        </div>
        <div className="prm-actions">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button variant="primary" onClick={onGoHome}>Voltar ao início</Button>
        </div>
      </div>
    </div>
  );
}
