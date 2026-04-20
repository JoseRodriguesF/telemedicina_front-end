"use client";

import '../inicio/inicio.css';
import './perfil.css';
import '@/components/layout/Header/header.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getToken, clearUser } from '@/lib/auth';
import { getMyProfile, updateMyProfile, deleteMyProfile, UserProfile } from '@/lib/axios/perfil';
import { Modal } from '@/components/common/Modal/Modal';
import Link from 'next/link';
import { useModal } from '@/components/common/Modal/useModal';
import { formatDate } from '@/lib/utils/dateFormatters';
import AddressAutocomplete from '@/components/common/Inputs/AddressAutocomplete';
import ContentModal from '@/components/common/Modal/ContentModal';
import { uploadFileToServer } from '@/lib/upload';
import ResumoProfissionalCard from '@/components/dashboard/ResumoProfissionalCard';
import HistoriaClinicaCard from '@/components/dashboard/HistoriaClinicaCard';

export default function PerfilPage() {
  const router = useRouter();
  const modal = useModal();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // States for Editing
  const [editData, setEditData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);

  // States for Document Viewer
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<{ title: string; url: string; mimetype?: string; fieldName: string } | null>(null);
  const [pdfPage, setPdfPage] = useState(1);

  // States for Uploads
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Mevo: Complete Profile Modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);

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
      
      // Bloquear acesso de admins ao perfil pessoal de paciente/médico
      if (data.tipo_usuario === 'admin') {
        router.push('/admin/dashboard');
        return;
      }

      setProfile(data);

      // Mevo: Verificação automática de perfil completo para pacientes
      if (data.tipo_usuario === 'paciente' && data.paciente) {
        if (!data.paciente.peso || !data.paciente.altura) {
          setShowCompleteModal(true);
        }
      }
    } catch (error: any) {
      console.error('Erro ao buscar perfil:', error);
      // Handle Unauthorized
      if (error?.response?.status === 401 || error?.status === 401 || error?.message?.includes('401')) {
        router.push('/login');
      }
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
      nome_mae: (profile.paciente as any)?.nome_mae || '',
      peso: (profile.paciente as any)?.peso || '',
      altura: (profile.paciente as any)?.altura || '',
      telefone_celular: (profile.medico as any)?.telefone_celular || '',
      crm: (commonData as any).crm || '',
      crm_uf: (commonData as any).crm_uf || '',
      rqe: (commonData as any).rqe || '',
      endereco: {
        endereco: addr.endereco || '',
        numero: addr.numero || '',
        complemento: addr.complemento || ''
      }
    });
    setIsEditing(true);
  };

  const handleDocumentView = (title: string, url: string, mimetype: string | undefined, fieldName: string) => {
    if (!url) return;
    setPdfPage(1); // Reset to first page
    setCurrentDocument({ title, url, mimetype, fieldName });
    setDocumentViewerOpen(true);
  };

  async function fileToBase64(file: File): Promise<{ data: string; mimetype: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve({ data: base64String, mimetype: file.type });
      };
      reader.onerror = (error) => reject(error);
    });
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDoc(fieldName);

      // Convert to Base64 for database storage
      const fileData = await fileToBase64(file);

      const token = getToken();
      if (!token) return;

      // Mapear fieldName (ex: diploma_url) para o campo esperado pela API (ex: diploma)
      const apiField = fieldName.replace('_url', '');

      // Update backend with new data (object with data/mimetype)
      await updateMyProfile(token, { [apiField]: fileData });

      modal.success('Documento Enviado', 'O documento foi atualizado com sucesso.');
      await fetchProfile();
    } catch (error: any) {
      console.error('Erro no upload:', error);
      modal.error('Erro no Upload', 'Não foi possível enviar o documento. ' + (error?.message || ''));
    } finally {
      setUploadingDoc(null);
      // Reset input
      event.target.value = '';
    }
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

  const handleDeleteAccount = async () => {
    modal.confirm(
      'Excluir Conta e Dados',
      'Tem certeza que deseja excluir sua conta? Esta ação é irreversível e todos os seus dados pessoais serão removidos da plataforma (com exceção de registros médicos que devem ser guardados por lei).',
      async () => {
        try {
          const token = getToken();
          if (!token) return;

          await deleteMyProfile(token);
          modal.success('Conta Excluída', 'Sua conta foi excluída com sucesso. Você será redirecionado.');
          
          setTimeout(() => {
            clearUser();
            router.push('/login');
          }, 2000);
        } catch (error: any) {
          console.error('Erro ao excluir conta:', error);
          modal.error('Erro', 'Não foi possível excluir sua conta no momento.');
        }
      }
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="perfil-container-loading" />
      </DashboardLayout>
    );
  }

  const userData = (profile?.paciente || profile?.medico || {}) as any;
  const addresses = profile?.enderecos || [];
  const mainAddress = addresses[0] || null;

  const getDocUrl = (type: string) => {
    if (!profile?.medico) return '';
    const token = getToken();
    // A rota da API agora faz o redirect para o GCS
    return `/api/usuarios/me/documentos/${type}${token ? `?token=${token}` : ''}`;
  };

  return (
    <DashboardLayout>


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
          {/* Main Content Card (Single Card for both Patient and Doctor) */}
          <section className="profile-section-card">
            {/* 1. Basic Info Section */}
            <div className="section-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <h4>Dados Cadastrais</h4>
            </div>

            <div className="profile-form-grid">
              {profile?.tipo_usuario === 'medico' && (
                <>
                  <div className="field-group">
                    <label>CRM</label>
                    <div className="field-value">{(userData as any).crm || '-'} / {(userData as any).crm_uf || '-'}</div>
                  </div>
                  {(userData as any).rqe && (
                    <div className="field-group">
                      <label>RQE</label>
                      <div className="field-value">{(userData as any).rqe}</div>
                    </div>
                  )}
                </>
              )}
              {profile?.tipo_usuario === 'paciente' && (
                <div className="field-group">
                  <label>Telefone / WhatsApp</label>
                  <div className="field-value">{(userData as any).telefone || '-'}</div>
                </div>
              )}
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

              {profile?.tipo_usuario === 'paciente' && (
                <>
                  <div className="field-group">
                    <label>Nome da Mãe</label>
                    <div className="field-value">{(userData as any).nome_mae || '-'}</div>
                  </div>
                  <div className="field-group">
                    <label>Peso (kg)</label>
                    <div className="field-value">{(userData as any).peso ? `${(userData as any).peso} kg` : '-'}</div>
                  </div>
                  <div className="field-group">
                    <label>Altura (cm)</label>
                    <div className="field-value">{(userData as any).altura ? `${(userData as any).altura} cm` : '-'}</div>
                  </div>
                </>
              )}

              {profile?.tipo_usuario === 'medico' && (
                <div className="field-group">
                  <label>Telefone Celular (MFA)</label>
                  <div className="field-value">{(userData as any).telefone_celular || '-'}</div>
                </div>
              )}
            </div>

            {profile?.tipo_usuario === 'paciente' && (
              <>
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
              </>
            )}

            {/* 2. Professional Summary (Doctors Only) */}
            {profile?.tipo_usuario === 'medico' && <ResumoProfissionalCard />}

            {/* 2. Clinical History (Patients Only) */}
            {profile?.tipo_usuario === 'paciente' && <HistoriaClinicaCard />}

            {/* 3. Professional Documents Section (Doctors Only) */}
            {profile?.tipo_usuario === 'medico' && (
              <>
                <div className="section-header" style={{ marginTop: '2.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14.5 2 14.5 7.5 20 7.5" /></svg>
                  <h4>Documentos Profissionais</h4>
                </div>

                <div className="documents-grid">
                  {/* Inputs ocultos para upload */}
                  <input id="upload-diploma" type="file" style={{ display: 'none' }} accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'diploma_url')} />
                  <input id="upload-assinatura" type="file" style={{ display: 'none' }} accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'assinatura_digital_url')} />
                  <input id="upload-especializacao" type="file" style={{ display: 'none' }} accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'especializacao_url')} />
                  <input id="upload-seguro" type="file" style={{ display: 'none' }} accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'seguro_responsabilidade_url')} />

                  <div
                    className={`document-card ${profile.medico?.tem_diploma ? 'active' : ''}`}
                    onClick={() => profile.medico?.tem_diploma ? handleDocumentView('Diploma Médico', getDocUrl('diploma'), 'application/pdf', 'diploma_url') : document.getElementById('upload-diploma')?.click()}
                  >
                    {uploadingDoc === 'diploma_url' && <div className="upload-loader-overlay"><div className="loader-spinner" /></div>}
                    <div className="document-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14.5 2 14.5 7.5 20 7.5" /></svg>
                    </div>
                    <div className="document-info">
                      <div className="document-title">Diploma Médico</div>
                      <div className="document-status">{profile.medico?.tem_diploma ? 'Verificado' : 'Clique para enviar'}</div>
                    </div>
                    {profile.medico?.tem_diploma ? (
                      <button className="btn-view-doc">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                        Visualizar
                      </button>
                    ) : (
                      <button className="btn-upload-doc" style={{ opacity: 1, transform: 'none' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        Enviar
                      </button>
                    )}
                  </div>

                  <div
                    className={`document-card ${profile.medico?.tem_assinatura ? 'active' : ''}`}
                    onClick={() => profile.medico?.tem_assinatura ? handleDocumentView('Assinatura Digital', getDocUrl('assinatura'), 'application/pdf', 'assinatura_digital_url') : document.getElementById('upload-assinatura')?.click()}
                  >
                    {uploadingDoc === 'assinatura_digital_url' && <div className="upload-loader-overlay"><div className="loader-spinner" /></div>}
                    <div className="document-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>
                    </div>
                    <div className="document-info">
                      <div className="document-title">Assinatura Digital</div>
                      <div className="document-status">{profile.medico?.tem_assinatura ? 'Verificado' : 'Clique para enviar'}</div>
                    </div>
                    {profile.medico?.tem_assinatura ? (
                      <button className="btn-view-doc">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                        Visualizar
                      </button>
                    ) : (
                      <button className="btn-upload-doc" style={{ opacity: 1, transform: 'none' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        Enviar
                      </button>
                    )}
                  </div>

                  <div
                    className={`document-card ${profile.medico?.tem_especializacao ? 'active' : ''}`}
                    onClick={() => profile.medico?.tem_especializacao ? handleDocumentView('Especialização / RQE', getDocUrl('especializacao'), 'application/pdf', 'especializacao_url') : document.getElementById('upload-especializacao')?.click()}
                  >
                    {uploadingDoc === 'especializacao_url' && <div className="upload-loader-overlay"><div className="loader-spinner" /></div>}
                    <div className="document-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
                    </div>
                    <div className="document-info">
                      <div className="document-title">Especialização / RQE</div>
                      <div className="document-status">{profile.medico?.tem_especializacao ? 'Verificado' : 'Clique para enviar'}</div>
                    </div>
                    {profile.medico?.tem_especializacao ? (
                      <button className="btn-view-doc">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                        Visualizar
                      </button>
                    ) : (
                      <button className="btn-upload-doc" style={{ opacity: 1, transform: 'none' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        Enviar
                      </button>
                    )}
                  </div>

                  <div
                    className={`document-card ${profile.medico?.tem_seguro ? 'active' : ''}`}
                    onClick={() => profile.medico?.tem_seguro ? handleDocumentView('Seguro Profissional', getDocUrl('seguro'), 'application/pdf', 'seguro_responsabilidade_url') : document.getElementById('upload-seguro')?.click()}
                  >
                    {uploadingDoc === 'seguro_responsabilidade_url' && <div className="upload-loader-overlay"><div className="loader-spinner" /></div>}
                    <div className="document-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
                    </div>
                    <div className="document-info">
                      <div className="document-title">Seguro Profissional</div>
                      <div className="document-status">{profile.medico?.tem_seguro ? 'Verificado' : 'Clique para enviar'}</div>
                    </div>
                    {profile.medico?.tem_seguro ? (
                      <button className="btn-view-doc">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                        Visualizar
                      </button>
                    ) : (
                      <button className="btn-upload-doc" style={{ opacity: 1, transform: 'none' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        Enviar
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Security Section */}
          <aside className="profile-section-card">
            <div className="section-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              <h4>Segurança</h4>
            </div>

            <div className="section-header" style={{ marginTop: '2.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
              <h4>Privacidade e LGPD</h4>
            </div>

            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-label">
                  <span className="setting-title">Seus Dados e Direitos</span>
                  <span className="setting-desc">Acesse nossos termos e saiba como tratamos seus dados</span>
                </div>
                <Link href="/termos" className="btn-profile secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  Ler Termos
                </Link>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <span className="setting-title" style={{ color: '#ef4444' }}>Excluir Conta</span>
                  <span className="setting-desc">Remover permanentemente seus dados da plataforma</span>
                </div>
                <button className="btn-profile danger" onClick={handleDeleteAccount}>Excluir</button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Edit Modal */}
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

          {profile?.tipo_usuario === 'paciente' && (
            <>
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

              <div className="field-group">
                <label>Nome da Mãe</label>
                <input
                  className="field-value"
                  style={{ width: '100%', background: 'var(--bg-tertiary)' }}
                  value={editData.nome_mae}
                  onChange={(e) => setEditData({ ...editData, nome_mae: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field-group">
                  <label>Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="field-value"
                    style={{ width: '100%', background: 'var(--bg-tertiary)' }}
                    value={editData.peso}
                    onChange={(e) => setEditData({ ...editData, peso: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="field-group">
                  <label>Altura (cm)</label>
                  <input
                    type="number"
                    className="field-value"
                    style={{ width: '100%', background: 'var(--bg-tertiary)' }}
                    value={editData.altura}
                    onChange={(e) => setEditData({ ...editData, altura: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="section-header" style={{ marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem' }}>Endereço</h4>
              </div>
              <div className="field-group">
                <label>Rua / Logradouro</label>
                <AddressAutocomplete
                  className="field-value"
                  placeholder=""
                  value={editData.endereco?.endereco || ''}
                  onChange={(val) => setEditData({ ...editData, endereco: { ...editData.endereco, endereco: val } })}
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
            </>
          )}

          {profile?.tipo_usuario === 'medico' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field-group">
                  <label>UF do CRM</label>
                  <input
                    className="field-value"
                    style={{ width: '100%', background: 'var(--bg-tertiary)' }}
                    maxLength={2}
                    value={editData.crm_uf}
                    onChange={(e) => setEditData({ ...editData, crm_uf: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="field-group">
                  <label>RQE</label>
                  <input
                    className="field-value"
                    style={{ width: '100%', background: 'var(--bg-tertiary)' }}
                    value={editData.rqe}
                    onChange={(e) => setEditData({ ...editData, rqe: e.target.value })}
                  />
                </div>
              </div>

              <div className="field-group">
                <label>Telefone Celular (MFA)</label>
                <input
                  className="field-value"
                  style={{ width: '100%', background: 'var(--bg-tertiary)' }}
                  value={editData.telefone_celular}
                  onChange={(e) => setEditData({ ...editData, telefone_celular: e.target.value })}
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
            </>
          )}
        </div>
      </Modal>

      <ContentModal
        isOpen={documentViewerOpen}
        onClose={() => {
          setDocumentViewerOpen(false);
          setCurrentDocument(null);
        }}
        title={currentDocument?.title || 'Documento'}
        size="lg"
      >
        {currentDocument?.url && (
          <div className="viewer-actions-wrapper">
            {/* Floating Action Button */}
            <div className="viewer-floating-actions">
              <button
                className="btn-floating-action"
                onClick={() => {
                  const inputId = `upload-${currentDocument.fieldName.replace('_url', '').replace('assinatura_digital', 'assinatura').replace('seguro_responsabilidade', 'seguro')}`;
                  document.getElementById(inputId)?.click();
                  setDocumentViewerOpen(false);
                }}
                title="Substituir este documento por um novo arquivo"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Alterar Documento
              </button>
            </div>

            <div className="pdf-viewer-container">
              {currentDocument.mimetype === 'application/pdf' ? (
                <object
                  data={`${currentDocument.url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  type="application/pdf"
                  className="pdf-object-view"
                >
                  <div className="pdf-fallback">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14.5 2 14.5 7.5 20 7.5" />
                      <path d="M12 12v6" />
                      <path d="m15 15-3 3-3-3" />
                    </svg>
                    <div className="pdf-error-title">Visualização indisponível no navegador</div>
                    <p>Não foi possível carregar o visualizador de PDF diretamente. Você pode baixar o documento para visualizá-lo em seu dispositivo.</p>
                    <a href={currentDocument.url} target="_blank" rel="noopener noreferrer" className="btn-pdf-download" download>
                      Baixar Documento (PDF)
                    </a>
                  </div>
                </object>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img src={currentDocument.url} alt={currentDocument.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              )}
            </div>
          </div>
        )}
      </ContentModal>

      {/* Complete Profile Modal (Mevo) */}
      <Modal
        isOpen={showCompleteModal}
        config={{
          type: 'info',
          title: 'Complete seu Perfil',
          message: 'Para emitirmos suas receitas digitais, precisamos do seu peso e altura.',
          confirmText: 'Atualizar Agora',
          cancelText: 'Pular',
          showCancel: true
        }}
        onConfirm={() => {
          setShowCompleteModal(false);
          handleEditOpen();
        }}
        onCancel={() => setShowCompleteModal(false)}
      />

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
    </DashboardLayout >
  );
}
