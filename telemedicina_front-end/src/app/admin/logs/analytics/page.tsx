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
  const [period, setPeriod] = useState<any>({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    periodo: 'mensal',
    category: '',
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fim: new Date().toISOString().split('T')[0]
  });
  const [logVisibility, setLogVisibility] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const getFriendlyName = (name: string) => {
    const map: Record<string, string> = {
      'LOGIN_SUCESSO': 'Login',
      'LOGIN': 'Tentativa Login',
      'REGISTER_PACIENTE': 'Novo Paciente',
      'REGISTER_MEDICO': 'Novo Médico',
      'ACCESS_PROFILE': 'Ver Perfil',
      'UPDATE_PROFILE': 'Editar Perfil',
      'ACCESS_DOCUMENT': 'Ver Documentos',
      'LIST_ANEXOS': 'Anexos',
      'LISTAGEM_HISTORICO_PRESCRICOES': 'Prescrições',
      'ENCERRAMENTO_CONSULTA': 'Fim Consulta',
      'APPROVE_MEDICO': 'Aprovar Médico',
      'CHAT': 'Chat IA',
      'CREATE_CONSULTA': 'Consultas'
    };
    return map[name] || name;
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams();
      
      if (period.inicio && period.fim) {
        params.append('inicio', period.inicio);
        params.append('fim', period.fim);
      } else {
        params.append('ano', period.ano);
        params.append('mes', period.mes);
        params.append('periodo', period.periodo);
      }
      
      if (period.category) params.append('category', period.category);
      
      const resp = await axios.get(`/api/admin/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = resp.data;
      setStats(data);

      // Sincronizar visibilidade com as categorias reais retornadas
      if (data.logStats) {
        setLogVisibility(prev => {
          const next = { ...prev };
          data.logStats.forEach((item: any) => {
            if (next[item.name] === undefined) next[item.name] = true;
          });
          return next;
        });
      }
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

  const activeLogStats = (stats?.logStats || [])
    .filter((s: any) => s.value > 0)
    .sort((a: any, b: any) => b.value - a.value);

  const pieData = activeLogStats.filter((s: any) => logVisibility[s.name] !== false);

  return (
    <DashboardLayout>
      <div className="analytics-container animate-fadeIn">
        <header className="analytics-header">
          <div className="header-info">
            {/* Botão voltar removido a pedido do usuário */}
          </div>

          <div className="analytics-filters glass">
            <div className="filter-group">
              <label>Ano</label>
              <select name="ano" value={period.ano} onChange={handlePeriodChange} disabled={!!(period.inicio && period.fim)}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Mês</label>
              <select name="mes" value={period.mes} onChange={handlePeriodChange} disabled={!!(period.inicio && period.fim)}>
                {Array.from({length: 12}, (_, i) => (
                  <option key={i+1} value={i+1}>{new Date(2024, i).toLocaleString('pt-BR', {month: 'long'})}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Período</label>
              <select name="periodo" value={period.periodo} onChange={handlePeriodChange} disabled={!!(period.inicio && period.fim)}>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            
            <div className="filter-group date-range">
              <label>Personalizado (Início - Fim)</label>
              <div className="range-inputs">
                <input type="date" name="inicio" value={period.inicio} onChange={(e) => setPeriod({...period, inicio: e.target.value})} />
                <input type="date" name="fim" value={period.fim} onChange={(e) => setPeriod({...period, fim: e.target.value})} />
                {(period.inicio || period.fim) && (
                  <button className="btn-clear-date" onClick={() => setPeriod({...period, inicio: '', fim: ''})}>×</button>
                )}
              </div>
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
              <div className="kpi-card glass log-focus audit-total">
                <div className="kpi-icon icon-purple">📋</div>
                <div className="kpi-data">
                  <span className="kpi-label">Total Auditado</span>
                  <span className="kpi-value">{stats?.logStats?.reduce((acc: any, curr: any) => acc + curr.value, 0) || 0}</span>
                </div>
              </div>
              <div className="kpi-card glass log-focus audit-today">
                <div className="kpi-icon icon-blue">⚡</div>
                <div className="kpi-data">
                  <span className="kpi-label">Volume Hoje</span>
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
                        stroke="var(--text-tertiary)"
                        dy={10}
                      />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="var(--text-tertiary)" dx={-5} />
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
               <div className="section-filters" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="filter-date-mini">
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Início</label>
                    <input 
                      type="date" 
                      className="input-premium-mini"
                      value={period.inicio}
                      onChange={(e) => setPeriod({...period, inicio: e.target.value})}
                    />
                  </div>
                  <div className="filter-date-mini">
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Fim</label>
                    <input 
                      type="date" 
                      className="input-premium-mini"
                      value={period.fim}
                      onChange={(e) => setPeriod({...period, fim: e.target.value})}
                    />
                  </div>
               </div>
            </div>

            <div className="pie-analysis-grid">
              <div className="chart-card glass">
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                      >
                        {pieData.map((entry: any) => {
                          const originalIndex = activeLogStats.findIndex((s: any) => s.name === entry.name);
                          return <Cell key={`cell-${originalIndex}`} fill={COLORS[originalIndex % COLORS.length]} />;
                        })}
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
                  <p>Categorias com eventos no período</p>
                </div>
                <div className="custom-legend-list">
                  {activeLogStats.map((entry: any, index: number) => (
                    <div key={index} className={`legend-item-premium ${logVisibility[entry.name] === false ? 'muted' : ''}`}>
                      <div className="checkbox-hit-area">
                        <input 
                          type="checkbox" 
                          className="log-toggle-checkbox"
                          checked={logVisibility[entry.name] !== false}
                          onChange={() => setLogVisibility({ ...logVisibility, [entry.name]: !logVisibility[entry.name] })}
                        />
                      </div>
                      <div className="legend-marker" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <div className="legend-info">
                        <span className="legend-name">{getFriendlyName(entry.name)}</span>
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
