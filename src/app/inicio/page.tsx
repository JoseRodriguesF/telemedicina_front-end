"use client";

import './inicio.css';
import '@/components/layout/Header/header.css';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ReconnectConsultaModal from '@/components/common/Modals/ReconnectConsultaModal';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { getUser, getUserFirstName, getToken } from '@/lib/auth';
import { psListActiveRooms } from '@/lib/axios/consultas';

export default function InicioPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [showReconnect, setShowReconnect] = useState(false);
  const [reconnectData, setReconnectData] = useState<{ roomId: string; consultaId: string; userId: string; role: string } | null>(null);

  useEffect(() => {
    const u = getUser();
    setDisplayName(getUserFirstName(u));
    const token = getToken();
    // Verifica consulta ativa no sessionStorage
    let found = false;
    try {
      const raw = sessionStorage.getItem('consulta_reconnect');
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.userId && u && String(data.userId) === String(u.id)) {
          setReconnectData(data);
          setShowReconnect(true);
          found = true;
        }
      }
    } catch { }
    // Se não achou no sessionStorage, busca no backend
    if (!found && token && u) {
      const currentUserId = String(u.id);

      console.log("[Debug Reconnect] Buscando salas ativas para userId:", currentUserId);

      // Nova lógica unificada: enviamos apenas o ID do usuário logado e confiamos no filtro do backend
      psListActiveRooms(token, currentUserId).then((rooms) => {
        console.log("[Debug Reconnect] Salas retornadas:", rooms);

        if (Array.isArray(rooms) && rooms.length > 0) {
          const sala = rooms[0];
          console.log("[Debug Reconnect] Ativando modal para a sala:", sala);

          // O papel no modal segue o perfil do usuário logado
          const calculatedRole = u.tipo_usuario === 'medico' ? 'medico' : 'paciente';

          setReconnectData({
            roomId: sala.roomId || (sala as any).room_id || '',
            consultaId: sala.consultaId || (sala as any).consulta_id || '',
            userId: currentUserId,
            role: calculatedRole
          });
          setShowReconnect(true);
        } else {
          console.log("[Debug Reconnect] Nenhuma sala ativa retornada para este usuário.");
        }
      }).catch((err) => {
        console.error("[Debug Reconnect] Erro ao verificar salas ativas:", err);
      });
    }
  }, []);

  const handleReconnect = () => {
    if (reconnectData) {
      router.push(`/consultas/atendimento?id=${reconnectData.consultaId}`);
    }
  };

  return (
    <div className="inicio-page">
      {/* Mobile header only; desktop keeps sidebar */}
      <div className="inicio-mobile-header">
        <MobileInicioHeader />
      </div>
      <Sidebar activeId="inicio" />

      <main className="inicio-main">
        <div className="center-card">
          <h2>Bem-vindo, {displayName}!</h2>
        </div>
      </main>
      <ReconnectConsultaModal
        open={showReconnect}
        onClose={() => setShowReconnect(false)}
        onReconnect={handleReconnect}
        consultaId={reconnectData?.consultaId || ''}
        role={reconnectData?.role || ''}
      />
    </div>
  );
}

function MobileInicioHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onResize() { if (window.innerWidth > 900 && open) setOpen(false); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <h1 className="brand">Telemedicina</h1>
        <button
          className={`hamburger ${open ? 'is-open' : ''}`}
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </div>

      <nav className={`mobile-menu ${open ? 'open' : ''}`} aria-hidden={!open}>
        <Link href="/inicio" onClick={() => setOpen(false)} className="mobile-link">Início</Link>
        <Link href="/consultas" onClick={() => setOpen(false)} className="mobile-link">Consultas</Link>
        <Link href="/historico" onClick={() => setOpen(false)} className="mobile-link">Histórico</Link>
        <Link href="/perfil" onClick={() => setOpen(false)} className="mobile-link">Perfil</Link>
        <Link href="/configuracoes" onClick={() => setOpen(false)} className="mobile-link">Configurações</Link>
      </nav>
    </header>
  );
}
