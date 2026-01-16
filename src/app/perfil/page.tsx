"use client";

import '../inicio/inicio.css';
import './perfil.css';
import '@/components/layout/Header/header.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
import { getUser, getUserFirstName, getUserDisplayName } from '@/lib/auth';

export default function PerfilPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [type, setType] = useState<string>('');

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
    setFullName(getUserDisplayName(u));
    setEmail(u?.email || '');
    setType(u?.tipo_usuario || 'Paciente');
  }, []);

  return (
    <div className="inicio-page">
      <div className="inicio-mobile-header">
        <MobileHeader />
      </div>
      <Sidebar activeId="perfil" />

      <main className="inicio-main">
        <header className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
          <h2>Perfil do Usuário</h2>
          <p>Mantenha seus dados atualizados para uma melhor experiência.</p>
        </header>

        <div className="perfil-container">
          {/* Profile Hero Card */}
          <section className="profile-hero-card">
            <div className="avatar-wrapper">
              <div className="profile-avatar">
                {displayName ? displayName[0] : 'U'}
              </div>
              <button className="edit-avatar-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
            </div>

            <div className="profile-info-main">
              <h3>{fullName}</h3>
              <p className="profile-email">{email}</p>
              <div className="profile-badges">
                <span className="profile-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Conta {type} Verificada
                </span>
                <span className="profile-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  Ativo
                </span>
              </div>
            </div>

            <div className="profile-hero-actions">
              <button className="btn-profile primary">Salvar Alterações</button>
            </div>
          </section>

          <div className="profile-content-grid">
            {/* Detailed Info */}
            <section className="profile-section-card">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <h4>Dados Cadastrais</h4>
              </div>

              <div className="profile-form-grid">
                <div className="field-group">
                  <label>Nome Completo</label>
                  <div className="field-value">{fullName}</div>
                </div>
                <div className="field-group">
                  <label>E-mail Principal</label>
                  <div className="field-value">{email}</div>
                </div>
                <div className="field-group">
                  <label>Telefone / WhatsApp</label>
                  <div className="field-value">(11) 99999-9999</div>
                </div>
                <div className="field-group">
                  <label>Data de Nascimento</label>
                  <div className="field-value">01/01/1990</div>
                </div>
              </div>

              <div className="profile-actions">
                <button className="btn-profile secondary">Editar Dados</button>
                <button className="btn-profile secondary">Alterar Senha</button>
              </div>
            </section>

            {/* Settings & Security */}
            <aside className="profile-section-card">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <h4>Segurança</h4>
              </div>

              <div className="settings-list">
                <div className="setting-item">
                  <div className="setting-label">
                    <span className="setting-title">Autenticação 2FA</span>
                    <span className="setting-desc">Mais segurança no seu login</span>
                  </div>
                  <button className="btn-profile secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>Ativar</button>
                </div>

                <div className="setting-item">
                  <div className="setting-label">
                    <span className="setting-title">Notificações</span>
                    <span className="setting-desc">Alertas de consultas via SMS</span>
                  </div>
                  <label className="switch">
                    <input type="checkbox" defaultChecked />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-label">
                    <span className="setting-title">Marketing</span>
                    <span className="setting-desc">Receber novidades por e-mail</span>
                  </div>
                  <label className="switch">
                    <input type="checkbox" />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '2rem', padding: '1rem', background: '#fee2e2', borderRadius: 'var(--radius-lg)', border: '1px solid #fecaca' }}>
                <h5 style={{ color: '#991b1b', margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Zona de Perigo</h5>
                <p style={{ color: '#b91c1c', fontSize: '0.8rem', margin: '0.5rem 0' }}>A exclusão da conta é permanente e não pode ser desfeita.</p>
                <button style={{ color: '#dc2626', background: 'none', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>Excluir minha conta</button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <style jsx>{`
        /* Minimal switch styling within JSX for simplicity or transfer to CSS if preferred */
        .switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 22px;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--border-color);
          transition: .4s;
          border-radius: 34px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider { background-color: var(--color-primary-500); }
        input:checked + .slider:before { transform: translateX(18px); }
      `}</style>
    </div>
  );
}

