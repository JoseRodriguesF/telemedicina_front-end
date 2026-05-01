'use client';

import React from 'react';
import './DocumentsRequiredModal.css';
import Button from '@/components/common/Buttons/Button';
import { useRouter } from 'next/navigation';

type Props = {
  open: boolean;
  onClose?: () => void;
  status?: 'pendente_documentos' | 'analise' | 'recusado';
};

export default function DocumentsRequiredModal({ open, onClose, status = 'pendente_documentos' }: Props) {
  const router = useRouter();

  if (!open) return null;

  const config = {
    pendente_documentos: {
      icon: '📄',
      title: 'Documentos Necessários',
      message: 'Para utilizar esta funcionalidade, você precisa enviar seus documentos profissionais (Diploma e Seguro de Responsabilidade Civil).',
      detail: 'Acesse seu perfil para enviar os documentos necessários. Após o envio, nossa equipe irá analisá-los.',
      actionLabel: 'Ir para o Perfil',
      actionRoute: '/perfil',
    },
    analise: {
      icon: '⏳',
      title: 'Documentos em Análise',
      message: 'Seus documentos foram enviados e estão sendo analisados pela nossa equipe administrativa.',
      detail: 'Você receberá um email quando a análise for concluída. Enquanto isso, você pode continuar navegando pela plataforma.',
      actionLabel: 'Entendi',
      actionRoute: null,
    },
    recusado: {
      icon: '⚠️',
      title: 'Documentos Recusados',
      message: 'Infelizmente, seus documentos foram recusados na última análise.',
      detail: 'Acesse seu perfil para verificar o motivo e enviar novos documentos.',
      actionLabel: 'Ir para o Perfil',
      actionRoute: '/perfil',
    },
  };

  const c = config[status] || config.pendente_documentos;

  return (
    <div className="drm-overlay" onClick={onClose}>
      <div className="drm-modal" role="dialog" aria-modal="true" aria-labelledby="drm-title" onClick={(e) => e.stopPropagation()}>
        <div className="drm-header">
          <div className="drm-icon">{c.icon}</div>
          <h3 id="drm-title" className="drm-title">{c.title}</h3>
        </div>
        <div className="drm-body">
          <p className="drm-message">{c.message}</p>
          <p className="drm-detail">{c.detail}</p>
        </div>
        <div className="drm-actions">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (c.actionRoute) {
                router.push(c.actionRoute);
              } else {
                onClose?.();
              }
            }}
          >
            {c.actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
