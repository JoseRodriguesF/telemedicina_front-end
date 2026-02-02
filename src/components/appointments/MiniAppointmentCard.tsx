import { ConsultaAgendada } from '@/lib/axios/consultas';
import { useConsultationTimer } from '@/hooks/useConsultationTimer';
import { getMonthAbbreviation, getDay, formatTime } from '@/lib/utils/dateFormatters';

interface MiniAppointmentCardProps {
    appointment: ConsultaAgendada;
    isMedico: boolean;
    onAttend: (id: number) => void;
    onViewDetails?: (appt: ConsultaAgendada) => void;
}

export function MiniAppointmentCard({ appointment: appt, isMedico, onAttend, onViewDetails }: MiniAppointmentCardProps) {
    const { canJoin, timeRemaining, isToday } = useConsultationTimer(appt.data_consulta, appt.hora_inicio);

    const isSolicitada = appt.status === 'solicitada';
    const effectiveCanJoin = canJoin && !isSolicitada;

    return (
        <div
            className="appointment-mini-card"
            style={{
                opacity: (!effectiveCanJoin && isToday && !isSolicitada) ? 0.9 : 1,
                cursor: 'pointer'
            }}
            onClick={() => onViewDetails?.(appt)}
        >
            <div className="appt-date-box">
                <span className="day">{getDay(appt.data_consulta)}</span>
                <span className="month">{getMonthAbbreviation(appt.data_consulta)}</span>
            </div>
            <div className="appt-details">
                <h4>{isMedico ? appt.paciente.nome_completo.split(' ')[0] : appt.medico.nome_completo.split(' ')[0]}</h4>
                <p>
                    {isMedico ? 'Paciente' : 'Médico'} • {formatTime(appt.hora_inicio)}
                    {!effectiveCanJoin && isToday && !isSolicitada && (
                        <span style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: 'var(--color-primary)',
                            fontWeight: 600,
                            marginTop: '2px'
                        }}>
                            {timeRemaining}
                        </span>
                    )}
                    {isSolicitada && (
                        <span style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: 'var(--color-warning)', // Assumindo var de warning
                            fontWeight: 600,
                            marginTop: '2px'
                        }}>
                            Aguardando confirmação
                        </span>
                    )}
                </p>
                <span
                    className={`badge ${isSolicitada ? 'warning' : 'success'}`}
                    style={{
                        marginTop: '0.5rem',
                        display: 'inline-block',
                        backgroundColor: isSolicitada ? 'var(--color-warning-100, #fef3c7)' : undefined,
                        color: isSolicitada ? 'var(--color-warning-800, #92400e)' : undefined
                    }}
                >
                    {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                </span>
            </div>
        </div>
    );
}
