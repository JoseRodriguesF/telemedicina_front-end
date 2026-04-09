'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getToken } from '@/lib/auth';
import axios from '@/lib/axios/config';
import ContentModal from '@/components/common/Modal/ContentModal';
import Button from '@/components/common/Buttons/Button';
import './admin-medicos.css';

export default function AdminMedicos() {
  const [medicos, setMedicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedico, setSelectedMedico] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchMedicos();
  }, []);

  const fetchMedicos = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const resp = await axios.get('/admin/medicos/pendentes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedicos(resp.data);
    } catch (err) {
      console.error('Error fetching pending doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (medico: any) => {
    setSelectedMedico(medico);
    setShowModal(true);
  };

  const handleVerify = async (status: 'verificado' | 'recusado') => {
    if (!selectedMedico) return;
    setProcessing(true);
    try {
      const token = getToken();
      await axios.patch(`/admin/medicos/${selectedMedico.id}/verificar`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      fetchMedicos();
    } catch (err) {
      console.error('Error verifying doctor:', err);
    } finally {
      setProcessing(false);
    }
  };

  const viewDoc = (type: string) => {
    if (!selectedMedico) return;
    const token = getToken();
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/medicos/${selectedMedico.id}/documentos/${type}?token=${token}`;
    window.open(url, '_blank');
  };

  return (
    <DashboardLayout>
      <header className="admin-header">
        <div className="header-content">
          <h1>Verificação de Médicos</h1>
          <p>Gerencie as solicitações de novos profissionais na plataforma</p>
        </div>
      </header>

      <div className="admin-card glass">
        {loading ? (
          <div className="loading-state">Carregando solicitações...</div>
        ) : medicos.length === 0 ? (
          <div className="empty-state">Não há médicos aguardando verificação no momento.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CRM</th>
                <th>Especialidade</th>
                <th>Email</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {medicos.map((m) => (
                <tr key={m.id}>
                  <td>{m.nome_completo}</td>
                  <td>{m.crm}/{m.crm_uf}</td>
                  <td>{m.especialidade || 'Não informada'}</td>
                  <td>{m.usuario?.email}</td>
                  <td>
                    <Button variant="primary" onClick={() => handleReview(m)}>Analisar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ContentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Analisar Cadastro Profissional"
        size="lg"
      >
        {selectedMedico && (
          <div className="review-modal-content">
            <div className="review-grid">
              <div className="review-section">
                <h4>Informações Pessoais</h4>
                <p><strong>Nome:</strong> {selectedMedico.nome_completo}</p>
                <p><strong>CPF:</strong> {selectedMedico.cpf}</p>
                <p><strong>Email:</strong> {selectedMedico.usuario?.email}</p>
              </div>
              <div className="review-section">
                <h4>Dados Médicos</h4>
                <p><strong>CRM:</strong> {selectedMedico.crm} / {selectedMedico.crm_uf}</p>
                <p><strong>Especialidade:</strong> {selectedMedico.especialidade || 'N/A'}</p>
              </div>
            </div>

            <div className="documents-section">
              <h4>Documentos</h4>
              <div className="doc-buttons">
                <Button variant="ghost" onClick={() => viewDoc('diploma')}>Diploma</Button>
                <Button variant="ghost" onClick={() => viewDoc('assinatura')}>Assinatura Digital</Button>
                <Button variant="ghost" onClick={() => viewDoc('seguro')}>Seguro Responsabilidade</Button>
                <Button variant="ghost" onClick={() => viewDoc('especializacao')}>Especialização</Button>
              </div>
            </div>

            <div className="modal-actions">
              <Button variant="ghost" onClick={() => handleVerify('recusado')} disabled={processing} className="btn-reject">
                Recusar Registro
              </Button>
              <Button variant="primary" onClick={() => handleVerify('verificado')} disabled={processing}>
                Aprovar e Liberar Acesso
              </Button>
            </div>
          </div>
        )}
      </ContentModal>
    </DashboardLayout>
  );
}
