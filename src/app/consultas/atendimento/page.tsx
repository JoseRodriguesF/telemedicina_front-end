"use client";

import './atendimento.css';
import '@/app/inicio/inicio.css';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
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
    console.log('[UI] Connection established/recharged.');
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
  const hasReadySignalRef = useRef(false);
  const isLocalReadyRef = useRef(false);
  const offeringInitiatedRef = useRef(false);

  // Mídia controls
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [remoteHasAudio, setRemoteHasAudio] = useState(false);
  const [remoteDisconnected, setRemoteDisconnected] = useState(false);
  const [showExitMessage, setShowExitMessage] = useState(false);
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

  // Timer para mostrar mensagem de saída definitiva após 10s de desconexão
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (remoteDisconnected) {
      setShowExitMessage(false);
      timer = setTimeout(() => {
        setShowExitMessage(true);
      }, 10000); // 10 segundos
    } else {
      setShowExitMessage(false);
    }
    return () => clearTimeout(timer);
  }, [remoteDisconnected]);

  // Polling de participantes: detecta quando o outro usuário entra e dispara a conexão
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (remoteConnected) return; // Se já está conectado, não precisa de polling redundante

    const cid = getConsultaIdFromUrl() || consultaIdState || consultaId || '';
    if (!cid || !token) return;
    if (pollingRef.current !== null) return;

    let stopped = false;
    const check = async () => {
      try {
        const resp = await listParticipants(cid, token);
        if (!stopped && Array.isArray(resp?.participants) && resp.participants.length >= 2) {
          handleConnected();
        }
      } catch (err: any) {
        // Se der 403, paramos o polling para evitar flood no console
        if (err?.response?.status === 403) {
          console.warn('[UI] Polling de participantes desativado (403 Forbidden).');
          stopped = true;
          if (pollingRef.current !== null) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }
    };
    const timerId = window.setInterval(check, 3000); // Aumentado para 3s para ser menos agressivo
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

  /**
   * Dispara a oferta WebRTC apenas quando as duas condições são atendidas:
   * 1. O servidor enviou 'ready' ou 'peer-joined' (indicando que o outro lado está lá).
   * 2. O navegador local já abriu a câmera e o canal de chat.
   */
  const checkAndInitiateOffering = async () => {
    if (role === 'medico' && hasReadySignalRef.current && isLocalReadyRef.current) {
      if (!offeringInitiatedRef.current && sessionRef.current) {
        offeringInitiatedRef.current = true;
        console.log('[UI] 🚀 All conditions met. Doctor initiating WebRTC offer...');
        try {
          await sessionRef.current.createAndSendOffer();
          console.log('[UI] ✅ Offer sent successfully.');
        } catch (err) {
          console.error('[UI] ❌ Error sending offer:', err);
          offeringInitiatedRef.current = false;
        }
      } else {
        console.log('[UI] Conditions met but offering already initiated or session missing.');
      }
    } else {
      console.log('[UI] Delaying offer. Role:', role, 'ReadySignal:', hasReadySignalRef.current, 'LocalReady:', isLocalReadyRef.current);
    }
  };

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
      console.log('[UI] 🚀 Starting flow. CID from URL:', cid);
      const { roomId: rId, consultaId: cId, iceServers: ice } = await psClaim(cid, token);
      console.log('[UI] psClaim success. Room:', rId, 'Consulta:', cId);

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

      // 1. Configurar listeners IMEDIATAMENTE após criar a sessão para não perder sinais
      session.onConnectionStateChange((state) => {
        console.log('[UI] Connection state:', state);
        if (state === 'connected') handleConnected();
      });

      session.onIceConnectionStateChange((state) => {
        console.log('[UI] ICE state:', state);
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

      session.onSignalEvent((ev, payload) => {
        console.log('[UI] Signal event received:', ev, payload);

        // Se recebermos 'joined' e já houver 2 pessoas, agimos como se fosse 'ready'
        const participants = payload?.participants || [];
        const isJoinedReady = ev === 'joined' && Array.isArray(participants) && participants.length >= 2;

        if (isJoinedReady) console.log('[UI] "joined" signal has 2+ participants. Treating as ready.');

        if (ev === 'answerSent' || ev === 'answerReceived' || ev === 'ready' || ev === 'peer-joined' || isJoinedReady) {
          handleConnected();
          if (ev === 'ready' || ev === 'peer-joined' || isJoinedReady) {
            console.log(`[UI] Signal "${ev}" indicates room is ready. Marked hasReadySignalRef.`);
            hasReadySignalRef.current = true;
            checkAndInitiateOffering();
          }
        }

        if (ev === 'peer-left') {
          console.log('[UI] Peer left the room.');
          setRemoteDisconnected(true);
          setRemoteConnected(false);
          setStatusText('O outro usuário saiu da sala.');
        }
      });

      session.onRemoteTrack((stream) => {
        console.log('[UI] Remote track received. Tracks:', stream.getTracks().length);
        if (remoteRef.current) {
          remoteRef.current.srcObject = stream;
          remoteRef.current.play().catch(e => console.warn('[UI] Error playing remote video:', e));
        }
        setRemoteConnected(true);
        setRemoteDisconnected(false);
        setShowExitMessage(false);
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

      if (role === 'medico') {
        session.onChatMessage((text) => {
          setMessages((prev) => [...prev, { author: 'Paciente', text }]);
        });
        session.createChatChannel();
      } else {
        session.onChatMessage((text) => {
          setMessages((prev) => [...prev, { author: 'Médico', text }]);
        });
      }

      // 2. Inicializa mídia local após os listeners
      const stream = await startLocalMedia();
      session.setLocalStream(stream);
      session.sendMediaState(camEnabled, micEnabled);

      // Marca a mídia local como pronta e tenta iniciar a oferta
      console.log('[UI] Local setup finished. Role:', role);
      isLocalReadyRef.current = true;
      checkAndInitiateOffering();

      // Failsafe: se nada aconteceu em 8 segundos, tenta forçar uma oferta se for médico
      setTimeout(() => {
        if (role === 'medico' && !offeringInitiatedRef.current && isLocalReadyRef.current) {
          console.log('[UI] Failsafe: No signal received after 8s. Forcing offer as doctor.');
          hasReadySignalRef.current = true;
          checkAndInitiateOffering();
        }
      }, 8000);

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
    <div className="inicio-page">
      <div className="inicio-mobile-header">
        <MobileHeader />
      </div>

      <main className="inicio-main atendimento-main">
        <div className={`atendimento-container ${!showChat ? 'full-width' : ''}`}>
          <section className="call-area">
            <div className="call-header">
              <span className={`status-dot ${statusColor}`} aria-label={`Status: ${statusColor}`}></span>
              Você está em uma consulta
            </div>
            <div className="call-screen">
              {/* O vídeo remoto sempre ocupa o retângulo grande (principal) */}
              {/* O vídeo remoto sempre ocupa o retângulo grande (principal) */}

              <div className="call-screen">
                {/* O vídeo remoto sempre ocupa o retângulo grande (principal) */}
                <video
                  ref={remoteRef}
                  className="remote-video large"
                  playsInline
                  autoPlay
                  aria-label={role === 'medico' ? 'Vídeo do paciente' : 'Vídeo do médico'}
                  style={{
                    opacity: remoteHasVideo && !connectionFailed ? 1 : 0,
                    filter: (connectionFailed || !remoteHasVideo) ? 'blur(12px)' : undefined,
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />

                {/* Status Layer - Informações flutuantes sem fundo pesado */}
                <div className="call-status-layer">
                  {/* 1. Falha crítica: Internet */}
                  {connectionFailed ? (
                    <div className="call-status-content internet-error">
                      <div className="overlay-icon">🌐</div>
                      <div className="overlay-content">
                        <h3>Conexão Perdida</h3>
                        <p>{reconnecting ? 'Tentando restabelecer sinal...' : 'Verifique sua conexão com a internet.'}</p>
                      </div>
                    </div>
                  ) : remoteDisconnected ? (
                    /* 2. Usuário saiu da sala */
                    <div className="call-status-content peer-disconnected">
                      <div className="overlay-icon">🔌</div>
                      <div className="overlay-content">
                        <h3>Usuário desconectado</h3>
                        <p>{showExitMessage ? 'A consulta foi encerrada pelo outro participante.' : 'O sinal do outro participante caiu. Aguardando volta...'}</p>
                        {showExitMessage && (
                          <Button variant="primary" onClick={() => router.push('/consultas')} style={{ marginTop: '1.5rem' }}>
                            Voltar para Consultas
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : !remoteConnected ? (
                    /* 3. Aguardando entrada inicial */
                    <div className="call-status-content waiting">
                      <div className="call-spinner"></div>
                      <div className="overlay-content">
                        <h3>Aguardando {role === 'paciente' ? 'Médico' : 'Paciente'}</h3>
                        <p>A entrada pode levar alguns segundos...</p>
                      </div>
                    </div>
                  ) : !remoteHasVideo ? (
                    /* 4. Conectado mas sem vídeo */
                    <div className="call-status-content no-video">
                      <div className="overlay-icon-small">📷</div>
                      <div className="overlay-content">
                        <p>{role === 'medico' ? 'Paciente com câmera desligada' : 'Médico com câmera desligada'}</p>
                        {!remoteHasAudio && <span className="mic-muted-tag">🔇 Microfone silenciado</span>}
                      </div>
                    </div>
                  ) : null}
                </div>
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
              </div>

              <div className="call-controls">
                <button
                  className={`control-btn ${!camEnabled ? 'off' : ''}`}
                  onClick={toggleCam}
                  aria-label={camEnabled ? 'Desativar câmera' : 'Ativar câmera'}
                >
                  {camEnabled ? (
                    <svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                  )}
                </button>
                <button
                  className={`control-btn ${!micEnabled ? 'off' : ''}`}
                  onClick={toggleMic}
                  aria-label={micEnabled ? 'Desativar microfone' : 'Ativar microfone'}
                >
                  {micEnabled ? (
                    <svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><path d="M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                  )}
                </button>
                <button
                  className={`control-btn ${showChat ? 'active' : ''}`}
                  aria-label={showChat ? "Esconder chat" : "Mostrar chat"}
                  onClick={() => setShowChat(prev => !prev)}
                >
                  <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </button>
                <button className="control-btn end" aria-label="Encerrar chamada" onClick={requestFinishCall}>
                  <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                </button>
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
        </div>
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
