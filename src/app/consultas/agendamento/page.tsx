"use client";

import React, { useState } from 'react';
import '../../inicio/inicio.css';
import './agendamento.css';
import '@/components/layout/Header/header.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
import { useRouter } from 'next/navigation';

export default function AgendamentoPage() {
    const router = useRouter();
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();

    // Month navigation
    const handlePrevMonth = () => {
        const d = new Date(currentYear, currentMonth - 1, 1);
        setViewDate(d);
    };

    const handleNextMonth = () => {
        const d = new Date(currentYear, currentMonth + 1, 1);
        setViewDate(d);
    };

    // Generate Calendar Grid
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days = [];
    // Padding for first week
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(currentYear, currentMonth, i));
    }

    const isAvailable = (d: Date) => {
        const checkDate = new Date(d);
        checkDate.setHours(0, 0, 0, 0);

        // Example: Only today and future 30 days are available
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + 30);

        return checkDate >= today && checkDate <= maxDate;
    };

    const isSameDay = (d1: Date, d2: Date | null) => {
        if (!d1 || !d2) return false;
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const timeSlots = [
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
        "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
        "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
    ];

    const handleContinue = () => {
        if (selectedDate && selectedTime) {
            // ✅ CORRETO - Formato ISO (YYYY-MM-DD)
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            router.push(`/consultas/pre-consulta?flow=agendamento&date=${dateStr}&time=${selectedTime}`);
        }
    };

    return (
        <div className="inicio-page">
            <div className="inicio-mobile-header">
                <MobileHeader />
            </div>
            <Sidebar activeId="consultas" />

            <main className="inicio-main">
                <header className="dashboard-header">
                    <h2>Agendar Consulta</h2>
                </header>

                <div className="agendamento-container">
                    <div className="scheduling-grid">
                        {/* Calendar Side */}
                        <div className="calendar-card">
                            <div className="calendar-header">
                                <div className="calendar-title-group">
                                    <h3>Selecione o Dia</h3>
                                    <span className="calendar-month-year">
                                        {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="calendar-nav">
                                    <button
                                        className="nav-btn"
                                        title="Anterior"
                                        onClick={handlePrevMonth}
                                        disabled={currentMonth === today.getMonth() && currentYear === today.getFullYear()}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                    </button>
                                    <button className="nav-btn" title="Próximo" onClick={handleNextMonth}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="calendar-grid">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dow => (
                                    <div key={dow} className="dow">{dow}</div>
                                ))}

                                {/* Padding for the first day of the week if needed, but here we show a sequence of 31 days starting from today for simplicity as requested */}
                                {days.map((d, i) => {
                                    if (!d) return <div key={`empty-${i}`} className="day empty"></div>;

                                    const available = isAvailable(d);
                                    return (
                                        <div
                                            key={i}
                                            className={`day ${selectedDate && isSameDay(d, selectedDate) ? 'selected' : ''} ${isSameDay(d, today) ? 'today' : ''} ${!available ? 'disabled' : ''}`}
                                            onClick={() => available && setSelectedDate(d)}
                                        >
                                            {d.getDate()}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Slots Side */}
                        <div className="slots-card">
                            <div className="slots-header">
                                <h4>Horários Disponíveis</h4>
                                <p>{selectedDate ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecione uma data'}</p>
                            </div>

                            <div className="slots-grid">
                                {timeSlots.map(time => (
                                    <div
                                        key={time}
                                        className={`slot ${selectedTime === time ? 'selected' : ''}`}
                                        onClick={() => setSelectedTime(time)}
                                    >
                                        {time}
                                    </div>
                                ))}
                            </div>

                            <div className="confirm-section">
                                <button
                                    className={`btn primary confirm-btn`}
                                    disabled={!selectedDate || !selectedTime}
                                    onClick={handleContinue}
                                >
                                    Continuar para Triagem
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
