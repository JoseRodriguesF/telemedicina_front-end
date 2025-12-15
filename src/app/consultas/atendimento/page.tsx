"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import Button from '@/components/common/Buttons/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, useEffect } from 'react';
import { getUser, getToken } from '@/lib/auth';
import { createWebRTCSession } from '@/lib/webrtc';
import { psCreateRoom, psClaim, listParticipants } from '@/lib/axios/consultas';
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
  const pollingRef = useRef<number | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [consultaIdState, setConsultaIdState] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { author: 'Você', text: 'Olá' },
    { author: 'Médico', text: 'Olá, como se sente?' },
  ]);
  const [draft, setDraft] = useState('');
  const [chatReady, setChatReady] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const claimingRef = useRef(false);
  const startedRef = useRef(false);

  // Fluxo UI: ao entrar, o paciente "cria" a sala e já compartilha mídia.
  // Médico entra e compartilha sua mídia ao chegar.
  // Ao entrar, paciente cria sala + mídia; médico apenas abre mídia e faz claim.
  // Auto-start sem botão: inicia o fluxo uma única vez ao montar a página.
  // Protegido por ref para evitar re-execução em StrictMode/dev e loops.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (role === 'paciente' ? startPacienteFlow() : startMedicoFlow()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paciente: após obter consultaId, faça polling de participantes até haver 2 na sala
  useEffect(() => {
    if (role !== 'paciente') return;
    if (typeof window === 'undefined') return;
    const rawSession = sessionStorage.getItem('ps_room');
    const cid = getConsultaIdFromUrl() || consultaIdState || consultaId || '';
    // Only poll if we have a consulta id and either an active session or
    // the `consultaIdState` was explicitly set by the flow. This prevents
    // polling when the page is opened without a started session (causing
    // infinite GET /participants requests).
    if (!cid || !token) return;
    if (!rawSession && !consultaIdState) return;
    if (pollingRef.current !== null) return; // already polling
    let stopped = false;
    const check = async () => {
      // if we've already created a WebRTC session, stop polling
      if (sessionRef.current) {
        stopped = true;
        if (pollingRef.current !== null) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return;
      }
      try {
        const resp = await listParticipants(cid, token);
        if (!stopped && Array.isArray(resp?.participants) && resp.participants.length >= 2) {
          setStatusText('Conectado.');
          stopped = true;
          if (pollingRef.current !== null) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch {
        // ignore transient errors
      }
    };
    const timerId = window.setInterval(check, 1500);
    pollingRef.current = timerId;
    check();
    return () => {
      stopped = true;
      if (pollingRef.current !== null) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [role, consultaIdState, consultaId, token]);

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
    try {
      const stream = await session.startLocalMedia();
      if (localRef.current) {
        localRef.current.srcObject = stream;
        localRef.current.muted = true;
        await localRef.current.play().catch(() => {});
      }
    } catch (e) {
      setStatusText('Permissões de câmera/microfone negadas ou indisponíveis.');
    }
    session.onConnectionStateChange((state) => {
      if (state === 'connected') setStatusText('Conectado.');
    });
    session.onIceConnectionStateChange((state) => {
      if (state === 'connected' || state === 'completed') setStatusText('Conectado.');
      else if (state === 'disconnected') setStatusText('Conexão perdida. Tentando reconectar...');
      else if (state === 'failed') setStatusText('Falha de conexão.');
    });
    session.onSignalEvent((ev) => {
      if (ev === 'answerSent' || ev === 'answerReceived') setStatusText('Conectado.');
    });
    session.onRemoteTrack((stream) => {
      if (remoteRef.current) remoteRef.current.srcObject = stream;
      setStatusText('Conectado.');
    });
    // Answer é criado automaticamente ao receber offer no webrtc.ts
    try { sessionStorage.removeItem('ps_room'); } catch {}
    // Status será atualizado pelos eventos de conexão/sinalização e track remoto
  }

  async function startMedicoFlow() {
    if (!token || !wsBaseUrl) return;
    const u = getUser();
    if (u?.tipo_usuario !== 'medico') {
      alert('Apenas médicos podem atender pacientes. (forbidden_only_medico_can_claim)');
      return;
    }
    if (claimingRef.current) return;
    claimingRef.current = true;
    const cid = getConsultaIdFromUrl() || consultaIdState || '';
    try {
      const { roomId, consultaId, iceServers } = await psClaim(cid, token);
      setRoomId(roomId);
      setConsultaIdState(consultaId);
      const session = createWebRTCSession({ roomId, token, role, wsBaseUrl, iceServers });
      sessionRef.current = session;
      try {
        const stream = await session.startLocalMedia();
        if (localRef.current) {
          localRef.current.srcObject = stream;
          localRef.current.muted = true;
          await localRef.current.play().catch(() => {});
        }
      } catch (e) {
        setStatusText('Permissões de câmera/microfone negadas ou indisponíveis.');
      }
      session.onConnectionStateChange((state) => {
        if (state === 'connected') setStatusText('Conectado.');
      });
      session.onIceConnectionStateChange((state) => {
        if (state === 'connected' || state === 'completed') setStatusText('Conectado.');
        else if (state === 'disconnected') setStatusText('Conexão perdida. Tentando reconectar...');
        else if (state === 'failed') setStatusText('Falha de conexão.');
      });
      session.onSignalEvent((ev) => {
        if (ev === 'answerSent' || ev === 'answerReceived') setStatusText('Conectado.');
      });
      session.onRemoteTrack((stream) => {
        if (remoteRef.current) remoteRef.current.srcObject = stream;
        setStatusText('Conectado.');
      });
      setStatusText('Conectado. Iniciando oferta...');
      await session.createAndSendOffer();
    } catch (err: any) {
      const msg = String(err?.message || 'Falha ao iniciar oferta.');
      if (msg.includes('forbidden_only_medico_can_claim')) {
        alert('Apenas médicos podem realizar o claim da consulta.');
      } else if (msg.includes('medico_record_not_found_for_usuario')) {
        alert('Seu usuário não está vinculado a um cadastro de Médico. Complete o cadastro para continuar.');
      } else if (msg.includes('consulta_not_found')) {
        alert('Consulta não encontrada. Volte à fila e selecione novamente.');
        router.push('/consultas/pacientes');
      } else if (msg.includes('invalid_consulta_id')) {
        alert('ID da consulta inválido.');
        router.push('/consultas/pacientes');
      } else if (msg.includes('already_claimed_or_in_progress')) {
        alert('Outro médico já assumiu esta consulta. Atualize a fila e escolha outro paciente.');
        router.push('/consultas/pacientes');
      } else {
        alert(msg);
      }
    } finally {
      claimingRef.current = false;
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
            {/* O vídeo remoto sempre ocupa o retângulo grande (principal) */}
            <video
              ref={remoteRef}
              className="remote-video large"
              playsInline
              autoPlay
              aria-label={role === 'medico' ? 'Vídeo do paciente' : 'Vídeo do médico'}
            />
            {/* O vídeo local aparece em miniatura (picture-in-picture) */}
            <video
              ref={localRef}
              className="self-video pip"
              playsInline
              autoPlay
              aria-label="Sua câmera"
            />
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
