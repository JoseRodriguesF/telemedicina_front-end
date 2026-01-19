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
    try {
        // Se for YYYY-MM-DD, evita problemas de timezone
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-').map(Number);
            return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
        }
        return new Date(dateString).toLocaleDateString('pt-BR');
    } catch (e) {
        return dateString;
    }
}

/**
 * Formata uma hora para HH:mm
 * @param timeString - Hora em formato HH:mm:ss ou ISO completo
 * @returns String formatada HH:mm
 */
export function formatTime(timeString: string): string {
    try {
        if (timeString.includes('T')) {
            // Se for ISO string completa, extrai a hora local
            return new Date(timeString).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        // Se for HH:mm:ss, pega apenas HH:mm
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

    // Se for YYYY-MM-DD, fazer parse direto
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
        // Se já é ISO string completa
        return new Date(horaInicio).getTime();
    }
    // Combinar data YYYY-MM-DD com hora HH:mm:ss
    const dateTimeStr = `${dataConsulta}T${horaInicio}`;
    return new Date(dateTimeStr).getTime();
}

/**
 * Formata data para exibição (DD/MM/YYYY)
 * Converte de YYYY-MM-DD para DD/MM/YYYY
 * @param dateStr - Data em formato YYYY-MM-DD
 * @returns Data formatada DD/MM/YYYY ou string original se inválida
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
 * Verifica se uma data é hoje
 * @param dateStr - Data em formato YYYY-MM-DD
 * @returns true se for hoje
 */
export function isToday(dateStr: string): boolean {
    const today = new Date();
    const date = new Date(dateStr);
    return date.getUTCDate() === today.getDate() &&
        date.getUTCMonth() === today.getUTCMonth() &&
        date.getUTCFullYear() === today.getUTCFullYear();
}

/**
 * Verifica se uma data está nesta semana
 * @param dateStr - Data em formato YYYY-MM-DD
 * @returns true se estiver nos próximos 7 dias
 */
export function isThisWeek(dateStr: string): boolean {
    const date = new Date(dateStr);
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    return date >= today && date <= nextWeek;
}

/**
 * Verifica se uma data está neste mês
 * @param dateStr - Data em formato YYYY-MM-DD
 * @returns true se for do mês atual
 */
export function isThisMonth(dateStr: string): boolean {
    const date = new Date(dateStr);
    const today = new Date();
    return date.getUTCMonth() === today.getUTCMonth() &&
        date.getUTCFullYear() === today.getUTCFullYear();
}
