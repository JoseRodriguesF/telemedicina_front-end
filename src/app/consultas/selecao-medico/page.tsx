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
