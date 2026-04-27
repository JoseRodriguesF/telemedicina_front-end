/**
 * Utilitários de formatação de data e hora
 * Centraliza todas as funções de formatação para evitar duplicação
 * PADRÃO: HORÁRIO DE BRASÍLIA (America/Sao_Paulo)
 */

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata uma data no formato DD/MM/YYYY
 * @param dateString - Data em formato ISO (YYYY-MM-DD), ISO completo ou Date object
 * @returns String formatada DD/MM/YYYY
 */
export function formatDate(dateString: string | Date | null | undefined): string {
    if (!dateString) return '';
    try {
        if (dateString instanceof Date) {
            return new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE }).format(dateString);
        }

        // Caso 1: Formato puro YYYY-MM-DD (ex: vindo de um input type="date")
        // Tratamos como "Wall Clock", ou seja, a data exata que está escrita, sem conversão
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-').map(Number);
            return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
        }

        // Caso 2: Formato ISO Completo (YYYY-MM-DDTHH:mm:ss.sssZ) vindo do Banco
        if (dateString.includes('T')) {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;

            // Se a hora for exatamente meia-noite UTC (como o Prisma salva datas de nascimento),
            // tratamos como "Wall Clock Date" (data de calendário) e ignoramos o fuso horário
            const timePart = dateString.split('T')[1];
            if (timePart && timePart.startsWith('00:00:00')) {
                const datePart = dateString.split('T')[0];
                const [year, month, day] = datePart.split('-').map(Number);
                return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
            }

            // Para todos os outros casos, converte para Brasília
            return new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE }).format(date);
        }

        const date = new Date(dateString);
        return isNaN(date.getTime()) ? dateString : new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE }).format(date);
    } catch (e) {
        return typeof dateString === 'string' ? dateString : '';
    }
}

/**
 * Formata uma hora para HH:mm (Brasília)
 * @param timeString - Hora em formato HH:mm:ss ou ISO completo
 * @returns String formatada HH:mm
 */
export function formatTime(timeString: string | Date | null | undefined): string {
    if (!timeString) return '';
    try {
        if (timeString instanceof Date) {
            return timeString.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: TIMEZONE
            });
        }

        if (timeString.includes('T')) {
            return new Date(timeString).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: TIMEZONE
            });
        }
        // Se for HH:mm:ss sem T, assume que já é o valor que se deseja mostrar
        return timeString.substring(0, 5);
    } catch (e) {
        return typeof timeString === 'string' ? timeString : '';
    }
}

/**
 * Obtém abreviação do mês (JAN, FEV, etc) em Brasília
 * @param dateStr - Data em formato YYYY-MM-DD ou ISO completo
 * @returns Abreviação do mês em maiúsculas
 */
export function getMonthAbbreviation(dateStr: string): string {
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [, month] = dateStr.split('-');
        return months[parseInt(month) - 1];
    }

    try {
        const date = new Date(dateStr);
        // Usar Intl para extrair o mês corretamente no fuso de SP
        const parts = new Intl.DateTimeFormat('pt-BR', { month: '2-digit', timeZone: TIMEZONE }).formatToParts(date);
        const monthPart = parts.find(p => p.type === 'month');
        if (monthPart) {
            return months[parseInt(monthPart.value) - 1];
        }
        return months[date.getMonth()]; // Fallback
    } catch {
        return '';
    }
}

/**
 * Obtém o dia do mês (com zero à esquerda) em Brasília
 * @param dateStr - Data em formato YYYY-MM-DD ou ISO completo
 * @returns Dia formatado com 2 dígitos (ex: "05", "23")
 */
export function getDay(dateStr: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [, , day] = dateStr.split('-');
        return day;
    }

    try {
        const date = new Date(dateStr);
        // Usar Intl para extrair o dia corretamente no fuso de SP
        const parts = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', timeZone: TIMEZONE }).formatToParts(date);
        const dayPart = parts.find(p => p.type === 'day');
        return dayPart ? dayPart.value : String(date.getDate()).padStart(2, '0');
    } catch {
        return '';
    }
}

