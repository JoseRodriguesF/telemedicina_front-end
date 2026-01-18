
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
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchDoctors() {
            setLoading(true);
            try {
                const token = getToken();
                const res = await fetch('/api/medicos', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Erro ao buscar médicos');
                const data = await res.json();
                setDoctors(data);
            } catch (err) {
                setDoctors([]);
            } finally {
                setLoading(false);
            }
        }
        fetchDoctors();
    }, []);

    const handleSelectDoctor = async (doc: Doctor) => {
        const token = getToken();
        const user = getUser();
        if (!token || !user) {
            alert('Faça login para agendar.');
            return;
        }
        setLoading(true);
        try {
            const body = {
                medico_id: doc.id,
                paciente_id: user.id,
                data_consulta: date,
                hora_inicio: time
            };
            const res = await fetch('/api/consultas/agendar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const err = await res.text();
                throw new Error(err || 'Erro ao agendar consulta');
            }
            const data = await res.json();
            alert(`Consulta agendada com ${doc.nome} para o dia ${date} às ${time}!`);
            router.push('/consultas');
        } catch (err: any) {
            alert('Erro ao agendar: ' + (err?.message || ''));
        } finally {
            setLoading(false);
        }
    };

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
                                    <img src={doc.image || 'https://i.pravatar.cc/150?u=' + doc.id} alt={doc.nome} className="doctor-avatar" />
                                    <div className="doctor-info-basic">
                                        <h3>{doc.nome}</h3>
                                        <span className="doctor-specialty">{doc.specialty || ''}</span>
                                        {doc.rating && (
                                            <div className="doctor-rating">
                                                ⭐ {doc.rating} <span>({doc.reviews || 0} avaliações)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="doctor-card-footer">
                                    <button
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
