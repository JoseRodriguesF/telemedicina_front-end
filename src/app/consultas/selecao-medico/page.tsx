"use client";

import React, { useState, Suspense } from 'react';
import '../../inicio/inicio.css';
import './selecao-medico.css';
import '@/components/layout/Header/header.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

type Doctor = {
    nome: string;
    specialty?: string;
    rating?: number;
    reviews?: number;
    crm?: string;
    description?: string;
    image?: string;
};
        useEffect(() => {
            async function fetchDoctors() {
                setLoading(true);
                try {
                    const token = getToken();
                    const res = await fetch('/api/medicos', {
                        headers: { Authorization: `Bearer ${token}` }
        // mockDoctors removido completamente

    const handleViewDetails = (doc: Doctor) => {
        setSelectedDoctor(doc);
        setIsModalOpen(true);
    };

    return (
        <div className="inicio-page">
            <div className="inicio-mobile-header">
                <MobileHeader />
            </div>
            <Sidebar activeId="consultas" />

            <main className="inicio-main">
                <header className="dashboard-header">
                    <h2>Selecione o Médico</h2>
                    <p>Encontramos esses especialistas disponíveis para {date} às {time}.</p>
                </header>

                <div className="selection-container">
                    <div className="doctors-grid">
                        {/* Aqui você deve implementar a lógica para buscar médicos via API */}
                            <div key={doc.id} className="doctor-card">
                                <div className="doctor-card-top">
                                    <img src={doc.image} alt={doc.name} className="doctor-avatar" />
                                    <div className="doctor-info-basic">
                                        <h3>{doc.name}</h3>
                                        <span className="doctor-specialty">{doc.specialty}</span>
                                        <div className="doctor-rating">
                                            ⭐ {doc.rating} <span>({doc.reviews} avaliações)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="doctor-card-footer">
                                {/* Aqui você deve implementar a lógica para buscar médicos via API */}
                                        className="btn ghost"
                                        style={{ padding: '0.6rem', fontSize: '0.85rem' }}
                                        onClick={() => handleViewDetails(doc)}
                                    >
                                        Ver Detalhes
                                    </button>
                                    <button
                                        className="btn primary"
                                        style={{ padding: '0.6rem', fontSize: '0.85rem' }}
                                        onClick={() => handleSelectDoctor(doc)}
                                    >
                                        Selecionar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modal de Detalhes */}
                {isModalOpen && selectedDoctor && (
                    <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                        <div className="details-modal" onClick={e => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            <div className="modal-header">
                                <img src={selectedDoctor.image} alt={selectedDoctor.name} className="doctor-avatar" style={{ width: '80px', height: '80px' }} />
                                <div className="modal-info">
                                    <h2>{selectedDoctor.name}</h2>
                                    <span className="doctor-specialty" style={{ fontSize: '1rem' }}>{selectedDoctor.specialty}</span>
                                    <p style={{ marginTop: '0.5rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{selectedDoctor.crm}</p>
                                </div>
                            </div>

                            <div className="modal-body">
                                <div className="modal-section">
                                    <h4>Sobre o Profissional</h4>
                                    <p>{selectedDoctor.description}</p>
                                </div>

                                <div className="modal-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <h4>Avaliação</h4>
                                        <div className="doctor-rating" style={{ fontSize: '1.2rem' }}>
                                            ⭐ {selectedDoctor.rating}
                                        </div>
                                    </div>
                                    <div>
                                        <h4>Consultas</h4>
                                        <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{selectedDoctor.reviews}+ atendimentos</p>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    className="btn primary"
                                    style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-xl)' }}
                                    onClick={() => handleSelectDoctor(selectedDoctor)}
                                >
                                    Confirmar Seleção
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function SelecaoMedicoPage() {
    return (
        <Suspense fallback={<div>Carregando especialistas...</div>}>
            <SelecaoMedicoInner />
        </Suspense>
    );
}
