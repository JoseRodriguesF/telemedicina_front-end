"use client";

import '../inicio/inicio.css';
import './perfil.css';
import '@/components/layout/Header/header.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
import { getToken } from '@/lib/auth';
import { getMyProfile, updateMyProfile, UserProfile } from '@/lib/axios/perfil';
import { Modal } from '@/components/common/Modal/Modal';
import { useModal } from '@/components/common/Modal/useModal';
import { formatDate } from '@/lib/utils/dateFormatters';

export default function PerfilPage() {
  const router = useRouter();
  const modal = useModal();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // States for Editing
  const [editData, setEditData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }
      const data = await getMyProfile(token);
      setProfile(data);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = () => {
    if (!profile) return;
    const commonData = (profile.paciente || profile.medico || {}) as any;
    const addr = profile.enderecos && profile.enderecos.length > 0 ? profile.enderecos[0] : { endereco: '', numero: '', complemento: '' };

    setEditData({
      nome_completo: commonData.nome_completo || '',
      email: profile.email || '',
      telefone: (commonData as any).telefone || '',
      data_nascimento: (commonData as any).data_nascimento ? (commonData as any).data_nascimento.split('T')[0] : '',
      sexo: (commonData as any).sexo || '',
      crm: (commonData as any).crm || '',
      endereco: {
        endereco: addr.endereco || '',
        numero: addr.numero || '',
        complemento: addr.complemento || ''
      }
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const token = getToken();
      if (!token) return;

      await updateMyProfile(token, editData);
      modal.success('Sucesso', 'Perfil atualizado com sucesso!');
      await fetchProfile();
      setIsEditing(false);
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      modal.error('Erro', 'Não foi possível atualizar o perfil. ' + (error?.message || ''));
    }
  };

  if (loading) {
    return (
      <div className="inicio-page">
        <Sidebar activeId="perfil" />
        <main className="inicio-main">
          <header className="dashboard-header">
            <h2>Carregando Perfil...</h2>
          </header>
        </main>
      </div>
    );
  }

  const userData = (profile?.paciente || profile?.medico || {}) as any;
  const addresses = profile?.enderecos || [];
  const mainAddress = addresses[0] || null;

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
                {userData.nome_completo ? userData.nome_completo[0] : (profile?.email ? profile.email[0].toUpperCase() : 'U')}
              </div>
            </div>

            <div className="profile-info-main">
              <h3>{userData.nome_completo || 'Usuário'}</h3>
              <p className="profile-email">{profile?.email}</p>
              <div className="profile-badges">
                <span className="profile-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Conta {profile?.tipo_usuario === 'medico' ? 'Médica' : 'Paciente'} Verificada
                </span>
                <span className="profile-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  Ativo
                </span>
              </div>
            </div>

            <div className="profile-hero-actions">
              <button className="btn-profile primary" onClick={handleEditOpen}>Editar Perfil</button>
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
                {profile?.tipo_usuario === 'medico' && (
                  <div className="field-group">
                    <label>CRM</label>
                    <div className="field-value">{(userData as any).crm || '-'}</div>
                  </div>
                )}
                <div className="field-group">
                  <label>Telefone / WhatsApp</label>
                  <div className="field-value">{(userData as any).telefone || '-'}</div>
                </div>
                <div className="field-group">
                  <label>Data de Nascimento</label>
                  <div className="field-value">{(userData as any).data_nascimento ? formatDate((userData as any).data_nascimento) : '-'}</div>
                </div>
                <div className="field-group">
                  <label>Sexo</label>
                  <div className="field-value">{(userData as any).sexo || '-'}</div>
                </div>
                {profile?.tipo_usuario === 'paciente' && (
                  <div className="field-group">
                    <label>Estado Civil</label>
                    <div className="field-value">{(userData as any).estado_civil || '-'}</div>
                  </div>
                )}
                <div className="field-group">
                  <label>CPF</label>
                  <div className="field-value">{(userData as any).cpf || '-'}</div>
                </div>
              </div>

              <div className="section-header" style={{ marginTop: '2.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                <h4>Endereço</h4>
              </div>

              <div className="profile-form-grid">
                <div className="field-group" style={{ gridColumn: 'span 2' }}>
                  <label>Logradouro</label>
                  <div className="field-value">{mainAddress?.endereco || 'Não informado'}</div>
                </div>
                <div className="field-group">
                  <label>Número</label>
                  <div className="field-value">{mainAddress?.numero || '-'}</div>
                </div>
                <div className="field-group">
                  <label>Complemento</label>
                  <div className="field-value">{mainAddress?.complemento || '-'}</div>
                </div>
              </div>
            </section>

            {/* Security Section */}
            <aside className="profile-section-card">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <h4>Segurança</h4>
              </div>

              <div className="settings-list">
                <div className="setting-item">
                  <div className="setting-label">
                    <span className="setting-title">Alterar Senha</span>
                    <span className="setting-desc">Mantenha sua conta protegida</span>
                  </div>
                  <button className="btn-profile secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} disabled>Alterar</button>
                </div>

                <div className="setting-item">
                  <div className="setting-label">
                    <span className="setting-title">Notificações</span>
                    <span className="setting-desc">Avisos via E-mail</span>
                  </div>
                  <label className="switch">
                    <input type="checkbox" defaultChecked />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h5 style={{ color: 'var(--color-error)', margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Zona de Perigo</h5>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', margin: '0.5rem 0' }}>A exclusão da conta é permanente.</p>
                <button style={{ color: 'var(--color-error)', background: 'none', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', padding: 0, opacity: 0.7 }}>Excluir minha conta</button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Edit Modal (Simulated using dynamic rendering or could use ContentModal) */}
      <Modal
        isOpen={isEditing}
        config={{
          type: 'info',
          title: 'Editar Perfil',
          message: 'Atualize seus dados abaixo. Alguns campos como CPF não podem ser alterados.',
          confirmText: 'Salvar',
          cancelText: 'Voltar',
          showCancel: true
        }}
        onConfirm={handleSave}
        onCancel={() => setIsEditing(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div className="field-group">
            <label>Nome Completo</label>
            <input
              className="field-value"
              style={{ width: '100%', background: 'var(--bg-tertiary)' }}
              value={editData.nome_completo}
              onChange={(e) => setEditData({ ...editData, nome_completo: e.target.value })}
            />
          </div>
          <div className="field-group">
            <label>Email</label>
            <input
              className="field-value"
              style={{ width: '100%', background: 'var(--bg-tertiary)' }}
              value={editData.email}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field-group">
              <label>Telefone</label>
              <input
                className="field-value"
                style={{ width: '100%', background: 'var(--bg-tertiary)' }}
                value={editData.telefone}
                onChange={(e) => setEditData({ ...editData, telefone: e.target.value })}
              />
            </div>
            <div className="field-group">
              <label>Data Nascimento</label>
              <input
                type="date"
                className="field-value"
                style={{ width: '100%', background: 'var(--bg-tertiary)' }}
                value={editData.data_nascimento}
                onChange={(e) => setEditData({ ...editData, data_nascimento: e.target.value })}
              />
            </div>
          </div>
          <div className="section-header" style={{ marginBottom: '0.5rem', marginTop: '0.5rem' }}>
            <h4 style={{ fontSize: '1rem' }}>Endereço</h4>
          </div>
          <div className="field-group">
            <label>Rua / Logradouro</label>
            <input
              className="field-value"
              style={{ width: '100%', background: 'var(--bg-tertiary)' }}
              value={editData.endereco?.endereco}
              onChange={(e) => setEditData({ ...editData, endereco: { ...editData.endereco, endereco: e.target.value } })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field-group">
              <label>Número</label>
              <input
                className="field-value"
                style={{ width: '100%', background: 'var(--bg-tertiary)' }}
                value={editData.endereco?.numero}
                onChange={(e) => setEditData({ ...editData, endereco: { ...editData.endereco, numero: e.target.value } })}
              />
            </div>
            <div className="field-group">
              <label>Complemento</label>
              <input
                className="field-value"
                style={{ width: '100%', background: 'var(--bg-tertiary)' }}
                value={editData.endereco?.complemento}
                onChange={(e) => setEditData({ ...editData, endereco: { ...editData.endereco, complemento: e.target.value } })}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal.isOpen}
        config={modal.config}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
      />

      <style jsx>{`
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
