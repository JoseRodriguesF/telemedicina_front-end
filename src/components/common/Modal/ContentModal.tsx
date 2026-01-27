'use client';

import React, { useEffect, useRef } from 'react';
import './Modal.css';

interface ContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function ContentModal({ isOpen, onClose, title, children, size = 'md' }: ContentModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle ESC key
    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Handle click outside
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === modalRef.current) {
            onClose();
        }
    };

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const maxWidthStyle = size === 'lg' ? '800px' : size === 'xl' ? '1200px' : size === 'sm' ? '320px' : '440px';

    return (
        <div
            ref={modalRef}
            className={`modal-backdrop ${isOpen ? 'modal-open' : ''}`}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="modal-container"
                style={{ maxWidth: maxWidthStyle }}
            >
                <div className="modal-header" style={{ marginBottom: '1.5rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="modal-title">{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            padding: '4px'
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="modal-body" style={{ textAlign: 'left', margin: 0 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
