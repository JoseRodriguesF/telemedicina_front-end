'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import axios from '@/lib/axios/config';
import './admin-dashboard.css';

const COLORS = ['#005bbf', '#00c49f', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [filter, setFilter] = useState({
    ano: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString(),
    periodo: 'mensal'
  });

  useEffect(() => {
    fetchStats();
  }, [filter]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams(filter);
      const resp = await axios.get(`/api/admin/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(resp.data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="admin-dashboard-container animate-fadeIn">

        {/* Superior Welcome Bar */}
        <header className="admin-hero-header">
          <div className="hero-welcome">
            <span className="hero-tag">Painel de Controle Matriarca</span>
            <h1>Olá, Administrador 👋</h1>
            <p>Gerenciamento estratégico e monitoramento em tempo real do ecossistema de saúde.</p>
          </div>

          <div className="admin-filters-bar glass">
            <div className="filter-group">
              <label>Período</label>
              <select
                value={filter.periodo}
                onChange={(e) => setFilter({ ...filter, periodo: e.target.value })}
              >
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Ano</label>
              <select
                value={filter.ano}
                onChange={(e) => setFilter({ ...filter, ano: e.target.value })}
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {filter.periodo === 'mensal' && (
              <div className="filter-group">
                <label>Mês</label>
                <select
                  value={filter.mes}
                  onChange={(e) => setFilter({ ...filter, mes: e.target.value })}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('pt-BR', { month: 'short' })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button className="btn-refresh" onClick={fetchStats} disabled={loading}>
              {loading ? '...' : '🔄'}
            </button>
          </div>
        </header>

        {/* Quick Insights Cards */}
        <section className="top-stats-grid">
          <div className="summary-stat-card">
            <div className="stat-icon consultations">
              <img src="/icons/icon-chart.png" alt="Consultas" className="stat-icon-img" />
            </div>
            <div className="stat-info">
              <span className="stat-label">Consultas Totais</span>
              <h2 className="stat-value">{stats?.totalConsultations || 0}</h2>
              <span className="stat-delta">Geral da Plataforma</span>
            </div>
          </div>
          <div className="summary-stat-card">
            <div className="stat-icon doctors">🩺</div>
            <div className="stat-info">
              <span className="stat-label">Corpo Clínico</span>
              <h2 className="stat-value">{stats?.totalDoctors || 0}</h2>
              <span className="stat-delta">Médicos Ativos</span>
            </div>
          </div>
          <div className="summary-stat-card">
            <div className="stat-icon avg-time">👥</div>
            <div className="stat-info">
              <span className="stat-label">Pacientes</span>
              <h2 className="stat-value">{stats?.totalPatients || 0}</h2>
              <span className="stat-delta">Vidas Cadastradas</span>
            </div>
          </div>
          <div className="summary-stat-card highlight">
            <div className="stat-icon uptime">🛡️</div>
            <div className="stat-info">
              <span className="stat-label">Segurança</span>
              <h2 className="stat-value">100%</h2>
              <span className="stat-delta">Auditado LGPD</span>
            </div>
          </div>
        </section>

        {/* Main Management Section */}
        <div className="admin-management-grid">
          
          {/* Card 1: Doctors Management */}
          <div className="admin-table-card glass">
            <div className="card-header">
              <div>
                <h3>Corpo Clínico</h3>
                <p>Monitoramento de desempenho e cadastro dos médicos</p>
              </div>
              <button className="btn-action" onClick={() => router.push('/admin/medicos')}>Gerenciar Tudo</button>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Médico</th>
                    <th>Especialidade</th>
                    <th>CRM</th>
                    <th>Atendimentos</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.doctors || []).map((medico: any) => (
                    <tr key={medico.id}>
                      <td className="col-user-info">
                        <strong>{medico.nome}</strong>
                        <span>{medico.usuario?.email}</span>
                      </td>
                      <td>{medico.especialidade}</td>
                      <td>{medico.crm}/{medico.uf}</td>
                      <td className="col-center">
                        <span className="count-badge">{medico._count.consultas}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${medico.status_verificacao}`}>
                          {medico.status_verificacao}
                        </span>
                      </td>
                      <td>
                        <button className="btn-detail" onClick={() => setSelectedUser({ type: 'medico', data: medico })}>
                          🔍 Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Patients Overview */}
          <div className="admin-table-card glass">
            <div className="card-header">
              <div>
                <h3>Base de Pacientes</h3>
                <p>Visão geral de engajamento (Dados de registro apenas)</p>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>CPF</th>
                    <th>Telefone</th>
                    <th>Consultas</th>
                    <th>Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.patients || []).map((paciente: any) => (
                    <tr key={paciente.id}>
                      <td className="col-user-info">
                        <strong>{paciente.nome}</strong>
                        <span>{paciente.usuario?.email}</span>
                      </td>
                      <td>{paciente.cpf}</td>
                      <td>{paciente.telefone}</td>
                      <td className="col-center">
                        <span className="count-badge secondary">{paciente._count.consultas}</span>
                      </td>
                      <td>{new Date(paciente.usuario?.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <button className="btn-detail" onClick={() => setSelectedUser({ type: 'paciente', data: paciente })}>
                          🔍 Perfil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Analytics & Activity Row */}
        <div className="admin-bottom-grid">
           {/* Fluxo de Atendimento */}
           <div className="admin-chart-card glass">
            <div className="card-header">
              <div>
                <h3>Fluxo de Atendimento</h3>
                <p>Volume por faixa horária (24h)</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={stats?.hourly || []}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} axisLine={false} tickLine={false} fontSize={11} />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Area type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Analytics Access */}
          <div className="admin-chart-card glass analytics-shortcut">
            <div className="shortcut-content">
              <div className="shortcut-text">
                <h3>Monitoramento Central</h3>
                <p>Acesse a trilha de auditoria e métricas de integridade.</p>
              </div>
              <div className="shortcut-actions">
                <button className="btn-go-analytics" onClick={() => router.push('/admin/logs/analytics')}>
                   Analytics de Logs →
                </button>
                <button className="btn-secondary-action" onClick={() => router.push('/admin/logs')}>
                   Trilha de Auditoria
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* User Details Modal (Personal Data Only) */}
        {selectedUser && (
          <div className="user-details-modal-overlay" onClick={() => setSelectedUser(null)}>
            <div className="user-details-modal glass animate-scaleIn" onClick={e => e.stopPropagation()}>
              <header className="modal-header">
                <h2>Detalhes do {selectedUser.type === 'medico' ? 'Médico' : 'Paciente'}</h2>
                <button className="btn-close" onClick={() => setSelectedUser(null)}>×</button>
              </header>
              <div className="modal-content">
                <div className="user-profile-summary">
                  <div className="user-avatar">{selectedUser.data.nome.charAt(0)}</div>
                  <div className="user-main-info">
                    <h3>{selectedUser.data.nome}</h3>
                    <p>{selectedUser.data.usuario?.email}</p>
                  </div>
                </div>

                <div className="details-grid">
                  <div className="detail-item">
                    <label>{selectedUser.type === 'medico' ? 'CRM' : 'CPF'}</label>
                    <span>{selectedUser.type === 'medico' ? `${selectedUser.data.crm}/${selectedUser.data.uf}` : selectedUser.data.cpf}</span>
                  </div>
                  <div className="detail-item">
                    <label>Telefone</label>
                    <span>{selectedUser.data.telefone || 'Não informado'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Data de Cadastro</label>
                    <span>{new Date(selectedUser.data.usuario?.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="detail-item">
                    <label>Total de Consultas</label>
                    <span className="highlight-value">{selectedUser.data._count.consultas}</span>
                  </div>
                  {selectedUser.type === 'medico' && (
                    <div className="detail-item">
                      <label>Especialidade</label>
                      <span>{selectedUser.data.especialidade}</span>
                    </div>
                  )}
                </div>

                <div className="modal-notice">
                  <p>🛡️ <strong>Privacidade:</strong> Por motivos de segurança e LGPD, dados clínicos e históricos médicos não são acessíveis por administradores.</p>
                </div>
              </div>
              <footer className="modal-footer">
                <button className="btn-primary" onClick={() => setSelectedUser(null)}>Fechar</button>
              </footer>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
