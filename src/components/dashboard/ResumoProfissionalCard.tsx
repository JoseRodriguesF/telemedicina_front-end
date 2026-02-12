"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getToken } from "@/lib/auth";
import { updateMyProfile, UserProfile } from "@/lib/axios/perfil";
import { useUserProfile } from "@/hooks/useApiData";

export default function ResumoProfissionalCard() {
    const { profile, refresh } = useUserProfile();
    const [isEditing, setIsEditing] = useState(false);
    const [resumo, setResumo] = useState("");
    const [loading, setLoading] = useState(false);

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
        <div className="dash-card tall">
            <div className="dash-card-header">
                <h3>Resumo Profissional</h3>
                <div className="dash-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </div>
            </div>

            <div className="dash-card-body" style={{ marginTop: "0.5rem" }}>
                {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%" }}>
                        <textarea
                            className="details-text"
                            style={{
                                width: "100%",
                                minHeight: "150px",
                                flex: 1,
                                resize: "none",
                                fontFamily: "inherit",
                                fontSize: "0.9rem",
                                padding: "0.75rem",
                                border: "1px solid var(--border-color)",
                                borderRadius: "var(--radius-lg)",
                                backgroundColor: "var(--bg-secondary)",
                                color: "var(--text-primary)"
                            }}
                            placeholder="Escreva um breve resumo sobre sua carreira, especialidades e abordagem..."
                            value={resumo}
                            onChange={(e) => setResumo(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                                className="btn ghost"
                                style={{ flex: 1, padding: "0.5rem" }}
                                onClick={() => {
                                    setIsEditing(false);
                                    setResumo(profile?.medico?.resumo_profissional || "");
                                }}
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn primary"
                                style={{ flex: 1, padding: "0.5rem" }}
                                onClick={handleSave}
                                disabled={loading}
                            >
                                {loading ? "Salvando..." : "Salvar"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        <div style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 8,
                            WebkitBoxOrient: "vertical",
                            fontSize: "0.95rem",
                            lineHeight: "1.6",
                            color: resumo ? "var(--text-primary)" : "var(--text-tertiary)",
                            fontStyle: resumo ? "normal" : "italic"
                        }}>
                            {resumo || "Você ainda não definiu um resumo profissional. Clique em 'Editar Resumo' para apresentar-se aos seus pacientes."}
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{
                                marginTop: "1rem",
                                borderRadius: "var(--radius-lg)",
                                width: "100%",
                                padding: "0.5rem",
                                background: "var(--bg-tertiary)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-color)"
                            }}
                            onClick={() => setIsEditing(true)}
                        >
                            Editar Resumo
                        </button>
                    </div>
                )}
            </div>

            <div className="dash-card-footer" style={{ marginTop: "0.5rem" }}>
                Este resumo aparece no seu perfil para os pacientes.
            </div>
        </div>
    );
}
