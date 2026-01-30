/**
 * Utilitários de formatação de data e hora
 * Centraliza todas as funções de formatação para evitar duplicação
 */

/**
 * Formata uma data no formato DD/MM/YYYY
 * @param dateString - Data em formato ISO (YYYY-MM-DD) ou ISO completo
 * @returns String formatada DD/MM/YYYY
 */
export function formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
        // Se for YYYY-MM-DD, evita problemas de timezone tratando como local
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-').map(Number);
            return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
        }
        // Se for ISO completo ou outro formato, converte para local do dispositivo
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        return dateString;
    }
}

/**
 * Formata uma hora para HH:mm local
 * @param timeString - Hora em formato HH:mm:ss ou ISO completo
 * @returns String formatada HH:mm (fuso horário local)
 */
export function formatTime(timeString: string | null | undefined): string {
    if (!timeString) return '';
    try {
        if (timeString.includes('T')) {
            // Se for ISO string completa (ex: 2026-01-30T13:00:00Z), 
            // extrai a hora local do dispositivo (ex: 10:00 se GMT-3)
            return new Date(timeString).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        // Se for HH:mm:ss sem T, assume que já é o valor que se deseja mostrar
        return timeString.substring(0, 5);
    } catch (e) {
        return timeString;
    }
}

/**
 * Obtém abreviação do mês (JAN, FEV, etc)
 * @param dateStr - Data em formato YYYY-MM-DD ou ISO completo
 * @returns Abreviação do mês em maiúsculas
 */
export function getMonthAbbreviation(dateStr: string): string {
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

    // Se for YYYY-MM-DD, fazer parse direto como local
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [, month] = dateStr.split('-');
        return months[parseInt(month) - 1];
    }

    const date = new Date(dateStr);
    return months[date.getMonth()];
}

/**
 * Obtém o dia do mês (com zero à esquerda)
 * @param dateStr - Data em formato YYYY-MM-DD ou ISO completo
 * @returns Dia formatado com 2 dígitos (ex: "05", "23")
 */
export function getDay(dateStr: string): string {
    // Se for YYYY-MM-DD, fazer parse direto
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [, , day] = dateStr.split('-');
        return day;
    }

    const date = new Date(dateStr);
    return String(date.getDate()).padStart(2, '0');
}

/**
 * Calcula timestamp de uma consulta
 * @param dataConsulta - Data em formato YYYY-MM-DD
 * @param horaInicio - Hora em formato HH:mm:ss ou ISO completo
 * @returns Timestamp em milissegundos
 */
export function getConsultaTimestamp(dataConsulta: string, horaInicio: string): number {
    if (horaInicio.includes('T')) {
        return new Date(horaInicio).getTime();
    }
    // Combinar data YYYY-MM-DD com hora HH:mm:ss e tratar como local
    const [y, m, d] = dataConsulta.split('-').map(Number);
    const [hh, mm, ss] = (horaInicio || '00:00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, ss || 0).getTime();
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
 * Verifica se uma data é hoje (comparando com o calendário local do dispositivo)
 * @param dateStr - Data em formato YYYY-MM-DD
 * @returns true se for hoje
 */
export function isToday(dateStr: string): boolean {
    const today = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);

    return d === today.getDate() &&
        (m - 1) === today.getMonth() &&
        y === today.getFullYear();
}

/**
 * Verifica se uma data está nesta semana (próximos 7 dias)
 * @param dateStr - Data em formato YYYY-MM-DD
 * @returns true se estiver nos próximos 7 dias
 */
export function isThisWeek(dateStr: string): boolean {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return date >= today && date <= nextWeek;
}

/**
 * Verifica se uma data está neste mês
 * @param dateStr - Data em formato YYYY-MM-DD
 * @returns true se for do mês atual
 */
export function isThisMonth(dateStr: string): boolean {
    const today = new Date();
    const [y, m] = dateStr.split('-').map(Number);

    return (m - 1) === today.getMonth() &&
        y === today.getFullYear();
}
