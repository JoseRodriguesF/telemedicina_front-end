"use client";

import React from 'react';

interface FormattedTextProps {
    text?: string | null;
    style?: React.CSSProperties;
}

/**
 * Componente para renderizar texto com formatação básica de markdown
 * Suporta: ### **TITULO**, **negrito**, quebras de linha, e auto-formatação de histórias clínicas
 */
export default function FormattedText({ text, style }: FormattedTextProps) {
    if (!text) return null;

    // Detectar se é um texto de história clínica sem quebras de linha (formato antigo)
    // e precisa ser auto-formatado
    const needsAutoFormat = !text.includes('\n') && (
        text.includes('Queixa principal:') ||
        text.includes('QUEIXA PRINCIPAL') ||
        text.includes('Histórico médico pessoal:') ||
        text.includes('HISTÓRICO MÉDICO PESSOAL') ||
        text.includes('Antecedentes familiares:') ||
        text.includes('ANTECEDENTES FAMILIARES')
    );

    let processedText = text;

    if (needsAutoFormat) {
        // Inserir quebras de linha antes dos marcadores comuns de seção
        processedText = text
            .replace(/\s*(Queixa principal:|QUEIXA PRINCIPAL)\s*/gi, '\n\n### **QUEIXA PRINCIPAL**\n')
            .replace(/\s*(Histórico dos sintomas|HISTÓRICO DOS SINTOMAS|detalhes do pedido)[:\s]*/gi, '\n\n### **HISTÓRICO DOS SINTOMAS**\n')
            .replace(/\s*(Histórico médico pessoal:|HISTÓRICO MÉDICO PESSOAL)\s*/gi, '\n\n### **HISTÓRICO MÉDICO PESSOAL**\n')
            .replace(/\s*(Antecedentes familiares:|ANTECEDENTES FAMILIARES)\s*/gi, '\n\n### **ANTECEDENTES FAMILIARES**\n')
            .replace(/\s*(Estilo de vida:|ESTILO DE VIDA)\s*/gi, '\n\n### **ESTILO DE VIDA**\n')
            .replace(/\s*(Vacinação:|VACINAÇÃO)\s*/gi, '\n\n### **VACINAÇÃO**\n')
            .replace(/\s*(Observações:|OBSERVAÇÕES)\s*/gi, '\n\n### **OBSERVAÇÕES**\n')
            .trim();
    }

    // Processar o texto linha por linha
    const lines = processedText.split('\n');

    return (
        <div style={{ ...style, whiteSpace: 'pre-wrap' }}>
            {lines.map((line, index) => {
                const trimmedLine = line.trim();
                
                // 1. Detectar cabeçalhos (### ou **TEXTO**)
                const isHeader = line.startsWith('#') || (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.length > 4);

                if (isHeader) {
                    const cleanTitle = line.replace(/[#*]/g, '').trim();
                    return (
                        <div
                            key={index}
                            style={{
                                fontWeight: 800,
                                color: 'var(--color-primary-600)',
                                marginTop: index === 0 ? '0' : '1.25rem',
                                marginBottom: '0.5rem',
                                fontSize: '0.9rem',
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

                // 2. Detectar itens de lista (- ou *)
                const isListItem = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ');
                if (isListItem) {
                    const content = trimmedLine.substring(2);
                    const parts = content.split(/(\*\*[^*]+\*\*)/g);
                    return (
                        <div key={index} style={{ 
                            display: 'flex', 
                            gap: '0.6rem', 
                            marginLeft: '0.5rem', 
                            marginBottom: '0.4rem',
                            lineHeight: 1.5 
                        }}>
                            <span style={{ color: 'var(--color-primary-500)', fontWeight: 'bold' }}>•</span>
                            <span style={{ flex: 1 }}>
                                {parts.map((part, i) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                        return <strong key={i}>{part.slice(2, -2)}</strong>;
                                    }
                                    return <span key={i}>{part}</span>;
                                })}
                            </span>
                        </div>
                    );
                }

                // 3. Linha comum de texto - processar negrito
                if (trimmedLine === '') return <div key={index} style={{ height: '0.75rem' }} />;

                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return (
                    <div key={index} style={{ marginBottom: '0.25rem', lineHeight: 1.6 }}>
                        {parts.map((part, i) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i}>{part.slice(2, -2)}</strong>;
                            }
                            return <span key={i}>{part}</span>;
                        })}
                    </div>
                );
            })}
        </div>
    );
}
