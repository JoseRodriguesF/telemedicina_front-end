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
                // Variáveis para extração
                let finalDateStr = dateStr;
                let finalTimeStr = timeStr;

                // Extração da DATA (YYYY-MM-DD)
                if (dateStr.includes('T')) {
                    finalDateStr = dateStr.split('T')[0];
                }

                // Extração da HORA (HH:mm:ss)
                if (timeStr.includes('T')) {
                    // Extrai "15:00:00" de "1970-01-01T15:00:00.000Z" ou "2026-03-26T15:00:00.000Z"
                    const parts = timeStr.split('T');
                    finalTimeStr = parts[1].split('.')[0].replace('Z', '');
                }

                // Limpar data (deve ser YYYY-MM-DD)
                if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDateStr)) return null;

                // Normalizar hora para HH:mm:ss
                let normalizedTime = finalTimeStr;
                if (finalTimeStr.length === 5) normalizedTime = `${finalTimeStr}:00`;
                else if (finalTimeStr.includes('.')) normalizedTime = finalTimeStr.split('.')[0];

                // Re-combinar.
                // IMPORTANTE: Se os dados vêm do banco via Prisma (com T), eles estão em UTC.
                // Se vêm de input manual (sem T), assumimos Brasília (-03:00).
                const isFromDB = timeStr.includes('T') || dateStr.includes('T');
                let dateTimeStr = '';

                if (isFromDB) {
                    // Trata como UTC para manter consistência com o que foi salvo
                    dateTimeStr = `${finalDateStr}T${normalizedTime}Z`;
                } else {
                    // Trata como Brasília para inputs novos/manuais
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

            // A sala abre 10 minutos antes (ajustado de 5)
            const UNLOCK_MINUTES = 10;

            // Permitir entrar se:
            // 1. Faltam 10 minutos ou menos para começar (minutesUntilStart <= 10)
            // 2. A consulta já começou (minutesUntilStart < 0) mas não passou muito tempo 
            //    Aumentamos para 60 minutos (1 hora) de tolerância após o início
            const MAX_MINUTES_AFTER_START = 60; 
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
