import useSWR from 'swr';
import { getToken } from '@/lib/auth';
import {
    getConsultasAgendadas,
    psGetFullHistory,
    psListActiveRooms,
    ConsultaAgendada,
    PSFullHistoryItem,
    PSActiveRoom
} from '@/lib/axios/consultas';
import { getMyProfile, UserProfile } from '@/lib/axios/perfil';

/**
 * Hook otimizado para buscar consultas agendadas com cache automático
 */
export function useConsultasAgendadas() {
    const token = getToken();

    const { data, error, isLoading, mutate } = useSWR<ConsultaAgendada[]>(
        token ? '/api/consultas/agendadas' : null,
        () => token ? getConsultasAgendadas(token) : Promise.resolve([]),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 30000, // 30 segundos de cache
        }
    );

    return {
        consultas: data || [],
        isLoading,
        error,
        refresh: mutate
    };
}

/**
 * Hook otimizado para buscar histórico completo
 */
export function useHistoricoCompleto() {
    const token = getToken();

    const { data, error, isLoading, mutate } = useSWR<PSFullHistoryItem[]>(
        token ? '/api/ps/historico-completo' : null,
        () => token ? psGetFullHistory(token) : Promise.resolve([]),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minuto de cache (histórico muda menos)
        }
    );

    return {
        historico: data || [],
        isLoading,
        error,
        refresh: mutate
    };
}

/**
 * Hook otimizado para buscar salas ativas
 */
export function useSalasAtivas(userId?: string) {
    const token = getToken();

    const { data, error, isLoading, mutate } = useSWR<PSActiveRoom[]>(
        token && userId ? `/api/ps/salas-em-andamento?userId=${userId}` : null,
        () => token && userId ? psListActiveRooms(token, userId) : Promise.resolve([]),
        {
            refreshInterval: 10000, // Atualiza a cada 10 segundos (salas ativas mudam frequentemente)
            revalidateOnFocus: true,
        }
    );

    return {
        salas: data || [],
        isLoading,
        error,
        refresh: mutate
    };
}

/**
 * Hook otimizado para buscar perfil do usuário
 */
export function useUserProfile() {
    const token = getToken();

    const { data, error, isLoading, mutate } = useSWR<UserProfile>(
        token ? '/api/usuarios/me' : null,
        () => token ? getMyProfile(token) : Promise.reject('No token'),
        {
            revalidateOnFocus: false,
            dedupingInterval: 120000, // 2 minutos de cache (perfil muda raramente)
        }
    );

    return {
        profile: data,
        isLoading,
        error,
        refresh: mutate
    };
}
