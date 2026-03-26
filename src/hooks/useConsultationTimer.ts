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
                // Se timeStr já for uma string ISO completa vinda do banco (UTC), use-a diretamente
                if (timeStr.includes('T') && timeStr.endsWith('Z')) {
                    return new Date(timeStr);
                }

                // Se dateStr for ISO completo, use tbm
                if (dateStr.includes('T') && dateStr.endsWith('Z')) {
                    return new Date(dateStr);
                }

                // Variáveis para extração
                let finalDateStr = dateStr;
                let finalTimeStr = timeStr;

                // Extração de partes se necessário
                if (dateStr.includes('T')) {
                    finalDateStr = dateStr.split('T')[0];
                }

                if (timeStr.includes('T')) {
                    // Extrai "15:00:00" de "1970-01-01T15:00:00.000Z"
                    const parts = timeStr.split('T');
                    finalTimeStr = parts[1].split('.')[0].replace('Z', '');
                }

                // Limpar data
                if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDateStr)) return null;

                // Normalizar hora para HH:mm:ss
                let normalizedTime = finalTimeStr;
                if (finalTimeStr.length === 5) normalizedTime = `${finalTimeStr}:00`;
                else if (finalTimeStr.includes('.')) normalizedTime = finalTimeStr.split('.')[0];

                // Re-combinar.
                // Se era UTC (veio com T), append 'Z' se não tiver.
                // Se NÃO era UTC (veio raw "10:00"), append '-03:00' para forçar Brasília.
                const isOriginalUTC = timeStr.includes('T') || dateStr.includes('T');
                let dateTimeStr = '';

                if (isOriginalUTC) {
                    // Mantém tratamento UTC
                    dateTimeStr = `${finalDateStr}T${normalizedTime}Z`;
                } else {
                    // Força Brasília para inputs manuais (YYYY-MM-DD + HH:mm)
                    dateTimeStr = `${finalDateStr}T${normalizedTime}-03:00`;
                }

                return new Date(dateTimeStr);
            } catch {
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



            // A sala abre 5 minutos antes
            const UNLOCK_MINUTES = 5;

            // Permitir entrar se:
            // 1. Faltam 5 minutos ou menos para começar (minutesUntilStart <= 5)
            // 2. A consulta já começou (minutesUntilStart < 0) mas não passou muito tempo (ex: até 10 min depois)
            const MAX_MINUTES_AFTER_START = 10; // 10 minutos conforme pedido do usuário
            const isAvailable = minutesUntilStart <= UNLOCK_MINUTES && minutesUntilStart >= -MAX_MINUTES_AFTER_START;

            setCanJoin(isAvailable);

            // Verificar se é hoje EM BRASÍLIA
            // Usamos Intl para extrair YYYY-MM-DD em SP tanto para Hoje quanto para a Data Alvo
            const fmt = new Intl.DateTimeFormat('pt-BR', {
                year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'America/Sao_Paulo'
            });

            const todayStr = fmt.format(now);
            const targetStr = fmt.format(targetDate);
            const isSameDay = todayStr === targetStr;

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
