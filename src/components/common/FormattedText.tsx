"use client";

import React from 'react';

interface FormattedTextProps {
    text: string;
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
                // Detectar se a linha é um cabeçalho formatado (### **TITULO**) ou apenas # TITULO
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

                // Linha comum de texto
                return (
                    <div key={index} style={{ marginBottom: line.trim() === '' ? '0.5rem' : '0' }}>
                        {line}
                    </div>
                );
            })}
        </div>
    );
}
