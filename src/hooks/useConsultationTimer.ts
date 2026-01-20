import { useState, useEffect } from 'react';

/**
 * Hook para gerenciar o estado de disponibilidade de uma consulta.
 * Retorna se a consulta pode ser acessada (5 min antes) e o texto do cronômetro.
 * 
 * @param dateStr Data da consulta (YYYY-MM-DD)
 * @param timeStr Hora da consulta (HH:mm ou HH:mm:ss ou ISO completo)
 */
export function useConsultationTimer(dateStr: string, timeStr: string) {
    const [canJoin, setCanJoin] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isToday, setIsToday] = useState(false);

    useEffect(() => {
        // Se não tiver dateStr ou timeStr, não calcular
        if (!dateStr || !timeStr) {
            setCanJoin(false);
            setTimeRemaining('');
            return;
        }

        // Função auxiliar para criar data seguramente
        const getTargetDate = () => {
            try {
                // Variáveis para armazenar data e hora extraídas
                let finalDateStr = dateStr;
                let finalTimeStr = timeStr;

                // Se dateStr é uma string ISO completa (contém 'T'), extrair apenas a parte da data
                if (dateStr.includes('T')) {
                    const datePart = dateStr.split('T')[0];
                    finalDateStr = datePart; // Ex: "2026-01-23"
                    console.log('📅 Extraída data de ISO:', { original: dateStr, extracted: finalDateStr });
                }

                // Se timeStr é uma string ISO completa (contém 'T'), extrair apenas a parte da hora
                if (timeStr.includes('T')) {
                    // Ex: "1970-01-01T15:00:00.000Z" -> pegar "15:00:00"
                    const timePart = timeStr.split('T')[1]?.split('.')[0] || timeStr.split('T')[1];
                    finalTimeStr = timePart.replace('Z', ''); // Ex: "15:00:00"
                    console.log('⏰ Extraída hora de ISO:', { original: timeStr, extracted: finalTimeStr });
                }

                // Garantir que finalDateStr está no formato YYYY-MM-DD
                if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDateStr)) {
                    console.error('Formato de data inválido:', finalDateStr);
                    return null;
                }

                // Normalizar hora para HH:mm:ss
                let normalizedTime = finalTimeStr;
                if (finalTimeStr.length === 5) {
                    // HH:mm -> HH:mm:00
                    normalizedTime = `${finalTimeStr}:00`;
                } else if (finalTimeStr.includes('.')) {
                    // HH:mm:ss.sss -> HH:mm:ss
                    normalizedTime = finalTimeStr.split('.')[0];
                }

                // Combinar data e hora em formato ISO local
                const dateTimeStr = `${finalDateStr}T${normalizedTime}`;
                const date = new Date(dateTimeStr);

                if (isNaN(date.getTime())) {
                    console.error('Data combinada inválida:', { finalDateStr, finalTimeStr, dateTimeStr });
                    return null;
                }

                console.log('✅ Data processada com sucesso:', {
                    input: { dateStr, timeStr },
                    processed: { finalDateStr, normalizedTime },
                    result: date.toISOString()
                });

                return date;
            } catch (e) {
                console.error('Erro ao processar data:', e, { dateStr, timeStr });
                return null;
            }
        };

        const targetDate = getTargetDate();

        const calculate = () => {
            if (!targetDate) {
                setCanJoin(false);
                setTimeRemaining('Data inválida');
                return;
            }

            const now = new Date();

            // Diferença em ms até o horário da consulta
            const diffMs = targetDate.getTime() - now.getTime();
            // Minutos até o inicio
            const minutesUntilStart = diffMs / (1000 * 60);

            // Debug: Log para verificar valores
            console.log('🔍 Timer Debug:', {
                dateStr,
                timeStr,
                targetDate: targetDate.toISOString(),
                now: now.toISOString(),
                minutesUntilStart: minutesUntilStart.toFixed(2),
                diffMs
            });

            // A sala abre 5 minutos antes
            const UNLOCK_MINUTES = 5;

            // Permitir entrar se:
            // 1. Faltam 5 minutos ou menos para começar (minutesUntilStart <= 5)
            // 2. A consulta já começou (minutesUntilStart < 0) mas não passou muito tempo (ex: até 15 min depois)
            const MAX_MINUTES_AFTER_START = 15; // 15 minutos
            const isAvailable = minutesUntilStart <= UNLOCK_MINUTES && minutesUntilStart >= -MAX_MINUTES_AFTER_START;

            setCanJoin(isAvailable);

            // Verificar se é hoje
            const today = new Date();
            const isSameDay = today.toDateString() === targetDate.toDateString();
            setIsToday(isSameDay);

            // Lógica de mensagem:
            // 1. Se está disponível para entrar (5 min antes até 15 min depois)
            if (isAvailable) {
                if (minutesUntilStart <= 0) {
                    setTimeRemaining('Consulta em andamento');
                } else {
                    setTimeRemaining('Consulta liberada');
                }
            }
            // 2. Se a consulta JÁ PASSOU e expirou (mais de 15 min depois)
            else if (minutesUntilStart < -MAX_MINUTES_AFTER_START) {
                setTimeRemaining('Consulta expirada');
            }
            // 3. Se é uma consulta FUTURA (ainda não está na janela de 5 min antes)
            else {
                // Calcular tempo para LIBERAR (Start - 5 min)
                const unlockDate = new Date(targetDate.getTime() - (UNLOCK_MINUTES * 60 * 1000));
                const diffToUnlock = unlockDate.getTime() - now.getTime();

                if (diffToUnlock > 0) {
                    const hours = Math.floor(diffToUnlock / (1000 * 60 * 60));
                    const minutes = Math.floor((diffToUnlock % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diffToUnlock % (1000 * 60)) / 1000);

                    if (isSameDay) {
                        // Formato cronômetro
                        const hh = String(hours).padStart(2, '0');
                        const mm = String(minutes).padStart(2, '0');
                        const ss = String(seconds).padStart(2, '0');
                        setTimeRemaining(`Libera em: ${hh}:${mm}:${ss}`);
                    } else {
                        // Calcular dias até a consulta (não até o unlock)
                        // Usar minutesUntilStart que é a diferença até o início da consulta
                        const daysUntilConsultation = Math.floor(minutesUntilStart / (60 * 24));

                        if (daysUntilConsultation === 0) {
                            setTimeRemaining('Amanhã');
                        } else if (daysUntilConsultation === 1) {
                            setTimeRemaining('Amanhã');
                        } else {
                            setTimeRemaining(`Faltam ${daysUntilConsultation} dias`);
                        }
                    }
                } else {
                    // Caso edge: diffToUnlock <= 0 significa que já passou do unlock time
                    // mas minutesUntilStart > UNLOCK_MINUTES (não deveria acontecer)
                    setTimeRemaining('Aguarde...');
                }
            }
        };

        calculate(); // Call immediately
        const interval = setInterval(calculate, 1000);

        return () => clearInterval(interval);
    }, [dateStr, timeStr]);

    return { canJoin, timeRemaining, isToday };
}
