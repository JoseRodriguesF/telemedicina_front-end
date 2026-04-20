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
  const [filters, setFilters] = useState({ search: '', status: '', specialty: '' });

  useEffect(() => {
    fetchMedicos();
  }, [filters]);

  const fetchMedicos = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams(filters as any).toString();
      const resp = await axios.get(`/api/admin/medicos?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedicos(resp.data);
    } catch (err) {
      console.error('Error fetching doctors:', err);
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
      await axios.patch(`/api/admin/medicos/${selectedMedico.id}/verificar`, { status }, {
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
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/medicos/${selectedMedico.id}/documentos/${type}?token=${token}`;
    window.open(url, '_blank');
  };

  return (
    <DashboardLayout>
      <header className="admin-header">
        <div className="header-info">
          <h1>Gestão do Corpo Clínico</h1>
          <p>Monitore o desempenho e valide o cadastro dos profissionais da rede.</p>
        </div>

        <div className="medicos-filters glass">
          <input 
            type="text" 
            placeholder="Buscar por nome, CRM ou CPF..." 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="filter-input"
          />
          <select 
            value={filters.specialty}
            onChange={(e) => setFilters({...filters, specialty: e.target.value})}
            className="filter-select"
          >
            <option value="">Todas Especialidades</option>
            <option value="Clínico Geral">Clínico Geral</option>
            <option value="Pediatria">Pediatria</option>
            <option value="Cardiologia">Cardiologia</option>
            <option value="Dermatologia">Dermatologia</option>
          </select>
          <select 
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="filter-select"
          >
            <option value="">Todos Status</option>
            <option value="verificado">✓ Verificado</option>
            <option value="analise">⏳ Em Análise</option>
            <option value="recusado">✕ Recusado</option>
          </select>
        </div>
      </header>

      <div className="admin-card glass">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando base de médicos...</p>
          </div>
        ) : medicos.length === 0 ? (
          <div className="empty-state">Nenhum médico encontrado com os filtros aplicados.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Médico</th>
                <th>CRM</th>
                <th>Especialidade</th>
                <th>Consultas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {medicos.map((m) => (
                <tr key={m.id}>
                  <td className="col-user">
                    <strong>{m.nome_completo}</strong>
                    <span>{m.usuario?.email}</span>
                  </td>
                  <td>{m.crm}/{m.crm_uf}</td>
                  <td>{m.especialidade || 'N/A'}</td>
                  <td className="col-center">
                    <span className="count-badge">{m._count.consultas}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${m.verificacao}`}>
                      {m.verificacao}
                    </span>
                  </td>
                  <td>
                    {m.verificacao === 'analise' ? (
                      <Button variant="primary" size="sm" onClick={() => handleReview(m)}>Validar</Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => handleReview(m)}>Ver Perfil</Button>
                    )}
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
        title="Dossiê Profissional"
        size="lg"
      >
        {selectedMedico && (
          <div className="review-modal-content">
            <div className="review-header-summary">
               <div className="avatar-big">{selectedMedico.nome_completo.charAt(0)}</div>
               <div className="info">
                  <h3>{selectedMedico.nome_completo}</h3>
                  <p>{selectedMedico.especialidade} • {selectedMedico.crm}/{selectedMedico.crm_uf}</p>
                  <span className={`status-pill ${selectedMedico.verificacao}`}>{selectedMedico.verificacao}</span>
               </div>
            </div>

            <div className="review-grid">
              <div className="review-section">
                <h4>Informações Pessoais</h4>
                <div className="data-row"><span>CPF:</span> <strong>{selectedMedico.cpf}</strong></div>
                <div className="data-row"><span>Email:</span> <strong>{selectedMedico.usuario?.email}</strong></div>
              </div>
              <div className="review-section">
                <h4>Métricas de Plataforma</h4>
                <div className="data-row"><span>Total Consultas:</span> <strong className="highlight">{selectedMedico._count.consultas}</strong></div>
              </div>
            </div>

            <div className="documents-section">
              <h4>Documentos Comprobatórios</h4>
              <div className="doc-buttons">
                <Button variant="ghost" onClick={() => viewDoc('diploma')}>Diploma</Button>
                <Button variant="ghost" onClick={() => viewDoc('assinatura')}>Assinatura Digital</Button>
                <Button variant="ghost" onClick={() => viewDoc('seguro')}>Seguro</Button>
                <Button variant="ghost" onClick={() => viewDoc('especializacao')}>Especialização</Button>
              </div>
            </div>

            <div className="modal-actions">
              {selectedMedico.verificacao === 'analise' ? (
                <>
                  <Button variant="ghost" onClick={() => handleVerify('recusado')} disabled={processing} className="btn-reject">
                    Recusar Registro
                  </Button>
                  <Button variant="primary" onClick={() => handleVerify('verificado')} disabled={processing}>
                    Aprovar Profissional
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={() => setShowModal(false)}>Fechar Dossiê</Button>
              )}
            </div>
          </div>
        )}
      </ContentModal>
    </DashboardLayout>
  );
}
