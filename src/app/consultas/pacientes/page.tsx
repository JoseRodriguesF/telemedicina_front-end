"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Button from '@/components/common/Buttons/Button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUserFirstName } from '@/lib/auth';
import { listWaitingConsultas, WaitingConsulta } from '@/lib/axios/consultas';

type Paciente = {
  id: string; // consultaId associado
  nome: string;
  status: 'aguardando' | 'em_consulta' | 'concluido' | 'cancelado';
  prioridade?: 'alta' | 'normal' | 'baixa';
};

const POLL_MS = 5000;

export default function PacientesPage() {
  const router = useRouter();
  const [medicoNome, setMedicoNome] = useState('');
  const [pacientes, setPacientes] = useState<WaitingConsulta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMedicoNome(getUserFirstName());
    const token = typeof window !== 'undefined' ? localStorage.getItem('telemedicina_token') || '' : '';
    let mounted = true;
    const fetchList = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const list = await listWaitingConsultas(token);
        if (mounted) {
          setPacientes(list);
          setError(null);
        }
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.error || 'Falha ao carregar fila');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchList();
    const id = setInterval(fetchList, POLL_MS);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return (
    <div className="inicio-page">
      <div className="inicio-mobile-header" />
      <Sidebar activeId="consultas" />
      <main className="inicio-main">
        <div className="center-card">
          <h2>Pacientes disponíveis • Dr(a). {medicoNome}</h2>
          <div className="pac-list">
            {loading && <div className="pac-loading">Carregando fila...</div>}
            {error && <div className="pac-error">{error}</div>}
            {pacientes.map((p) => (
              <div key={p.id} className="pac-item">
                <div className="pac-info">
                  <div className="pac-name">{p.nome}</div>
                  <div className={`pac-status s-${p.status}`}>Status: {p.status.replace('_', ' ')}</div>
                  {p.prioridade && <div className={`pac-prio pr-${p.prioridade}`}>Prioridade: {p.prioridade}</div>}
                </div>
                <div className="pac-actions">
                  <Button variant="primary" onClick={() => router.push(`/consultas/atendimento?id=${encodeURIComponent(p.id)}`)}>Atender</Button>
                </div>
              </div>
            ))}
            {!loading && pacientes.length === 0 && !error && (
              <div className="pac-empty">Nenhum paciente aguardando no momento.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
