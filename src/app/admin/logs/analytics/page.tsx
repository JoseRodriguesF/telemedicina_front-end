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
            {/* KPI Row */}
            <div className="kpi-row">
              <div className="kpi-card glass">
                <span className="kpi-label">Consultas no Período</span>
                <span className="kpi-value">{stats?.totalConsultations || 0}</span>
                <div className="kpi-meta">Volume total filtrado</div>
              </div>
              <div className="kpi-card glass">
                <span className="kpi-label">Eventos de Auditoria</span>
                <span className="kpi-value">{stats?.logStats?.reduce((acc: any, curr: any) => acc + curr.value, 0) || 0}</span>
                <div className="kpi-meta">Ações monitoradas</div>
              </div>
              <div className="kpi-card glass">
                <span className="kpi-label">Pacientes na Base</span>
                <span className="kpi-value">{stats?.totalPatients || 0}</span>
                <div className="kpi-meta">Usuários cadastrados</div>
              </div>
              <div className="kpi-card glass">
                <span className="kpi-label">Corpo Clínico</span>
                <span className="kpi-value">{stats?.totalDoctors || 0}</span>
                <div className="kpi-meta">Médicos verificados</div>
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

              <div className="chart-card glass">
                <div className="card-header">
                  <h3>Distribuição de Ações</h3>
                  <p>Tipos de eventos auditados</p>
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={stats?.logStats || []}
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {(stats?.logStats || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none' }}
                      />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Secondary Charts Row */}
            <div className="charts-row">
              <div className="chart-card glass">
                <div className="card-header">
                  <h3>Fluxo de Consultas (Horário)</h3>
                  <p>Picos de atendimento por hora</p>
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats?.hourly || []}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" unit="h" axisLine={false} tickLine={false} fontSize={12} />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card glass">
                <div className="card-header">
                  <h3>Top Especialidades</h3>
                  <p>Demanda por área médica</p>
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats?.specialtyGender?.slice(0, 5) || []} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="specialty" type="category" width={100} axisLine={false} tickLine={false} fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Masculino" stackId="a" fill="#005bbf" />
                      <Bar dataKey="Feminino" stackId="a" fill="#ec4899" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="chart-card glass">
                <div className="card-header">
                  <h3>Diagnósticos Frequentes (CID)</h3>
                  <p>Principais ocorrências registradas</p>
                </div>
                <div className="chart-box">
                  <div className="cid-list-compact">
                    {(stats?.topCids || []).slice(0, 5).map((item: any, idx: number) => (
                      <div key={idx} className="cid-item-mini">
                        <div className="cid-labels">
                          <span className="code">{item.cid}</span>
                          <span className="count">{item.count}</span>
                        </div>
                        <div className="cid-progress">
                          <div 
                            className="fill" 
                            style={{ width: `${(item.count / (stats?.topCids[0]?.count || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
