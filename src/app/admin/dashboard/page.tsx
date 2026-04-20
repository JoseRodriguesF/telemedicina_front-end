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
      const resp = await axios.get(`/admin/stats?${params.toString()}`, {
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

        {/* Main Analytics Grid */}
        <div className="admin-main-grid">

          {/* Card 1: Horários de Pico (Area Chart for smoothness) */}
          <div className="admin-chart-card glass">
            <div className="card-header">
              <div>
                <h3>Fluxo de Atendimento</h3>
                <p>Volume de pacientes por faixa horária (24h)</p>
              </div>
              <span className="badge">Pico: {stats?.hourly?.reduce((max: any, curr: any) => curr.count > max.count ? curr : max, { count: 0 })?.hour}h</span>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={stats?.hourly || []}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Especialidade vs Gênero */}
          <div className="admin-chart-card glass">
            <div className="card-header">
              <div>
                <h3>Perfil por Especialidade</h3>
                <p>Distribuição de gênero por área médica</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={stats?.specialtyGender || []} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="specialty" type="category" width={100} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="Masculino" stackId="a" fill="var(--color-primary-500)" radius={[0, 0, 0, 0]} barSize={20} />
                  <Bar dataKey="Feminino" stackId="a" fill="#e91e63" radius={[0, 0, 0, 0]} barSize={20} />
                  <Bar dataKey="Outro" stackId="a" fill="#9c27b0" radius={[4, 4, 4, 4]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3: Top CIDs */}
          <div className="admin-chart-card glass cid-distribution">
            <div className="card-header">
              <div>
                <h3>Morbitidade (Top CIDs)</h3>
                <p>Diagnósticos mais frequentes no período</p>
              </div>
            </div>
            <div className="cid-content">
              <div className="cid-pie">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stats?.topCids || []}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={85}
                      paddingAngle={8}
                      dataKey="count" nameKey="cid"
                    >
                      {stats?.topCids?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="cid-list">
                {stats?.topCids?.slice(0, 5).map((item: any, idx: number) => (
                  <div key={idx} className="cid-item">
                    <span className="cid-bullet" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    <span className="cid-label">{item.cid}</span>
                    <span className="cid-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4: Recent Audit Actions */}
          <div className="admin-chart-card glass audit-summary">
            <div className="card-header">
              <div>
                <h3>Atividade do Sistema</h3>
                <p>Monitoramento de integridade e auditoria</p>
              </div>
              <button className="btn-view-all" onClick={() => router.push('/admin/logs')}>Ver Tudo</button>
            </div>
            <div className="audit-list">
                {(!stats?.recentLogs || stats.recentLogs.length === 0) ? (
                  <div className="audit-empty" style={{padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem'}}>
                    Nenhuma atividade registrada na trilha de auditoria.
                  </div>
                ) : (
                  stats.recentLogs.slice(0, 3).map((log: any) => (
                    <div key={log.id} className="audit-item success">
                        <span className="audit-icon">✓</span>
                        <div className="audit-info">
                            <strong>{log.acao}</strong>
                            <p>{log.recurso} • {new Date(log.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                    </div>
                  ))
                )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
