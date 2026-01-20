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
                // Se timeStr já for ISO completo (contém 'T')
                if (timeStr.includes('T')) {
                    const date = new Date(timeStr);
                    if (isNaN(date.getTime())) {
                        console.error('Data inválida (ISO):', timeStr);
                        return null;
                    }
                    return date;
                }

                // Garantir que dateStr está no formato YYYY-MM-DD
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                    console.error('Formato de data inválido:', dateStr);
                    return null;
                }

                // timeStr pode ser "HH:mm", "HH:mm:ss" ou "HH:mm:ss.sss"
                // Normalizar para HH:mm:ss
                let normalizedTime = timeStr;
                if (timeStr.length === 5) {
                    // HH:mm -> HH:mm:00
                    normalizedTime = `${timeStr}:00`;
                } else if (timeStr.includes('.')) {
                    // HH:mm:ss.sss -> HH:mm:ss
                    normalizedTime = timeStr.split('.')[0];
                }

                // Combinar data e hora em formato ISO local
                const dateTimeStr = `${dateStr}T${normalizedTime}`;
                const date = new Date(dateTimeStr);

                if (isNaN(date.getTime())) {
                    console.error('Data combinada inválida:', { dateStr, timeStr, dateTimeStr });
                    return null;
                }

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

            // A sala abre 5 minutos antes
            const UNLOCK_MINUTES = 5;

            // Permitir entrar se:
            // 1. Faltam 5 minutos ou menos para começar (minutesUntilStart <= 5)
            // 2. A consulta já começou (minutesUntilStart < 0) mas não passou muito tempo (ex: até 2h depois)
            const MAX_MINUTES_AFTER_START = 15; // 15 minutos
            const isAvailable = minutesUntilStart <= UNLOCK_MINUTES && minutesUntilStart >= -MAX_MINUTES_AFTER_START;

            setCanJoin(isAvailable);

            // Verificar se é hoje
            const today = new Date();
            const isSameDay = today.toDateString() === targetDate.toDateString();
            setIsToday(isSameDay);

            if (isAvailable) {
                if (minutesUntilStart <= 0) {
                    setTimeRemaining('Consulta em andamento');
                } else {
                    setTimeRemaining('Consulta liberada');
                }
            } else if (minutesUntilStart < -MAX_MINUTES_AFTER_START) {
                setTimeRemaining('Consulta expirada');
            } else {
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
                        const days = Math.ceil(diffToUnlock / (1000 * 60 * 60 * 24));
                        setTimeRemaining(days === 1 ? 'Amanhã' : `Faltam ${days} dias`);
                    }
                } else {
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
