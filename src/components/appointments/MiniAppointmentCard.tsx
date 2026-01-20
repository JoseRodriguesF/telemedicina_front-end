import { ConsultaAgendada } from '@/lib/axios/consultas';
import { useConsultationTimer } from '@/hooks/useConsultationTimer';

interface MiniAppointmentCardProps {
    appointment: ConsultaAgendada;
    isMedico: boolean;
    onAttend: (id: number) => void;
}

export function MiniAppointmentCard({ appointment: appt, isMedico, onAttend }: MiniAppointmentCardProps) {
    const { canJoin, timeRemaining, isToday } = useConsultationTimer(appt.data_consulta, appt.hora_inicio);

    const getMonthAbbreviation = (dateStr: string) => {
        const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [, month] = dateStr.split('-');
            return months[parseInt(month) - 1];
        }
        const date = new Date(dateStr);
        return months[date.getMonth()];
    };

    const getDay = (dateStr: string) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [, , day] = dateStr.split('-');
            return day;
        }
        const date = new Date(dateStr);
        return String(date.getDate()).padStart(2, '0');
    };

    const formatTime = (timeString: string) => {
        try {
            if (timeString.includes('T')) {
                return new Date(timeString).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            return timeString.substring(0, 5);
        } catch (e) {
            return timeString;
        }
    };

    return (
        <div className="appointment-mini-card" style={{ opacity: (!canJoin && isToday) ? 0.9 : 1 }}>
            <div className="appt-date-box">
                <span className="day">{getDay(appt.data_consulta)}</span>
                <span className="month">{getMonthAbbreviation(appt.data_consulta)}</span>
            </div>
            <div className="appt-details">
                <h4>{isMedico ? appt.paciente.nome_completo : appt.medico.nome_completo}</h4>
                <p>
                    {isMedico ? 'Paciente' : 'Médico'} • {formatTime(appt.hora_inicio)}
                    {!canJoin && isToday && (
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
                </p>
                <span className="badge success" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                    {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                </span>
            </div>
            <button
                className={`btn ${canJoin ? 'primary' : 'ghost'}`}
                style={{
                    fontSize: canJoin ? '0.9rem' : '1.2rem',
                    padding: canJoin ? '0.5rem 1rem' : '0.5rem',
                    minWidth: canJoin ? '80px' : 'auto'
                }}
                onClick={() => onAttend(appt.id)}
                disabled={!canJoin}
                title={!canJoin ? timeRemaining : 'Entrar na sala'}
            >
                {canJoin ? 'Entrar' : '→'}
            </button>
        </div>
    );
}
