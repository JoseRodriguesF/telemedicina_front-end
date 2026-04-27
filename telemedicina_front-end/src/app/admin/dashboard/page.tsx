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
    periodo: 'mensal',
    range: 'today',
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fim: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchStats();
    
    // Configuração de atualização em tempo real (Sync a cada 15 segundos)
    const intervalId = setInterval(() => {
      fetchStats(false);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [filter]);

  const fetchStats = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams(filter);
      if (filter.range) params.set('range', filter.range);
      const resp = await axios.get(`/api/admin/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(resp.data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="admin-dashboard-container animate-fadeIn">

        {/* Header removido a pedido do usuário */}

        {/* Quick Insights Cards */}
        <section className="top-stats-grid">
          <div className="summary-stat-card">
            <div className="stat-icon finished">✅</div>
            <div className="stat-info">
              <span className="stat-label">Realizadas (24h)</span>
              <h2 className="stat-value">{stats?.finished24h || 0}</h2>
            </div>
          </div>
          <div className="summary-stat-card in-progress">
            <div className="stat-icon pulse-blue">⚡</div>
            <div className="stat-info">
              <span className="stat-label">Em Andamento</span>
              <h2 className="stat-value">{stats?.ongoingConsultations || 0}</h2>
            </div>
          </div>
          <div className="summary-stat-card queue">
            <div className="stat-icon waiting">⏳</div>
            <div className="stat-info">
              <span className="stat-label">Fila de Espera</span>
              <h2 className="stat-value">{stats?.queuePatients || 0}</h2>
            </div>
          </div>
          <div className="summary-stat-card cancelled">
            <div className="stat-icon error">🚫</div>
            <div className="stat-info">
              <span className="stat-label">Canceladas (24h)</span>
              <h2 className="stat-value">{stats?.cancelled24h || 0}</h2>
            </div>
          </div>
          <div className="summary-stat-card online-mini">
            <div className="stat-icon online-dot">🟢</div>
            <div className="stat-info">
              <span className="stat-label">Online</span>
              <h2 className="stat-value">{(stats?.onlineDoctors || 0) + (stats?.onlinePatients || 0)}</h2>
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
              <div className="chart-filters-range">
                <div className="filter-input-group">
                  <span>De:</span>
                  <input
                    type="date"
                    className="filter-date-mini"
                    value={filter.inicio}
                    onChange={(e) => setFilter({ ...filter, inicio: e.target.value, range: 'custom' })}
                  />
                </div>
                <div className="filter-input-group">
                  <span>Até:</span>
                  <input
                    type="date"
                    className="filter-date-mini"
                    value={filter.fim}
                    onChange={(e) => setFilter({ ...filter, fim: e.target.value, range: 'custom' })}
                  />
                </div>
                <button className="btn-refresh-mini" onClick={() => fetchStats()} disabled={loading}>
                  {loading ? '...' : '⟳'}
                </button>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
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
                    fontSize={9} 
                    stroke="var(--text-tertiary)" 
                    interval={0}
                    dy={10}
                  />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} stroke="var(--text-tertiary)" dx={-5} />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(20,20,30,0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
                    labelFormatter={(v) => `Horário: ${v}:00`}
                  />
                  <Area 
                    name="Volume de Atendimentos"
                    type="monotone" 
                    dataKey="count" 
                    stroke="var(--color-primary)" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorCount)"
                    activeDot={{ r: 6, fill: '#ff4d4d', strokeWidth: 2, stroke: '#fff' }}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const hourlyData = stats?.hourly || [];
                      const maxVal = Math.max(...hourlyData.map((h: any) => h.count), 0);
                      
                      if (payload && payload.count === maxVal && maxVal > 0) {
                        return (
                          <circle key={`peak-dot-${payload.hour}`} cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                        );
                      }
                      return <></>;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
