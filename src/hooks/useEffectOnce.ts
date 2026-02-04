import { useEffect, useRef, EffectCallback } from 'react';

/**
 * Hook que executa um efeito apenas uma vez no ciclo de vida do componente,
 * prevenindo dupla execução causada pelo React StrictMode em desenvolvimento.
 */
export function useEffectOnce(effect: EffectCallback) {
    const hasRunRef = useRef(false);
    const effectRef = useRef(effect);

    // Mantém a referência do efeito atualizada
    useEffect(() => {
        effectRef.current = effect;
    });

    useEffect(() => {
        // Se já executou, ignora
        if (hasRunRef.current) return;

        hasRunRef.current = true;

        // Executa o efeito e armazena a função de limpeza (cleanup)
        const cleanup = effectRef.current();

        return () => {
            if (cleanup) cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
