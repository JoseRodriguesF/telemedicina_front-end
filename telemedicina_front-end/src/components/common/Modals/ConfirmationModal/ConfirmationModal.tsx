'use client';

import React from 'react';
import './ConfirmationModal.css';
import Button from '@/components/common/Buttons/Button';

type Props = {
    open: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary';
};

export default function ConfirmationModal({
    open,
    title = 'Confirmação',
    message,
    onConfirm,
    onCancel,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'primary'
}: Props) {
    if (!open) return null;

    return (
        <div className="cm-overlay">
            <div className="cm-modal" role="dialog" aria-modal="true">
                <div className="cm-header">
                    <div className={`cm-icon ${variant === 'danger' ? 'danger' : ''}`}>
                        {variant === 'danger' ? '⚠️' : '❓'}
                    </div>
                    <h3 className="cm-title">{title}</h3>
                </div>

                <div className="cm-body">
                    <p>{message}</p>
                </div>

                <div className="cm-actions">
                    <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
                    <Button
                        variant="primary"
                        className={variant === 'danger' ? 'btn-danger' : ''}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
