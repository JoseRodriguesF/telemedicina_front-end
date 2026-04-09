'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { getToken } from '@/lib/auth';
import axios from '@/lib/axios/config';
import './admin-dashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AdminDashboard() {
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
      <header className="admin-header">
        <div className="header-content">
          <h1>Dashboard Administrativo</h1>
          <p>Visão geral e análises de desempenho da plataforma</p>
        </div>
        
        <div className="admin-filters">
          <select 
            value={filter.periodo} 
            onChange={(e) => setFilter({...filter, periodo: e.target.value})}
            className="admin-select"
          >
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
          </select>

          <select 
            value={filter.ano} 
            onChange={(e) => setFilter({...filter, ano: e.target.value})}
            className="admin-select"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {filter.periodo === 'mensal' && (
            <select 
              value={filter.mes} 
              onChange={(e) => setFilter({...filter, mes: e.target.value})}
              className="admin-select"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <div className="admin-stats-grid">
        {/* Card 1: Horários de Pico */}
        <div className="admin-card glass">
          <div className="card-header">
            <h3>Frequência por Horário</h3>
            <span className="badge">Pico vs Ocioso</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.hourly || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="hour" tickFormatter={(value) => `${value}h`} />
                <YAxis />
                <Tooltip 
                  cursor={{fill: 'rgba(0, 91, 191, 0.05)'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Especialidade vs Gênero */}
        <div className="admin-card glass">
          <div className="card-header">
            <h3>Distribuição por Especialidade e Gênero</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.specialtyGender || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" />
                <YAxis dataKey="specialty" type="category" width={100} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Legend />
                <Bar dataKey="Masculino" stackId="a" fill="#005bbf" />
                <Bar dataKey="Feminino" stackId="a" fill="#ff4081" />
                <Bar dataKey="Outro" stackId="a" fill="#9c27b0" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Top CIDs */}
        <div className="admin-card glass">
          <div className="card-header">
            <h3>CIDs Mais Frequentes</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.topCids || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="cid"
                >
                  {stats?.topCids?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Resumo Geral */}
        <div className="admin-card glass summary-card">
          <div className="card-header">
            <h3>Resumo do Período</h3>
          </div>
          <div className="summary-content">
            <div className="stat-item">
              <span className="label">Total de Consultas</span>
              <span className="value">{stats?.totalConsultations || 0}</span>
            </div>
            <div className="stat-item">
              <span className="label">Média Diária</span>
              <span className="value">{(stats?.totalConsultations / 30).toFixed(1)}</span>
            </div>
            <div className="stat-item">
              <span className="label">Especialidade Líder</span>
              <span className="value">{stats?.specialtyGender?.[0]?.specialty || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
