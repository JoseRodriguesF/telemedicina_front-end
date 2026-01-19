
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

    // Função para formatar data ISO (YYYY-MM-DD) para exibição (DD/MM/YYYY)
    const formatDateForDisplay = (dateStr: string | null): string => {
        if (!dateStr) return '';

        // Se estiver em formato ISO (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }

        // Se já estiver em outro formato, retorna como está
        return dateStr;
    };

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        async function fetchDoctors() {
            setLoading(true);
            setError(null);
            try {
                const token = getToken();
                if (!token) {
                    throw new Error('Token não encontrado');
                }
                const { listMedicos } = await import('@/lib/axios/medicos');
                const data = await listMedicos(token);
                // Mapear nome_completo para nome
                const mapped = Array.isArray(data)
                    ? data.map((m) => ({
                        ...m,
                        nome: m.nome_completo || '',
                    }))
                    : [];
                setDoctors(mapped);
            } catch (err: any) {
                setDoctors([]);
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

    return (
        <div className="inicio-page">
            <div className="selection-container">
                {error && (
                    <div style={{ color: 'var(--color-error)', marginBottom: 16, textAlign: 'center' }}>{error}</div>
                )}
                <div className="doctors-grid">
                    {loading && <div style={{ textAlign: 'center', width: '100%' }}>Carregando médicos...</div>}
                    {!loading && doctors.length === 0 && !error && (
                        <div style={{ textAlign: 'center', width: '100%' }}>Nenhum médico disponível.</div>
                    )}
                    {doctors.map((doc) => (
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
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de detalhes do médico */}
            {isModalOpen && selectedDoctor && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: '2rem', minWidth: 320, maxWidth: 400 }}>
                        <button style={{ float: 'right', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>&times;</button>
                        <h3>{selectedDoctor.nome}</h3>
                        <div className="modal-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 16 }}>
                            <div>
                                <h4>Avaliação</h4>
                                <div className="doctor-rating" style={{ fontSize: '1.2rem' }}>
                                    ⭐ {selectedDoctor.rating ?? '-'}
                                </div>
                            </div>
                            <div>
                                <h4>Consultas</h4>
                                <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{selectedDoctor.reviews ?? 0}+ atendimentos</p>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ marginTop: 24 }}>
                            <button
                                className="btn primary"
                                style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-xl)' }}
                                onClick={() => handleSelectDoctor(selectedDoctor)}
                                disabled={!selectedDoctor}
                            >
                                Confirmar Seleção
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
        <Suspense fallback={<div>Carregando especialistas...</div>}>
            <SelecaoMedicoInner />
        </Suspense>
    );
}
