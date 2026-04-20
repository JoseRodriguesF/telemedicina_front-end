'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getToken } from '@/lib/auth';
import axios from '@/lib/axios/config';
import { useRouter } from 'next/navigation';
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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const resp = await axios.get('/api/admin/audit', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(resp.data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('LOGIN')) return 'badge-login';
    if (action.includes('APPROVE') || action.includes('CREATE')) return 'badge-success';
    if (action.includes('REJECT') || action.includes('DELETE')) return 'badge-danger';
    return 'badge-info';
  };

  return (
    <DashboardLayout>
      <div className="admin-logs-container animate-fadeIn">
        <header className="logs-header">
          <div className="header-info">
            <button className="btn-back" onClick={() => router.back()}>← Voltar</button>
            <h1>Trilha de Auditoria</h1>
            <p>Monitoramento completo de ações e eventos de segurança do sistema.</p>
          </div>
          <button className="btn-refresh-logs" onClick={fetchLogs} disabled={loading}>
            {loading ? 'Atualizando...' : '🔄 Atualizar Logs'}
          </button>
        </header>

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
