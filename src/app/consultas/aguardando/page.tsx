"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { getConsulta, cancelarConsulta } from '@/lib/axios/consultas';
import { Modal } from '@/components/common/Modal/Modal';
import { useModal } from '@/components/common/Modal/useModal';
import './aguardando.css';

/**
 * Tela de espera para o Pronto Atendimento.
 * O paciente fica nesta tela enquanto aguarda um médico aceitar o chamado.
 */
function AguardandoInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const consultaId = searchParams.get('id');
    const modal = useModal();
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            router.push('/login');
            return;
        }

        if (!consultaId) {
            router.push('/consultas');
            return;
        }

        const checkStatus = async () => {
            try {
                const data = await getConsulta(consultaId, token);

                // Se a consulta já tiver um médico atribuído, redireciona para a sala de atendimento
                if (data.medicoId) {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    router.push(`/consultas/atendimento?id=${consultaId}`);
                }

                // Se a consulta foi concluída ou cancelada no backend
                if (data.status === 'cancelled' || data.status === 'finished') {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    modal.warning(
                        'Consulta Encerrada',
                        'Esta solicitação de consulta não está mais ativa.',
                        () => router.push('/consultas')
                    );
                }
            } catch (err) {
                console.error('[Aguardando] Erro ao verificar status:', err);
            }
        };

        // Inicia o polling (a cada 3 segundos)
        checkStatus();
        pollingRef.current = setInterval(checkStatus, 3000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [consultaId, router, modal]);

    const handleCancel = () => {
        modal.confirm(
            'Cancelar Solicitação',
            'Deseja cancelar a busca por um médico? Você sairá da fila de espera.',
            async () => {
                try {
                    setIsCancelling(true);
                    const token = getToken();
                    if (token && consultaId) {
                        await cancelarConsulta(Number(consultaId), token);
                        router.push('/consultas');
                    }
                } catch (err) {
                    console.error('[Aguardando] Erro ao cancelar:', err);
                    modal.error('Erro', 'Não foi possível cancelar sua solicitação no momento. Tente novamente.');
                } finally {
                    setIsCancelling(false);
                }
            }
        );
    };

    return (
        <div className="waiting-page">
            <div className="waiting-content">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <div className="loading-pulse"></div>
                </div>

                <div className="waiting-text">
                    <h2>Buscando um Médico...</h2>
                    <p>
                        Estamos conectando você ao próximo clínico geral disponível.
                        Por favor, não feche esta página.
                    </p>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                        Sua triagem foi concluída com sucesso!
                    </p>
                </div>

                <button
                    className="btn-cancel-search"
                    onClick={handleCancel}
                    disabled={isCancelling}
                >
                    {isCancelling ? 'Cancelando...' : 'Cancelar Busca'}
                </button>
            </div>

            <Modal
                isOpen={modal.isOpen}
                config={modal.config}
                onConfirm={modal.onConfirm}
                onCancel={modal.onCancel}
            />
        </div>
    );
}

export default function AguardandoPage() {
    return (
        <Suspense fallback={
            <div className="waiting-page">
                <div className="loading-spinner"></div>
            </div>
        }>
            <AguardandoInner />
        </Suspense>
    );
}
