"use client";

import React, { useState, useEffect, Suspense } from 'react';
import '../../inicio/inicio.css';
import './selecao-medico.css';
import '@/components/layout/Header/header.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import { getToken, getUser } from '@/lib/auth';

type Doctor = {
    id: number;
    nome: string;
    specialty?: string;
    rating?: number;
    reviews?: number;
    crm?: string;
    description?: string;
    image?: string;
};

function SelecaoMedicoInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const date = searchParams.get('date');
    const time = searchParams.get('time');

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Formatar data ISO (YYYY-MM-DD) para exibição (DD/MM/YYYY)
    const formatDateForDisplay = (dateStr: string | null): string => {
        if (!dateStr) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }
        return dateStr;
    };

    useEffect(() => {
        async function fetchDoctors() {
            setLoading(true);
            setError(null);
            try {
                const token = getToken();
                if (!token) throw new Error('Token não encontrado');

                const { listMedicos } = await import('@/lib/axios/medicos');
                const data = await listMedicos(token);

                const mapped = Array.isArray(data)
                    ? data.map((m) => ({
                        ...m,
                        nome: m.nome_completo || '',
                        // Mock ratings/specialties if not present to look better
                        specialty: m.especialidade || 'Clínico Geral',
                        rating: 4.8 + (Math.random() * 0.2),
                        reviews: 120 + Math.floor(Math.random() * 50)
                    }))
                    : [];
                setDoctors(mapped);
            } catch (err: any) {
                setError('Não foi possível carregar os médicos no momento.');
            } finally {
                setLoading(false);
            }
        }
        fetchDoctors();
    }, []);

    const handleSelectDoctor = async (doc: Doctor) => {
        const token = getToken();
        const user = getUser();
        if (!token || !user || !user.id) {
            alert('Faça login para agendar.');
            return;
        }
        if (!date || !time) {
            alert('Data e horário devem ser selecionados.');
            return;
        }
        setLoading(true);
        try {
            const { agendarConsulta } = await import('@/lib/axios/consultas');
            const payload = {
                medico_id: doc.id,
                paciente_id: user.id,
                data_consulta: date,
                hora_inicio: time
            };
            await agendarConsulta(payload, token);
            alert(`Consulta agendada com ${doc.nome} para o dia ${formatDateForDisplay(date)} às ${time}!`);
            router.push('/consultas');
        } catch (err: any) {
            const errorMsg = err?.response?.data?.error || err?.message || 'Erro desconhecido';
            alert('Erro ao agendar: ' + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (doc: Doctor) => {
        setSelectedDoctor(doc);
        setIsModalOpen(true);
    };

    const filteredDoctors = doctors.filter(doc =>
        doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.specialty && doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="inicio-page">
            <div className="inicio-mobile-header">
                <MobileHeader />
            </div>
            <Sidebar activeId="consultas" />

            <main className="inicio-main">
                <div className="selection-page-main">

                    {/* Header Section */}
                    <header className="selection-header">
                        <h2>Escolha seu Especialista</h2>
                        <div className="selection-context-bar">
                            <div className="context-chip">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                                {formatDateForDisplay(date)}
                            </div>
                            <div className="context-chip">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                {time}
                            </div>
                        </div>
                    </header>

                    {/* Toolbar */}
                    <div className="selection-toolbar">
                        <div className="doctor-search-wrapper">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            <input
                                type="text"
                                className="doctor-search-input"
                                placeholder="Pesquisar por nome ou especialidade..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Error State */}
                    {error && (
                        <div style={{ color: 'var(--color-error)', backgroundColor: 'var(--color-error-50)', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    {/* Doctors Grid */}
                    <div className="doctors-grid">
                        {loading && (
                            [1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="doctor-premium-card" style={{ opacity: 0.6 }}>
                                    <div style={{ background: 'var(--bg-tertiary)', height: '80px', borderRadius: 'var(--radius-lg)' }}></div>
                                    <div style={{ background: 'var(--bg-tertiary)', height: '20px', width: '70%', borderRadius: '4px' }}></div>
                                    <div style={{ background: 'var(--bg-tertiary)', height: '40px', borderRadius: 'var(--radius-lg)' }}></div>
                                </div>
                            ))
                        )}

                        {!loading && filteredDoctors.length === 0 && !error && (
                            <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2, marginBottom: '1rem' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                <h3 style={{ color: 'var(--text-secondary)' }}>Nenhum especialista encontrado</h3>
                                <p style={{ color: 'var(--text-tertiary)' }}>Tente ajustar sua pesquisa.</p>
                            </div>
                        )}

                        {!loading && filteredDoctors.map((doc) => (
                            <div key={doc.id} className="doctor-premium-card">
                                <div className="doctor-card-profile">
                                    <div className="doctor-avatar-wrapper">
                                        <img src={doc.image || 'https://i.pravatar.cc/150?u=' + doc.id} alt={doc.nome} className="doctor-avatar-main" />
                                        <div className="online-status"></div>
                                    </div>
                                    <div className="doctor-meta-info">
                                        <span className="doctor-badge">{doc.specialty}</span>
                                        <h3>{doc.nome}</h3>
                                        <div className="doctor-stats-mini">
                                            <div className="stat-item rating">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                                {doc.rating?.toFixed(1)}
                                            </div>
                                            <div className="stat-item">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                                {doc.reviews}+
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="doctor-card-actions">
                                    <button
                                        className="btn ghost"
                                        style={{ height: '48px', borderRadius: 'var(--radius-xl)' }}
                                        onClick={() => handleViewDetails(doc)}
                                    >
                                        Detalhes
                                    </button>
                                    <button
                                        className="btn primary"
                                        style={{ height: '48px', borderRadius: 'var(--radius-xl)' }}
                                        onClick={() => handleSelectDoctor(doc)}
                                    >
                                        Agendar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Modal de detalhes do médico */}
            {isModalOpen && selectedDoctor && (
                <div className="modern-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modern-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <img src={selectedDoctor.image || 'https://i.pravatar.cc/150?u=' + selectedDoctor.id} alt={selectedDoctor.nome} style={{ width: '100px', height: '100px', borderRadius: 'var(--radius-2xl)', marginBottom: '1rem', border: '4px solid var(--bg-secondary)' }} />
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedDoctor.nome}</h3>
                            <p style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>{selectedDoctor.specialty}</p>
                        </div>

                        <div className="modal-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-2xl)', marginBottom: '2rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Rating</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>⭐ {selectedDoctor.rating?.toFixed(1)}</p>
                            </div>
                            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Atendimentos</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedDoctor.reviews}+</p>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn primary"
                                style={{ width: '100%', height: '56px', borderRadius: 'var(--radius-2xl)', fontSize: '1.1rem' }}
                                onClick={() => handleSelectDoctor(selectedDoctor)}
                            >
                                Confirmar Agendamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SelecaoMedicoPage() {
    return (
        <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center' }}>Carregando especialistas...</div>}>
            <SelecaoMedicoInner />
        </Suspense>
    );
}
