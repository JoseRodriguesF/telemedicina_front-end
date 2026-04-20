'use client';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getToken } from '@/lib/auth';
import axios from '@/lib/axios/config';
import ContentModal from '@/components/common/Modal/ContentModal';
import Button from '@/components/common/Buttons/Button';
import '../medicos/admin-medicos.css'; // Reutilizando os mesmos estilos

export default function AdminPacientes() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ search: '' });

  useEffect(() => {
    fetchPacientes();
  }, [filters]);

  const fetchPacientes = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams(filters as any).toString();
      const resp = await axios.get(`/api/admin/pacientes?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPacientes(resp.data);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProfile = (paciente: any) => {
    setSelectedPaciente(paciente);
    setShowModal(true);
  };

  return (
    <DashboardLayout>
      <header className="admin-header">
        <div className="header-info">
          <h1>Base de Pacientes</h1>
          <p>Gestão e acompanhamento da base de usuários da plataforma.</p>
        </div>

        <div className="medicos-filters glass">
          <input 
            type="text" 
            placeholder="Buscar por nome, CPF ou telefone..." 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="filter-input"
            style={{ minWidth: '400px' }}
          />
        </div>
      </header>

      <div className="admin-card glass">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando base de pacientes...</p>
          </div>
        ) : pacientes.length === 0 ? (
          <div className="empty-state">Nenhum paciente encontrado com os filtros aplicados.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Consultas</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map((p) => (
                <tr key={p.id}>
                  <td className="col-user">
                    <strong>{p.nome_completo}</strong>
                    <span>{p.usuario?.email}</span>
                  </td>
                  <td>{p.cpf}</td>
                  <td>{p.telefone}</td>
                  <td className="col-center">
                    <span className="count-badge secondary" style={{ background: 'rgba(0,196,159,0.1)', color: '#00c49f' }}>
                      {p._count.consultas}
                    </span>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenProfile(p)}>Ver Perfil</Button>
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
        title="Perfil do Paciente"
        size="md"
      >
        {selectedPaciente && (
          <div className="review-modal-content">
            <div className="review-header-summary">
               <div className="avatar-big" style={{ background: 'linear-gradient(135deg, #00c49f, #005bbf)' }}>
                 {selectedPaciente.nome_completo.charAt(0)}
               </div>
               <div className="info">
                  <h3>{selectedPaciente.nome_completo}</h3>
                  <p>Paciente Matriarca</p>
               </div>
            </div>

            <div className="review-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="review-section">
                <h4>Informações Cadastrais</h4>
                <div className="data-row"><span>CPF:</span> <strong>{selectedPaciente.cpf}</strong></div>
                <div className="data-row"><span>Email:</span> <strong>{selectedPaciente.usuario?.email}</strong></div>
                <div className="data-row"><span>Telefone:</span> <strong>{selectedPaciente.telefone}</strong></div>
              </div>
              
              <div className="review-section">
                <h4>Métricas</h4>
                <div className="data-row"><span>Total Consultas:</span> <strong className="highlight" style={{ color: '#00c49f' }}>{selectedPaciente._count.consultas}</strong></div>
              </div>
            </div>

            <div className="modal-notice" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginTop: '1rem' }}>
               <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                 🛡️ Por questões de privacidade médica (LGPD), o acesso a prontuários e dados clínicos é restrito aos profissionais de saúde durante o atendimento.
               </p>
            </div>

            <div className="modal-actions">
               <Button variant="primary" onClick={() => setShowModal(false)}>Fechar Perfil</Button>
            </div>
          </div>
        )}
      </ContentModal>
    </DashboardLayout>
  );
}
