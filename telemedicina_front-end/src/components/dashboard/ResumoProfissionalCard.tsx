"use client";

import { useState, useEffect } from "react";
import { getToken } from "@/lib/auth";
import { updateMyProfile } from "@/lib/axios/perfil";
import { useUserProfile } from "@/hooks/useApiData";
import ContentModal from "@/components/common/Modal/ContentModal";
import FormattedText from "@/components/common/FormattedText";

export default function ResumoProfissionalCard() {
    const { profile, refresh } = useUserProfile();
    const [isEditing, setIsEditing] = useState(false);
    const [resumo, setResumo] = useState("");
    const [loading, setLoading] = useState(false);
    const [showFullContent, setShowFullContent] = useState(false);

    useEffect(() => {
        if (profile?.medico?.resumo_profissional) {
            setResumo(profile.medico.resumo_profissional);
        }
    }, [profile]);

    const handleSave = async () => {
        const token = getToken();
        if (!token) return;

        setLoading(true);
        try {
            await updateMyProfile(token, {
                resumo_profissional: resumo
            });
            await refresh();
            setIsEditing(false);
        } catch (error) {
            console.error("Erro ao salvar resumo profissional:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!profile || profile.tipo_usuario !== "medico") return null;

    return (
        <div className="profile-resumo-wrapper" style={{ marginTop: "2.5rem" }}>
            <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <h4>Resumo Profissional</h4>
            </div>

            <div className="profile-form-grid" style={{ marginTop: "1rem", display: "block" }}>
                {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <textarea
                            className="details-text"
                            style={{
                                width: "100%",
                                minHeight: "180px",
                                resize: "none",
                                fontFamily: "inherit",
                                fontSize: "1rem",
                                lineHeight: "1.6",
                                padding: "1rem",
                                border: "1px solid var(--border-color)",
                                borderRadius: "var(--radius-lg)",
                                backgroundColor: "var(--bg-secondary)",
                                color: "var(--text-primary)"
                            }}
                            placeholder="Escreva um breve resumo sobre sua carreira, especialidades e abordagem..."
                            value={resumo}
                            onChange={(e) => setResumo(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button
                                className="btn-profile secondary"
                                style={{ minWidth: "120px" }}
                                onClick={() => {
                                    setIsEditing(false);
                                    setResumo(profile?.medico?.resumo_profissional || "");
                                }}
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn-profile primary"
                                style={{ minWidth: "120px" }}
                                onClick={handleSave}
                                disabled={loading}
                            >
                                {loading ? "Salvando..." : "Salvar"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div style={{
                            fontSize: "1rem",
                            lineHeight: "1.7",
                            color: resumo ? "var(--text-primary)" : "var(--text-tertiary)",
                            fontStyle: resumo ? "normal" : "italic",
                            whiteSpace: "pre-wrap",
                            backgroundColor: "var(--bg-tertiary)",
                            padding: "1.25rem",
                            borderRadius: "var(--radius-lg)",
                            border: "1px solid var(--border-color)"
                        }}>
                            {resumo ? (
                                <div style={{ position: 'relative' }}>
                                    <FormattedText
                                        text={resumo.length > 200 ? `${resumo.substring(0, 200)}...` : resumo}
                                        style={{
                                            fontSize: "1rem",
                                            lineHeight: "1.7",
                                            color: "var(--text-primary)"
                                        }}
                                    />
                                    {resumo.length > 200 && (
                                        <button
                                            onClick={() => setShowFullContent(true)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--color-primary-500)',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                padding: '0.25rem 0',
                                                fontSize: '0.9rem',
                                                marginTop: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                        >
                                            Ver texto completo
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <span style={{ fontStyle: "italic", color: "var(--text-tertiary)" }}>
                                    Você ainda não definiu um resumo profissional. Clique em 'Editar Resumo' para apresentar-se aos seus pacientes.
                                </span>
                            )}
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button
                                className="btn-profile secondary"
                                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                                onClick={() => setIsEditing(true)}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                Editar Resumo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                Este resumo é exibido publicamente para seus pacientes no seu perfil de atendimento.
            </p>

            <ContentModal
                isOpen={showFullContent}
                onClose={() => setShowFullContent(false)}
                title="Resumo Profissional Completo"
                size="md"
            >
                <div style={{ padding: '0.5rem' }}>
                    <FormattedText
                        text={resumo}
                        style={{
                            fontSize: "1.05rem",
                            lineHeight: "1.8",
                            color: "var(--text-primary)"
                        }}
                    />
                </div>
            </ContentModal>
        </div>
    );
}
