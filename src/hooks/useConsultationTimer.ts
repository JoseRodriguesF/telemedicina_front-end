import { useState, useEffect } from 'react';

/**
 * Hook para gerenciar o estado de disponibilidade de uma consulta.
 * Retorna se a consulta pode ser acessada (5 min antes) e o texto do cronômetro.
 * 
 * @param dateStr Data da consulta (YYYY-MM-DD)
 * @param timeStr Hora da consulta (HH:mm ou HH:mm:ss)
 */
export function useConsultationTimer(dateStr: string, timeStr: string) {
    const [canJoin, setCanJoin] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isToday, setIsToday] = useState(false);

    useEffect(() => {
        // Função auxiliar para criar data seguramente
        const getTargetDate = () => {
            try {
                if (timeStr.includes('T')) {
                    // Se timeStr já for ISO completo
                    return new Date(timeStr);
                }
                // Assumindo formato YYYY-MM-DD e HH:mm
                return new Date(`${dateStr}T${timeStr}`);
            } catch (e) {
                return null;
            }
        };

        const targetDate = getTargetDate();

        const calculate = () => {
            if (!targetDate) return;

            const now = new Date();
            // Diferença em ms até o horário da consulta
            const diffMs = targetDate.getTime() - now.getTime();
            // Minutos até o inicio
            const minutesUntilStart = diffMs / (1000 * 60);

            // A sala abre 5 minutos antes
            // Se minutesUntilStart <= 5, significa que falta menos de 5 min ou já passou (negativo)
            // Mas também não pode ser muito antigo (ex: consulta de ontem). Se passou de 24h, talvez bloquear?
            // O requisito diz "só fique disponivel 5 minutos antes".
            // Vamos assumir que se já passou do horário (diff negativo), ainda pode entrar (ex: atraso), 
            // a menos que tenha expirado (ex: 2 horas depois). Mas por enquanto, foca em liberar.

            const UNLOCK_MINUTES = 5;

            const isAvailable = minutesUntilStart <= UNLOCK_MINUTES;

            // Verification adicional: não permitir entrar em consultas de dias futuros mesmo se o calculo bugasse
            // (embora o diffMs cuide disso).
            // Mas e se a consulta foi ontem? minutesUntilStart será negativo.
            // Vamos assumir que consultas antigas são filtradas pela API ou outro status 'finalizada'.
            // Aqui só cuidamos do bloqueio de "futuro".

            setCanJoin(isAvailable);

            const today = new Date();
            const isSameDay = today.toDateString() === targetDate.toDateString();
            setIsToday(isSameDay);

            if (isAvailable) {
                setTimeRemaining('Consulta liberada');
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
                }
            }
        };

        calculate(); // Call immediately
        const interval = setInterval(calculate, 1000);

        return () => clearInterval(interval);
    }, [dateStr, timeStr]);

    return { canJoin, timeRemaining, isToday };
}
