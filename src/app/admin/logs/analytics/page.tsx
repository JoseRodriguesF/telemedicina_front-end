'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getToken } from '@/lib/auth';
import axios from '@/lib/axios/config';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import './analytics.css';

const COLORS = ['#005bbf', '#00c49f', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    periodo: 'mensal'
  });
  const router = useRouter();

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const resp = await axios.get(`/api/admin/stats?ano=${period.ano}&mes=${period.mes}&periodo=${period.periodo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(resp.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPeriod({ ...period, [name]: value });
  };

  return (
    <DashboardLayout>
      <div className="analytics-container animate-fadeIn">
        <header className="analytics-header">
          <div className="header-info">
            <button className="btn-back" onClick={() => router.back()}>← Voltar</button>
            <h1>Analytics & Insights do Sistema</h1>
            <p>Visão profunda sobre todas as ações e tráfego gerado na plataforma.</p>
          </div>

          <div className="analytics-filters glass">
            <div className="filter-group">
              <label>Ano</label>
              <select name="ano" value={period.ano} onChange={handlePeriodChange}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Mês</label>
              <select name="mes" value={period.mes} onChange={handlePeriodChange}>
                {Array.from({length: 12}, (_, i) => (
                  <option key={i+1} value={i+1}>{new Date(2024, i).toLocaleString('pt-BR', {month: 'long'})}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Período</label>
              <select name="periodo" value={period.periodo} onChange={handlePeriodChange}>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="analytics-loading">
            <div className="spinner"></div>
            <p>Processando dados analíticos...</p>
          </div>
        ) : (
          <div className="analytics-grid">
            {/* KPI Row - Focused only on Logs */}
            <div className="kpi-row-centered">
              <div className="kpi-card glass log-focus">
                <div className="kpi-icon">📋</div>
                <div className="kpi-data">
                  <span className="kpi-label">Total de Eventos Auditados</span>
                  <span className="kpi-value">{stats?.logStats?.reduce((acc: any, curr: any) => acc + curr.value, 0) || 0}</span>
                </div>
              </div>
              <div className="kpi-card glass log-focus">
                <div className="kpi-icon">⚡</div>
                <div className="kpi-data">
                  <span className="kpi-label">Volume de Hoje</span>
                  <span className="kpi-value">{stats?.dailyLogs?.find((l: any) => l.date === new Date().toISOString().split('T')[0])?.count || 0}</span>
                </div>
              </div>
            </div>

            {/* Main Charts Row */}
            <div className="charts-row">
              <div className="chart-card glass large">
                <div className="card-header">
                  <h3>Volume de Atividade Diária (Logs)</h3>
                  <p>Ações registradas por dia no período selecionado</p>
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={stats?.dailyLogs || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(str) => {
                           try {
                             return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                           } catch(e) { return str; }
                        }}
                        axisLine={false}
                        tickLine={false}
                        fontSize={12}
                      />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', background: 'rgba(255,255,255,0.95)', border: 'none', color: '#1a1a1a' }}
                        labelFormatter={(str) => new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      />
                      <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#005bbf" />
                          <stop offset="100%" stopColor="#00c49f" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Pie Chart Section with Separate Legend */}
            <div className="analytics-section-header">
               <div className="section-title">
                 <h2>Distribuição de Ações</h2>
                 <p>Análise categórica de todos os eventos registrados</p>
               </div>
               <div className="section-filters">
                 <select className="filter-select-premium">
                   <option>Todas as Categorias</option>
                   <option>Autenticação</option>
                   <option>Gestão de Usuários</option>
                   <option>Documentos</option>
                 </select>
                 <select className="filter-select-premium">
                   <option>Ordenar por Volume</option>
                   <option>Ordenar A-Z</option>
                 </select>
               </div>
            </div>

            <div className="pie-analysis-grid">
              <div className="chart-card glass">
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={stats?.logStats || []}
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                      >
                        {(stats?.logStats || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="legend-card glass">
                <div className="card-header">
                  <h3>Legenda & Detalhes</h3>
                  <p>Categorias de eventos monitorados</p>
                </div>
                <div className="custom-legend-list">
                  {(stats?.logStats || []).sort((a: any, b: any) => b.value - a.value).map((entry: any, index: number) => (
                    <div key={index} className="legend-item-premium">
                      <div className="legend-marker" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <div className="legend-info">
                        <span className="legend-name">{entry.name}</span>
                        <span className="legend-value">{entry.value} <small>eventos</small></span>
                      </div>
                      <div className="legend-percent">
                        {Math.round((entry.value / stats.logStats.reduce((a: any, b: any) => a + b.value, 0)) * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
