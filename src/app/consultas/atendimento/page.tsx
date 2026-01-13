"use client";

import './atendimento.css';
import '@/components/layout/Header/header.css';
import Header from '@/components/layout/Header/Header';
import Button from '@/components/common/Buttons/Button';
import ConfirmationModal from '@/components/common/Modals/ConfirmationModal/ConfirmationModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, useEffect } from 'react';
import { getUser, getToken } from '@/lib/auth';
import { createWebRTCSession } from '@/lib/webrtc';
import { psCreateRoom, psClaim, listParticipants, endConsulta } from '@/lib/axios/consultas';
import { getSignalUrl, getConsultaIdFromUrl } from '@/lib/signal';

type ChatMessage = { author: 'Você' | 'Médico' | 'Paciente'; text: string };

function AtendimentoInner() {
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const handleConnected = () => {
    setStatusText('Conectado.');
    setConnectionFailed(false);
    setReconnecting(false);
  };

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [chatReady, setChatReady] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const claimingRef = useRef(false);
  const startedRef = useRef(false);
  const [showChat, setShowChat] = useState(true);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

  // Mídia controls
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [remoteHasAudio, setRemoteHasAudio] = useState(false);
  const [remoteDisconnected, setRemoteDisconnected] = useState(false);
  // Médico entra e compartilha sua mídia ao chegar.
  // Ao entrar, paciente cria sala + mídia; médico apenas abre mídia e faz claim.
  // Auto-start sem botão: inicia o fluxo uma única vez ao montar a página.
  // Protegido por ref para evitar re-execução em StrictMode/dev e loops.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startAtendimentoFlow().catch(() => { });

    // Warn on close/reload
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    // Monitorar status da internet
    const handleOnline = () => {
      if (connectionFailed) {
        setReconnecting(true);
        // Tentar reconectar
        window.location.reload(); // Simples: recarrega a página para restabelecer sessão
      }
    };
    const handleOffline = () => {
      setConnectionFailed(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling de participantes: detecta quando o outro usuário entra e dispara a conexão
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cid = getConsultaIdFromUrl() || consultaIdState || consultaId || '';
    if (!cid || !token) return;
    if (pollingRef.current !== null) return;

    let stopped = false;
    const check = async () => {
      try {
        const resp = await listParticipants(cid, token);
        if (!stopped && Array.isArray(resp?.participants) && resp.participants.length >= 2) {
          handleConnected();

          // Se sou o médico e o outro entrou, mas ainda não conectamos o vídeo, dispara a oferta.
          // Isso resolve a condição de corrida onde o médico tentava conectar antes do paciente abrir o socket.
          if (role === 'medico' && sessionRef.current && !remoteConnected) {
            console.log('Detectado 2 participantes. Médico iniciando oferta...');
            sessionRef.current.createAndSendOffer().catch(() => { });
          }
        }
      } catch { }
    };
    const timerId = window.setInterval(check, 2000);
    pollingRef.current = timerId;
    check();
    return () => {
      stopped = true;
      if (pollingRef.current !== null) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, consultaIdState, consultaId, token, remoteConnected]);

  // Auto-scroll chat
  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  function sendMessage() {
    const t = draft.trim();
    if (!t) return;
    setMessages((prev) => [...prev, { author: 'Você', text: t }]);
    sessionRef.current?.sendMessage(t);
    setDraft('');
  }

  async function getRobustLocalMedia() {
    let stream: MediaStream | null = null;
    let errorMsg = '';

    // 1. Try Video + Audio
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e) {
      // 2. Try Audio only (No Camera or Permission Denied for Camera)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Warn user
        errorMsg = 'Câmera não detectada ou permissão negada. Apenas áudio será enviado.';
      } catch (e2) {
        // 3. Try Video only (No Mic)
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          errorMsg = 'Microfone não detectado ou permissão negada. Apenas vídeo será enviado.';
        } catch (e3) {
          // 4. Give up (Receive Only)
          stream = null;
          errorMsg = 'Sem câmera e microfone detectados. Modo apenas espectador.';
        }
      }
    }

    // Sync UI toggles with actual tracks
    if (stream) {
      setCamEnabled(stream.getVideoTracks().length > 0);
      setMicEnabled(stream.getAudioTracks().length > 0);
    } else {
      setCamEnabled(false);
      setMicEnabled(false);
    }

    if (errorMsg) {
      // Ideally show a toast, for now updating status text briefly or logging
      console.warn(errorMsg);
      // We can append to status text if needed, but the main status text is connection state.
      // Maybe set a specific error state or toast?
      // let's use statusText for a moment if connecting.
    }

    return stream;
  }

  async function startLocalMedia() {
    try {
      setConnecting(true);
      const stream = await getRobustLocalMedia();
      localStreamRef.current = stream;

      if (stream && localRef.current) {
        localRef.current.srcObject = stream;
        localRef.current.muted = true;
        await localRef.current.play().catch(() => { });
      }

      const msg = role === 'paciente' ? 'Sala criada. Aguardando médico...' : 'Conectado. Aguardando paciente...';
      const detail = !stream ? ' (Modo Espectador)' : (!stream.getVideoTracks().length ? ' (Sem Câmera)' : '');
      setStatusText(msg + detail);
      return stream;
    } catch (e) {
      setStatusText('Erro ao acessar dispositivos de mídia.');
      return null;
    } finally {
      setConnecting(false);
    }
  }

  function toggleCam() {
    if (localStreamRef.current) {
      const enabled = !camEnabled;
      localStreamRef.current.getVideoTracks().forEach(t => t.enabled = enabled);
      setCamEnabled(enabled);
      sessionRef.current?.sendMediaState(enabled, micEnabled);
    }
  }

  function toggleMic() {
    if (localStreamRef.current) {
      const enabled = !micEnabled;
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = enabled);
      setMicEnabled(enabled);
      sessionRef.current?.sendMediaState(camEnabled, enabled);
    }
  }

  async function startAtendimentoFlow() {
    if (!token || !wsBaseUrl) return;

    // Obtém o ID da consulta da URL ou do estado inicial
    const cid = getConsultaIdFromUrl() || consultaIdState || consultaId || '';

    // Se o paciente entrar sem ID (raro, mas possível), tenta recuperar ou criar uma consulta.
    // No entanto, seguindo a nova lógica unificada, usaremos o claim se houver um ID.
    if (!cid && role === 'paciente') {
      try {
        const { roomId: rId, consultaId: cId, iceServers: ice } = await psCreateRoom(token);
        // Recarrega com o ID no parâmetro para manter a consistência
        router.replace(`/consultas/atendimento?id=${cId}`);
        return;
      } catch (e: any) {
        setStatusText('Erro ao iniciar consulta.');
        return;
      }
    }

    if (!cid) {
      setStatusText('ID da consulta não encontrado.');
      return;
    }

    claimingRef.current = true;

    try {
      // Se for paciente, usamos psCreateRoom que já é inteligente para reconectar.
      // Se for médico, usamos psClaim. Isso resolve o erro 403 reportado.
      const { roomId: rId, consultaId: cId, iceServers: ice } =
        role === 'paciente' ? await psCreateRoom(token) : await psClaim(cid, token);

      setRoomId(rId);
      setConsultaIdState(cId);

      // Persiste os dados para futuras reconexões (refresh de página)
      try {
        sessionStorage.setItem('consulta_reconnect', JSON.stringify({
          roomId: rId,
          consultaId: cId,
          userId: String(user?.id || ''),
          role,
          iceServers: ice,
          timestamp: Date.now()
        }));
      } catch { }

      const session = createWebRTCSession({ roomId: rId, token, role, wsBaseUrl, iceServers: ice });
      sessionRef.current = session;

      // Inicializa mídia local
      const stream = await startLocalMedia();
      session.setLocalStream(stream);
      session.sendMediaState(camEnabled, micEnabled);

      // Listeners comuns de conexão
      session.onConnectionStateChange((state) => {
        if (state === 'connected') handleConnected();
      });

      session.onIceConnectionStateChange((state) => {
        if (state === 'connected' || state === 'completed') {
          handleConnected();
        } else if (state === 'disconnected') {
          setStatusText('Conexão perdida. Tentando reconectar...');
          setConnectionFailed(true);
        } else if (state === 'failed') {
          setStatusText('Falha de conexão.');
          setConnectionFailed(true);
        }
      });

      session.onSignalEvent((ev) => {
        if (ev === 'answerSent' || ev === 'answerReceived') handleConnected();
      });

      session.onRemoteTrack((stream) => {
        if (remoteRef.current) remoteRef.current.srcObject = stream;
        setRemoteConnected(true);
        setRemoteDisconnected(false);
        setRemoteHasVideo(stream.getVideoTracks().length > 0);
        setRemoteHasAudio(stream.getAudioTracks().length > 0);

        stream.onaddtrack = () => {
          setRemoteHasVideo(stream.getVideoTracks().length > 0);
          setRemoteHasAudio(stream.getAudioTracks().length > 0);
        };
        stream.onremovetrack = () => {
          setRemoteHasVideo(stream.getVideoTracks().length > 0);
          setRemoteHasAudio(stream.getAudioTracks().length > 0);
        };
        handleConnected();
      });

      session.onRemoteMediaState((st) => {
        setRemoteHasVideo(st.video);
        setRemoteHasAudio(st.audio);
      });

      session.onRemoteEnd(() => {
        setRemoteDisconnected(true);
        setRemoteConnected(false);
        setStatusText('O outro usuário saiu da chamada.');
      });

      // Configurações específicas por papel
      if (role === 'medico') {
        session.onChatMessage((text) => {
          setMessages((prev) => [...prev, { author: 'Paciente', text }]);
        });
        session.createChatChannel();
        // createAndSendOffer agora é disparado pelo polling de participantes
        // para garantir que o paciente já esteja na sala.
      } else {
        session.onChatMessage((text) => {
          setMessages((prev) => [...prev, { author: 'Médico', text }]);
        });
      }
      setStatusText('Conectado.');

    } catch (err: any) {
      const msg = String(err?.message || 'Falha ao entrar na sala.');
      if (msg.includes('already_claimed')) {
        alert('Esta consulta já está sendo atendida por outro médico.');
        router.push('/consultas/pacientes');
      } else if (msg.includes('consulta_not_found')) {
        alert('Consulta não encontrada.');
        router.push('/consultas');
      } else {
        console.error('Erro no flow de atendimento:', err);
        setStatusText('Erro ao conectar: ' + msg);
      }
    } finally {
      claimingRef.current = false;
    }
  }

  function requestFinishCall() {
    setShowLeaveConfirmation(true);
  }

  async function confirmFinishCall() {
    // 1. Check if I am the last one
    const cid = getConsultaIdFromUrl() || consultaIdState || consultaId || '';
    if (cid && token) {
      try {
        const res = await listParticipants(cid, token);
        // If 1 or fewer participants (myself or empty), close it.
        // Usually it includes myself before I leave.
        if (res.participants && res.participants.length <= 1) {
          await endConsulta(cid, token);
        }
      } catch (err) {
        console.error('Erro ao verificar/finalizar consulta:', err);
      }
    }

    setShowLeaveConfirmation(false);
    try { sessionRef.current?.end(); } catch { }
    try { sessionStorage.removeItem('ps_room'); } catch { }
    // Remove dados de reconexão ao sair normalmente
    try { sessionStorage.removeItem('consulta_reconnect'); } catch { }
    // Removido alert, apenas modal de confirmação será exibido
    router.push('/consultas');
  }

  // Determine status color:
  // Red: default / disconnected / failed / error
  // Yellow: connecting / local media ready but !remoteConnected
  // Green: remoteConnected
  let statusColor = 'red';
  if (remoteConnected) {
    statusColor = 'green';
  } else if (localStreamRef.current && !remoteConnected) {
    // If we have local stream and are waiting, yellow
    statusColor = 'yellow';
  } else if (connecting) {
    statusColor = 'yellow';
  }

  return (
    <div className="atendimento-page">
      {role === 'medico' && (
        <div className="medico-mobile-header">
          <Header />
        </div>
      )}
      <main className={`atendimento-main ${!showChat ? 'full-width' : ''}`}>
        <section className="call-area">
          <div className="call-header">
            <span className={`status-dot ${statusColor}`} aria-label={`Status: ${statusColor}`}></span>
            Você está em uma consulta
          </div>
          <div className="call-screen">
            {/* O vídeo remoto sempre ocupa o retângulo grande (principal) */}
            {/* O vídeo remoto sempre ocupa o retângulo grande (principal) */}

            <video
              ref={remoteRef}
              className="remote-video large"
              playsInline
              autoPlay
              aria-label={role === 'medico' ? 'Vídeo do paciente' : 'Vídeo do médico'}
              style={{ opacity: remoteHasVideo ? 1 : 0, filter: connectionFailed ? 'blur(8px)' : undefined, transition: 'filter 0.3s' }}
            />


            {/* Blur e mensagem para falha de conexão */}
            {connectionFailed && !remoteDisconnected && (
              <div className="call-loader-overlay disconnected">
                <div className="disconnected-icon">🌐</div>
                <div className="call-loader-text">
                  Falha de conexão com a internet.<br />
                  {reconnecting ? 'Reconectando...' : 'Aguardando reconexão...'}
                </div>
              </div>
            )}

            {/* Blur e mensagem para câmera desligada */}
            {remoteConnected && !remoteHasVideo && !connectionFailed && (
              <div className="no-camera-placeholder large">
                <div className="no-camera-icon">📷</div>
                <div className="no-camera-text">
                  {role === 'medico' ? 'Paciente desligou a câmera' : 'Médico desligou a câmera'}
                </div>
                {!remoteHasAudio && <div style={{ fontSize: '0.8rem', marginTop: 4 }}>🔇 Microfone desligado</div>}
              </div>
            )}

            {remoteDisconnected && (
              <div className="call-loader-overlay disconnected">
                <div className="disconnected-icon">📞</div>
                <div className="call-loader-text">O outro usuário saiu da chamada.</div>
                <Button variant="primary" onClick={() => router.push('/consultas')} style={{ marginTop: '1rem' }}>
                  Voltar para Consultas
                </Button>
              </div>
            )}

            {/* O vídeo local aparece em miniatura (picture-in-picture) */}
            <div className="self-video-container pip">
              <video
                ref={localRef}
                className="self-video"
                playsInline
                autoPlay
                muted
                aria-label="Sua câmera"
                style={{ opacity: camEnabled ? 1 : 0 }}
              />
              {!camEnabled && (
                <div className="no-camera-placeholder pip-placeholder">
                  <div style={{ fontSize: '1.5rem' }}>📷</div>
                </div>
              )}
            </div>

            {/* Loading Spinner overlay if not connected */}
            {!remoteConnected && (
              <div className="call-loader-overlay">
                <div className="call-spinner"></div>
                <div className="call-loader-text">{role === 'paciente' ? 'Aguardando médico' : 'Aguardando paciente'}</div>
              </div>
            )}

            <div className="call-controls">
              <button
                className={`control-btn ${!camEnabled ? 'off' : ''}`}
                onClick={toggleCam}
                aria-label={camEnabled ? 'Desativar câmera' : 'Ativar câmera'}
              >
                {camEnabled ? '📷' : '🚫'}
              </button>
              <button
                className={`control-btn ${!micEnabled ? 'off' : ''}`}
                onClick={toggleMic}
                aria-label={micEnabled ? 'Desativar microfone' : 'Ativar microfone'}
              >
                {micEnabled ? '🎤' : '🔇'}
              </button>
              <button
                className={`control-btn ${showChat ? 'active' : ''}`}
                aria-label={showChat ? "Esconder chat" : "Mostrar chat"}
                onClick={() => setShowChat(prev => !prev)}
              >
                💬
              </button>
              <button className="control-btn end" aria-label="Encerrar chamada" onClick={requestFinishCall}>📞</button>
            </div>
          </div>
        </section>

        {showChat && (
          <aside className="chat-panel" aria-label="Chat da consulta">
            <div className="chat-header">Chat da consulta</div>
            <div className="chat-body">
              {messages.map((m, idx) => {
                let cls = 'chat-msg';
                if (m.author === 'Você') cls += ' me';
                else if (m.author === 'Médico') cls += ' doctor';
                else cls += ' patient';

                return (
                  <div key={idx} className={cls}>
                    <div className="chat-author">{m.author}</div>
                    <div className="chat-bubble">{m.text}</div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
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
        )}
      </main>

      <ConfirmationModal
        open={showLeaveConfirmation}
        title="Encerrar atendimento"
        message="Tem certeza que deseja deixar o atendimento?"
        onConfirm={confirmFinishCall}
        onCancel={() => setShowLeaveConfirmation(false)}
        variant="danger"
        confirmLabel="Sair"
      />
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
