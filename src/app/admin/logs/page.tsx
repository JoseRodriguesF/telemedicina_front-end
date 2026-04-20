'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getToken } from '@/lib/auth';
import axios from '@/lib/axios/config';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import './admin-logs.css';

interface AuditLog {
  id: number;
  usuarioId: number;
  acao: string;
  recurso: string;
  recursoId?: number;
  detalhes?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export default function AdminLogsPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <AdminLogsContent />
    </Suspense>
  );
}

function AdminLogsContent() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const [filter, setFilter] = useState({
    q: searchParams.get('q') || '',
    inicio: searchParams.get('inicio') || '',
    fim: searchParams.get('fim') || '',
  });

  useEffect(() => {
    fetchLogs();
  }, [filter.inicio, filter.fim]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (filter.q) params.append('q', filter.q);
      if (filter.inicio) params.append('inicio', filter.inicio);
      if (filter.fim) params.append('fim', filter.fim);

      const resp = await axios.get(`/api/admin/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(resp.data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('LOGIN')) return 'badge-login';
    if (action.includes('APPROVE') || action.includes('CREATE') || action.includes('CONFIRMACAO')) return 'badge-success';
    if (action.includes('REJECT') || action.includes('DELETE') || action.includes('CANCEL') || action.includes('ANULACAO') || action.includes('FAIL')) return 'badge-danger';
    return 'badge-info';
  };

  return (
    <DashboardLayout>
      <div className="admin-logs-container animate-fadeIn">
        <header className="logs-header">
          <div className="header-info">
            <div className="header-top">
              <button className="btn-back" onClick={() => router.back()}>← Voltar</button>
              <button className="btn-analytics" onClick={() => router.push('/admin/logs/analytics')}>
                📊 Ver Analytics
              </button>
            </div>
            <h1>Trilha de Auditoria</h1>
            <p>Monitoramento completo de ações e eventos de segurança do sistema.</p>
          </div>
        </header>

        <section className="logs-filters glass">
          <form className="filter-form" onSubmit={handleSearch}>
            <div className="filter-group main-search">
              <label>Busca por CPF, ID ou Ação</label>
              <div className="search-input-wrapper">
                <input 
                  type="text" 
                  placeholder="Ex: 123.456.789-00 ou CONFIRMACAO..." 
                  value={filter.q}
                  onChange={(e) => setFilter({...filter, q: e.target.value})}
                />
                <button type="submit" className="btn-search">Buscar</button>
              </div>
            </div>

            <div className="filter-group">
              <label>Data Início</label>
              <input 
                type="date" 
                value={filter.inicio}
                onChange={(e) => setFilter({...filter, inicio: e.target.value})}
              />
            </div>

            <div className="filter-group">
              <label>Data Fim</label>
              <input 
                type="date" 
                value={filter.fim}
                onChange={(e) => setFilter({...filter, fim: e.target.value})}
              />
            </div>

            <button type="button" className="btn-reset" onClick={() => setFilter({q: '', inicio: '', fim: ''})}>
              Limpar
            </button>
          </form>
        </section>

        <div className="logs-table-wrapper glass">
          {loading ? (
            <div className="logs-loading">
              <div className="spinner"></div>
              <p>Carregando trilha de auditoria...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="logs-empty">
              <p>Nenhum log de auditoria encontrado.</p>
            </div>
          ) : (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Recurso</th>
                  <th>Detalhes</th>
                  <th>IP / Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="col-date">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="col-user">ID: {log.usuarioId}</td>
                    <td className="col-action">
                      <span className={`badge ${getActionBadgeClass(log.acao)}`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="col-resource">
                      <strong>{log.recurso}</strong>
                      {log.recursoId && <span className="resource-id">#{log.recursoId}</span>}
                    </td>
                    <td className="col-details">{log.detalhes || '-'}</td>
                    <td className="col-device">
                      <div className="ip-info">{log.ip || 'N/A'}</div>
                      <div className="ua-info" title={log.userAgent}>{log.userAgent?.substring(0, 30)}...</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
