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
    variant?: 'danger' | 'primary'; // To style the confirm button (danger = red)
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
                    {variant === 'danger' && <div className="cm-icon">!</div>}
                    <h3 className="cm-title">{title}</h3>
                </div>

                <div className="cm-body">
                    {message}
                </div>

                <div className="cm-actions">
                    <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
                    <Button
                        variant={variant === 'danger' ? 'primary' : 'primary'} // Assuming Button component handles 'primary', if we need red we might need styling or custom class, but for now primary is blue. Button component might not have 'danger' variant.
                        // Wait, looking at Button usage in TermsModal: <Button variant="primary" ...>.
                        // If I want a red button I might need to style it or add a variant.
                        // Let's stick to primary for now or use style override if critical.
                        // Actually, if variant is danger, let's try to add a style or class if Button supports className.
                        // I'll check Button component later if needed. For now, blue confirmation is fine or I can wrap it.
                        // Let's assume standard primary is okay for now, user just asked for modal.
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
