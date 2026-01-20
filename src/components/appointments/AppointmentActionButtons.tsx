import { ConsultaStatus } from '@/lib/axios/consultas';
import { useConsultationTimer } from '@/hooks/useConsultationTimer';

interface AppointmentActionButtonsProps {
    id: number;
    data: string;
    hora: string;
    status: ConsultaStatus | string; // Relaxing type slightly to avoid strict import issues if types differ
    pacienteNome: string;
    isConfirming: boolean;
    onConfirm: (id: number) => void;
    onCancel: (id: number, nome: string) => void;
    onAttend: (id: number) => void;
}

export function AppointmentActionButtons({
    id,
    data,
    hora,
    status,
    pacienteNome,
    isConfirming,
    onConfirm,
    onCancel,
    onAttend
}: AppointmentActionButtonsProps) {
    const { canJoin, timeRemaining } = useConsultationTimer(data, hora);

    return (
        <div className="history-item-actions" style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
            {status === 'solicitada' && (
                <button
                    className="btn primary"
                    style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}
                    onClick={() => onConfirm(id)}
                    disabled={isConfirming}
                >
                    {isConfirming ? 'Confirmando...' : 'Confirmar'}
                </button>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <button
                        className={`btn ${status === 'solicitada' ? 'ghost' : 'primary'}`}
                        style={{
                            padding: '0.4rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.9rem',
                            width: '100%',
                            opacity: (status === 'solicitada' || !canJoin) ? 0.6 : 1,
                            cursor: (status === 'solicitada' || !canJoin) ? 'not-allowed' : 'pointer'
                        }}
                        onClick={() => onAttend(id)}
                        disabled={status === 'solicitada' || !canJoin}
                    >
                        Atender
                    </button>
                    {status === 'agendada' && !canJoin && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '0.2rem' }}>
                            {timeRemaining}
                        </span>
                    )}
                </div>

                <button
                    className="btn ghost"
                    style={{
                        padding: '0.4rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9rem',
                        color: 'var(--color-error)',
                        borderColor: 'var(--color-error)'
                    }}
                    onClick={() => onCancel(id, pacienteNome)}
                    disabled={isConfirming}
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
