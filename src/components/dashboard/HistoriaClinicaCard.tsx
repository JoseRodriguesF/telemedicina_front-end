"use client";

import { useState, useEffect } from "react";
import { getToken } from "@/lib/auth";
import { updateMyProfile } from "@/lib/axios/perfil";
import { useUserProfile } from "@/hooks/useApiData";
import FormattedText from "@/components/common/FormattedText";

export default function HistoriaClinicaCard() {
    const { profile, refresh } = useUserProfile();
    const [isEditing, setIsEditing] = useState(false);
    const [historia, setHistoria] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile?.paciente?.historia_clinica) {
            setHistoria(profile.paciente.historia_clinica);
        }
    }, [profile]);

    const handleSave = async () => {
        const token = getToken();
        if (!token) return;

        setLoading(true);
        try {
            await updateMyProfile(token, {
                historia_clinica: historia
            });
            await refresh();
            setIsEditing(false);
        } catch (error) {
            console.error("Erro ao salvar história clínica:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!profile || profile.tipo_usuario !== "paciente") return null;

    return (
        <div className="profile-resumo-wrapper" style={{ marginTop: "2.5rem" }}>
            <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14.5 2 14.5 7.5 20 7.5" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
                <h4>História Clínica</h4>
            </div>

            <div className="profile-form-grid" style={{ marginTop: "1rem", display: "block" }}>
                {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <textarea
                            className="details-text"
                            style={{
                                width: "100%",
                                minHeight: "220px",
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
                            placeholder="Sua história clínica será preenchida automaticamente após a triagem, mas você pode ajustá-la aqui se desejar..."
                            value={historia}
                            onChange={(e) => setHistoria(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button
                                className="btn-profile secondary"
                                style={{ minWidth: "120px" }}
                                onClick={() => {
                                    setIsEditing(false);
                                    setHistoria(profile?.paciente?.historia_clinica || "");
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
                            backgroundColor: "var(--bg-tertiary)",
                            padding: "1.25rem",
                            borderRadius: "var(--radius-lg)",
                            border: "1px solid var(--border-color)"
                        }}>
                            {historia ? (
                                <FormattedText
                                    text={historia}
                                    style={{
                                        fontSize: "1rem",
                                        lineHeight: "1.7",
                                        color: "var(--text-primary)"
                                    }}
                                />
                            ) : (
                                <span style={{ fontStyle: "italic", color: "var(--text-tertiary)" }}>
                                    Sua história clínica ainda não foi registrada. Ela será gerada automaticamente após sua primeira triagem com a Angélica.
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
                                Editar História
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                Estas informações ajudam o médico a entender melhor seu histórico de saúde antes mesmo da consulta.
            </p>
        </div>
    );
}
