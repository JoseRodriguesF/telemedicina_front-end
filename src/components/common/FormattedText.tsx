"use client";

import React from 'react';

interface FormattedTextProps {
    text: string;
    style?: React.CSSProperties;
}

/**
 * Componente simples para renderizar texto com formatação básica de markdown
 * Suporta: ### **TITULO**, **negrito**, e quebras de linha
 */
export default function FormattedText({ text, style }: FormattedTextProps) {
    if (!text) return null;

    // Processar o texto linha por linha
    const lines = text.split('\n');

    return (
        <div style={{ ...style, whiteSpace: 'pre-wrap' }}>
            {lines.map((line, index) => {
                // Detectar se a linha é um cabeçalho formatado (### **TITULO**) ou apenas # TITULO
                const headerMatch = line.match(/^(?:###\s+)?(?:\*\*)?([^*#]+)(?:\*\*)?\s*$/);
                const isHeader = line.startsWith('#') || (line.startsWith('**') && line.endsWith('**'));

                if (isHeader) {
                    // Limpar a linha de marcadores para o display
                    const cleanTitle = line.replace(/[#*]/g, '').trim();

                    return (
                        <div
                            key={index}
                            style={{
                                fontWeight: 800,
                                color: 'var(--color-primary-600)',
                                marginTop: index === 0 ? '0' : '1.25rem',
                                marginBottom: '0.5rem',
                                fontSize: '0.95rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.025em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {cleanTitle}
                        </div>
                    );
                }

                // Processar negrito simples dentro da linha (ex: **texto**)
                // Para simplicidade, assumindo que a linha inteira ou partes são texto comum
                return (
                    <div key={index} style={{ marginBottom: line.trim() === '' ? '0.5rem' : '0' }}>
                        {line}
                    </div>
                );
            })}
        </div>
    );
}
