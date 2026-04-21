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

        {/* Compact Admin Header */}
        <header className="admin-compact-header">
          <div className="compact-title">
            <h1>Dashboard Administrativo</h1>
            <p>Monitoramento e gestão da plataforma.</p>
          </div>

          <div className="admin-filters-bar glass">
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

            <div className="filter-group">
              <label>Mês</label>
              <select
                value={filter.mes}
                onChange={(e) => setFilter({ ...filter, mes: e.target.value })}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn-refresh" onClick={fetchStats} disabled={loading}>
              {loading ? '...' : 'Atualizar'}
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
            </div>
          </div>
          <div className="summary-stat-card online">
            <div className="stat-icon online-dot">🟢</div>
            <div className="stat-info">
              <span className="stat-label">Médicos Online</span>
              <h2 className="stat-value">{stats?.onlineDoctors || 0}</h2>
            </div>
          </div>
          <div className="summary-stat-card online">
            <div className="stat-icon online-dot">🟢</div>
            <div className="stat-info">
              <span className="stat-label">Pacientes Online</span>
              <h2 className="stat-value">{stats?.onlinePatients || 0}</h2>
            </div>
          </div>
          <div className="summary-stat-card">
            <div className="stat-icon doctors">🩺</div>
            <div className="stat-info">
              <span className="stat-label">Corpo Clínico</span>
              <h2 className="stat-value">{stats?.totalDoctors || 0}</h2>
            </div>
          </div>
          <div className="summary-stat-card">
            <div className="stat-icon avg-time">👥</div>
            <div className="stat-info">
              <span className="stat-label">Pacientes</span>
              <h2 className="stat-value">{stats?.totalPatients || 0}</h2>
            </div>
          </div>
        </section>

        {/* Analytics & Activity Row */}
        <div className="admin-bottom-grid">
           {/* Fluxo de Atendimento */}
           <div className="admin-chart-card glass">
            <div className="card-header">
              <div>
                <h3>Fluxo de Atendimento</h3>
                <p>Volume por faixa horária (24h)</p>
              </div>
              <div className="chart-filters">
                <select className="filter-select-mini">
                  <option>Hoje</option>
                  <option>Ontem</option>
                  <option>Últimos 7 dias</option>
                </select>
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(v) => `${v}h`} 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={10} 
                    stroke="var(--text-tertiary)" 
                    interval={0}
                    dy={10}
                  />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} stroke="var(--text-tertiary)" dx={-5} />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(20,20,30,0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
                    labelFormatter={(v) => `Horário: ${v}:00`}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle" 
                    wrapperStyle={{ paddingTop: '0', marginTop: '-20px', fontSize: '10px', opacity: 0.7 }}
                  />
                  <Area 
                    name="Volume de Atendimentos"
                    type="monotone" 
                    dataKey="count" 
                    stroke="var(--color-primary)" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                  />
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

        {/* Main Management Section (Moved to Bottom) */}
        <div className="admin-management-grid">
          
          {/* Card 1: Doctors Management (Informative) */}
          <div className="admin-nav-card glass">
            <div className="card-header-centered">
              <div className="nav-icon">🩺</div>
              <h3>Corpo Clínico</h3>
              <p className="nav-description">
                Gerencie o cadastro de médicos, valide novos registros no CRM, monitore o desempenho individual e gerencie escalas de plantão.
              </p>
            </div>
            <div className="nav-stats-mini">
              <div className="mini-stat">
                <strong>{stats?.totalDoctors || 0}</strong>
                <span>Médicos</span>
              </div>
              <div className="mini-stat">
                <strong>{stats?.doctors?.filter((m: any) => m.verificacao === 'analise').length || 0}</strong>
                <span>Pendentes</span>
              </div>
            </div>
            <footer className="nav-footer">
              <button className="btn-manage-full" onClick={() => router.push('/admin/medicos')}>
                Gerenciar Corpo Clínico →
              </button>
            </footer>
          </div>

          {/* Card 2: Patients Overview (Informative) */}
          <div className="admin-nav-card glass">
            <div className="card-header-centered">
              <div className="nav-icon">👥</div>
              <h3>Base de Pacientes</h3>
              <p className="nav-description">
                Acompanhe o crescimento da base de usuários, gerencie dados cadastrais, verifique CPFs e monitore o engajamento geral na plataforma.
              </p>
            </div>
            <div className="nav-stats-mini">
              <div className="mini-stat">
                <strong>{stats?.totalPatients || 0}</strong>
                <span>Pacientes</span>
              </div>
              <div className="mini-stat">
                <strong>{stats?.patients?.length || 0}</strong>
                <span>Novos (Mês)</span>
              </div>
            </div>
            <footer className="nav-footer">
              <button className="btn-manage-full" onClick={() => router.push('/admin/pacientes')}>
                Gerenciar Base de Pacientes →
              </button>
            </footer>
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
                  <div className="user-avatar">{selectedUser.data.nome_completo.charAt(0)}</div>
                  <div className="user-main-info">
                    <h3>{selectedUser.data.nome_completo}</h3>
                    <p>{selectedUser.data.usuario?.email}</p>
                  </div>
                </div>

                <div className="details-grid">
                  <div className="detail-item">
                    <label>{selectedUser.type === 'medico' ? 'CRM' : 'CPF'}</label>
                    <span>{selectedUser.type === 'medico' ? `${selectedUser.data.crm}/${selectedUser.data.crm_uf}` : selectedUser.data.cpf}</span>
                  </div>
                  <div className="detail-item">
                    <label>Telefone</label>
                    <span>{selectedUser.data.telefone || selectedUser.data.telefone_celular || 'Não informado'}</span>
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
