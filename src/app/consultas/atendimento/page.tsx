"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import Button from '@/components/common/Buttons/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';
import { getUser, getToken } from '@/lib/auth';
import { createWebRTCSession } from '@/lib/webrtc';
import { psCreateRoom, psClaim } from '@/lib/axios/consultas';
import { getSignalUrl, getConsultaIdFromUrl } from '@/lib/signal';

type ChatMessage = { author: 'Você' | 'Médico' | 'Paciente'; text: string };

  function AtendimentoInner() {
  const router = useRouter();
  const search = useSearchParams();
  const consultaId = search.get('id') || '';
  const user = getUser();
  const token = getToken();
  const role = (user?.tipo_usuario === 'medico' ? 'medico' : 'paciente') as 'medico' | 'paciente';
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  const wsBaseUrl = getSignalUrl(apiUrl);
  // Modo UI: organizar telas/estilo sem lógica de API/signaling.

  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const [connecting, setConnecting] = useState(false);
  const sessionRef = useRef<ReturnType<typeof createWebRTCSession> | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [consultaIdState, setConsultaIdState] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { author: 'Você', text: 'Olá' },
    { author: 'Médico', text: 'Olá, como se sente?' },
  ]);
  const [draft, setDraft] = useState('');
  const [chatReady, setChatReady] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  // Fluxo UI: ao entrar, o paciente "cria" a sala e já compartilha mídia.
  // Médico entra e compartilha sua mídia ao chegar.
  // Ao entrar, paciente cria sala + mídia; médico apenas abre mídia e faz claim.
  // Auto-start sem botão: inicia o fluxo ao montar a página.
  if (!connecting) {
    setTimeout(() => {
      role === 'paciente' ? startPacienteFlow().catch(() => {}) : startMedicoFlow().catch(() => {});
    }, 0);
  }

  function sendMessage() {
    const t = draft.trim();
    if (!t) return;
    setMessages([...messages, { author: 'Você', text: t }]);
    setDraft('');
  }

  async function startLocalMedia() {
    try {
      setConnecting(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localRef.current) {
        localRef.current.srcObject = stream;
        localRef.current.muted = true;
        await localRef.current.play().catch(() => {});
      }
      setStatusText(role === 'paciente' ? 'Sala criada. Aguardando médico...' : 'Conectado. Aguardando paciente...');
    } catch (e) {
      setStatusText('Permissões de câmera/microfone negadas ou indisponíveis.');
    } finally {
      setConnecting(false);
    }
  }

  async function startPacienteFlow() {
    if (!token || !wsBaseUrl) return;
    await startLocalMedia();
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('ps_room') : null;
    if (!raw) {
      // Não exibir mensagem de erro aqui para não confundir o paciente;
      // apenas manter o status padrão.
      setStatusText(null);
      return;
    }
    let data: { roomId: string; consultaId: string; iceServers: any };
    try { data = JSON.parse(raw!); } catch { setStatusText('Dados da consulta inválidos.'); return; }
    setRoomId(data.roomId);
    setConsultaIdState(data.consultaId);
    const session = createWebRTCSession({ roomId: data.roomId, token, role, wsBaseUrl, iceServers: data.iceServers });
    sessionRef.current = session;
    session.onRemoteTrack((stream) => { if (remoteRef.current) remoteRef.current.srcObject = stream; });
    // Answer é criado automaticamente ao receber offer no webrtc.ts
    try { sessionStorage.removeItem('ps_room'); } catch {}
    // Ajustar status para ficar claro que está aguardando o médico
    setStatusText('Sala criada. Aguardando médico...');
  }

  async function startMedicoFlow() {
    if (!token || !wsBaseUrl) return;
    const u = getUser();
    if (u?.tipo_usuario !== 'medico') {
      alert('Apenas médicos podem atender pacientes. (forbidden_only_medico_can_claim)');
      return;
    }
    await startLocalMedia();
    const cid = getConsultaIdFromUrl() || consultaIdState || '';
    const { roomId, consultaId, iceServers } = await psClaim(cid, token);
    setRoomId(roomId);
    setConsultaIdState(consultaId);
    const session = createWebRTCSession({ roomId, token, role, wsBaseUrl, iceServers });
    sessionRef.current = session;
    session.onRemoteTrack((stream) => { if (remoteRef.current) remoteRef.current.srcObject = stream; });
    // Médico é quem envia a offer
    try {
      await session.createAndSendOffer();
    } catch (err: any) {
      const msg = String(err?.message || 'Falha ao iniciar oferta.');
      if (msg.includes('forbidden_only_medico_can_claim')) {
        alert('Apenas médicos podem realizar o claim da consulta.');
      } else if (msg.includes('medico_record_not_found_for_usuario')) {
        alert('Seu usuário não está vinculado a um cadastro de Médico. Complete o cadastro para continuar.');
      } else if (msg.includes('consulta_not_found')) {
        alert('Consulta não encontrada. Volte à fila e selecione novamente.');
      } else if (msg.includes('invalid_consulta_id')) {
        alert('ID da consulta inválido.');
      } else if (msg.includes('already_claimed_or_in_progress')) {
        alert('Consulta já foi atribuída ou está em andamento por outro médico.');
      } else {
        alert(msg);
      }
    }
  }

  function finishCall() {
    try { sessionRef.current?.end(); } catch {}
    try { sessionStorage.removeItem('ps_room'); } catch {}
    router.push('/consultas');
  }

  return (
    <div className="atendimento-page">
      <main className="atendimento-main">
        <section className="call-area">
          <div className="call-header">Você está em uma consulta</div>
          <div className="call-screen">
            <video ref={remoteRef} className="remote-video" playsInline autoPlay aria-label="Vídeo remoto" />
            <video ref={localRef} className="self-video" playsInline autoPlay aria-label="Sua câmera" />
          </div>
          <div className="call-controls">
            <button className="control-btn" aria-label="Abrir chat">💬</button>
            <button className="control-btn end" aria-label="Encerrar chamada" onClick={finishCall}>📞</button>
          </div>
          {connecting && <div className="call-status" aria-live="polite">Conectando...</div>}
          {statusText && !connecting && <div className="call-status" aria-live="polite">{statusText}</div>}
        </section>

        <aside className="chat-panel" aria-label="Chat da consulta">
          <div className="chat-header">Chat da consulta</div>
          <div className="chat-body">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-msg ${m.author === 'Você' ? 'me' : 'doctor'}`}>
                <div className="chat-author">{m.author}</div>
                <div className="chat-bubble">{m.text}</div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              className="c-input"
              placeholder="Digite..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            />
            <Button variant="primary" onClick={sendMessage} aria-label="Enviar">➤</Button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function AtendimentoPage() {
  return (
    <Suspense fallback={<div className="atendimento-loading">Carregando atendimento...</div>}>
      <AtendimentoInner />
    </Suspense>
  );
}