/**
 * Calcula timestamp de uma consulta assumindo inputs em Brasília
 * @param dataConsulta - Data em formato YYYY-MM-DD
 * @param horaInicio - Hora em formato HH:mm:ss ou ISO completo
 * @returns Timestamp em milissegundos
 */
export function getConsultaTimestamp(dataConsulta: string, horaInicio: string): number {
    // Se a hora já vier com timezone (ISO), confia nela
    if (horaInicio.includes('T')) {
        return new Date(horaInicio).getTime();
    }

    // Combina YYYY-MM-DD e HH:mm:ss e adiciona offset -03:00 forçado
    // Isso garante que estamos criando um momento específico no tempo (Brasília)
    // independentemente do fuso do navegador.
    const isoString = `${dataConsulta}T${horaInicio.length === 5 ? horaInicio + ':00' : horaInicio}-03:00`;
    return new Date(isoString).getTime();
}

/**
 * Formata data para exibição (DD/MM/YYYY)
 * @param dateStr - Data em formato YYYY-MM-DD
 * @returns Data formatada DD/MM/YYYY
 */
export function formatDateForDisplay(dateStr: string | null): string {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    return dateStr;
}

/**
 * Verifica se uma data é hoje (comparando com Brasília)
 * @param dateStr - Data em formato YYYY-MM-DD (assumida como data da consulta)
 * @returns true se for hoje em Brasília
 */
export function isToday(dateStr: string): boolean {
    const todayBrasiliaStr = new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIMEZONE
    }).format(new Date());

    // todayBrasiliaStr vem formato DD/MM/YYYY
    const [d, m, y] = todayBrasiliaStr.split('/');
    const todayFormattedInverse = `${y}-${m}-${d}`;

    return dateStr === todayFormattedInverse;
}

/**
 * Verifica se uma data está nesta semana (comparando com Brasília)
 * @param dateStr - Data em formato YYYY-MM-DD
 * @returns true se estiver nos próximos 7 dias
 */
export function isThisWeek(dateStr: string): boolean {
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d); // Objeto Date local (aprox) para comparação numérica simples
    targetDate.setHours(0, 0, 0, 0);

    // Hoje em Brasília
    const todayBrasiliaStr = new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIMEZONE
    }).format(new Date());
    const [dNow, mNow, yNow] = todayBrasiliaStr.split('/');
    const todayDate = new Date(Number(yNow), Number(mNow) - 1, Number(dNow));
    todayDate.setHours(0, 0, 0, 0);

    const nextWeek = new Date(todayDate);
    nextWeek.setDate(todayDate.getDate() + 7);

    return targetDate >= todayDate && targetDate <= nextWeek;
}

/**
 * Verifica se uma data está neste mês (Brasília)
 * @param dateStr - Data em formato YYYY-MM-DD
 * @returns true se for do mês atual
 */
export function isThisMonth(dateStr: string): boolean {
    const todayBrasiliaParts = new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'numeric', timeZone: TIMEZONE
    }).formatToParts(new Date());

    const currentMonth = Number(todayBrasiliaParts.find(p => p.type === 'month')?.value);
    const currentYear = Number(todayBrasiliaParts.find(p => p.type === 'year')?.value);

    const [y, m] = dateStr.split('-').map(Number);

    return m === currentMonth && y === currentYear;
}

/**
 * Calcula o tempo de espera desde uma data de criação
 * @param createdAt - Data em formato ISO
 * @returns String formatada (ex: "5 min", "1h 10min")
 */
export function getTimeWaiting(createdAt: string): string {
    const start = new Date(createdAt).getTime();
    const now = new Date().getTime(); // UTC vs UTC diff is safe
    const diffMins = Math.floor((now - start) / 60000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
