import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Hook para debounce de valores
 * Útil para campos de busca que fazem requisições à API
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Hook para throttle de funções
 * Útil para limitar a frequência de chamadas de API
 */
export function useThrottle<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 1000
): T {
    const lastRun = useRef(Date.now());

    return useCallback(
        ((...args) => {
            const now = Date.now();
            if (now - lastRun.current >= delay) {
                lastRun.current = now;
                return callback(...args);
            }
        }) as T,
        [callback, delay]
    );
}

/**
 * Hook para gerenciar estado de loading de múltiplas requisições
 */
export function useLoadingState() {
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    const setLoading = useCallback((key: string, isLoading: boolean) => {
        setLoadingStates(prev => ({ ...prev, [key]: isLoading }));
    }, []);

    const isAnyLoading = Object.values(loadingStates).some(Boolean);

    return {
        loadingStates,
        setLoading,
        isAnyLoading
    };
}
