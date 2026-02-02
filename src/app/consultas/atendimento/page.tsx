"use client";

import './atendimento.css';
import '@/app/inicio/inicio.css';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
import Button from '@/components/common/Buttons/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, useEffect } from 'react';
import { getUser, getToken } from '@/lib/auth';
import { createWebRTCSession } from '@/lib/webrtc';
import { psCreateRoom, psClaim, listParticipants, endConsulta, getConsulta, type ConsultaDetails, getHistoricoConsultasPaciente, type PSFullHistoryItem, avaliarConsulta } from '@/lib/axios/consultas';
import { getSignalUrl, getConsultaIdFromUrl } from '@/lib/signal';
import { Modal } from '@/components/common/Modal/Modal';
import { useModal } from '@/components/common/Modal/useModal';
import { formatDate } from '@/lib/utils/dateFormatters';
import AddressAutocomplete from '@/components/common/Inputs/AddressAutocomplete';
import ContentModal from '@/components/common/Modal/ContentModal';

type ChatMessage = { author: 'Você' | 'Médico' | 'Paciente'; text: string };

function calculateAge(birthDate: string | Date | undefined): string {
  if (!birthDate) return '-';
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return String(age);
}

// Componente Accordion fora para evitar perder o foco nos inputs ao re-renderizar
const Accordion = ({ id, title, isOpen, onToggle, isFilled, isMissing, children }: {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  isFilled?: boolean;
  isMissing?: boolean;
  children: React.ReactNode
}) => (
  <div className={`accordion-item ${isOpen ? 'open' : ''} ${isFilled ? 'is-filled' : ''} ${isMissing ? 'is-missing' : ''}`}>
    <button className="accordion-trigger" onClick={() => onToggle(id)} type="button">
      <span>{title}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    <div className="accordion-content">
      {children}
    </div>
  </div>
);

function AtendimentoInner() {
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const modal = useModal();

  const router = useRouter();
  const search = useSearchParams();
  const consultaId = search.get('id') || '';
  const user = getUser();
  const token = getToken();
  const role = (user?.tipo_usuario === 'medico' ? 'medico' : 'paciente') as 'medico' | 'paciente';
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  const wsBaseUrl = getSignalUrl(apiUrl);

  const [consultaDetails, setConsultaDetails] = useState<ConsultaDetails | null>(null);

  // States and Refs moved to top
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
  const [showChat, setShowChat] = useState(false);
  const hasReadySignalRef = useRef(false);
  const isLocalReadyRef = useRef(false);
  const offeringInitiatedRef = useRef(false);
  const bypassBeforeUnloadRef = useRef(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [remoteHasAudio, setRemoteHasAudio] = useState(false);
  const [remoteDisconnected, setRemoteDisconnected] = useState(false);
  const [showExitMessage, setShowExitMessage] = useState(false);

  // Estados para accordions do layout de médico
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Estados para histórico de consultas
  const [historicoConsultas, setHistoricoConsultas] = useState<PSFullHistoryItem[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [consultaSelecionada, setConsultaSelecionada] = useState<PSFullHistoryItem | null>(null);

  // Estados para avaliação da consulta (paciente)
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingJustification, setRatingJustification] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Estados para transcrição
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcricao, setTranscricao] = useState('');
  const recognitionRef = useRef<any>(null);

  const isScheduled = search.get('scheduled') === 'true';

  // Redirecionamento de segurança para pacientes em Pronto Atendimento
  // Se entrar na sala e não houver médico, volta para a tela de espera
  useEffect(() => {
    async function checkSecurityRedirect() {
      if (role === 'paciente' && !isScheduled && consultaId && token) {
        try {
          const data = await getConsulta(consultaId, token);
          if (!data.medicoId) {
            console.log('[Atendimento] Sem médico atribuído. Redirecionando para espera.');
            router.replace(`/consultas/aguardando?id=${consultaId}`);
          } else {
            setConsultaDetails(data);
          }
        } catch (err) {
          console.error('[Atendimento] Erro na verificação de segurança:', err);
        }
      }
    }
    checkSecurityRedirect();
  }, [role, isScheduled, consultaId, token, router]);

  // Buscar detalhes do paciente se for médico
  useEffect(() => {
    async function fetchPatientDetails() {
      const curCid = getConsultaIdFromUrl() || consultaIdState || consultaId;
      if (!curCid || !token || user?.tipo_usuario !== 'medico') return;

      try {
        console.log('[AtendimentoInner] Buscando dados do paciente, consultaId:', curCid);
        const data = await getConsulta(curCid, token);
        console.log('[AtendimentoInner] Dados do paciente recebidos:', data);
        setConsultaDetails(data);
      } catch (err) {
        console.error('[AtendimentoInner] Erro ao buscar detalhes da consulta:', err);
      }
    }

    fetchPatientDetails();
  }, [consultaId, consultaIdState, token, user?.tipo_usuario]);

  // Buscar histórico de consultas do paciente se for médico
  useEffect(() => {
    async function fetchHistory() {
      if (consultaDetails && token && user?.tipo_usuario === 'medico') {
        const pacienteId = consultaDetails.pacienteId;
        if (pacienteId) {
          try {
            console.log('[AtendimentoInner] Buscando histórico do paciente:', pacienteId);
            setLoadingHistorico(true);
            const historico = await getHistoricoConsultasPaciente(pacienteId, token);
            console.log('[AtendimentoInner] Histórico recebido:', historico);
            setHistoricoConsultas(historico);
          } catch (err) {
            console.error('[AtendimentoInner] Erro ao buscar histórico:', err);
          } finally {
            setLoadingHistorico(false);
          }
        }
      }
    }

    fetchHistory();
  }, [consultaDetails, token, user?.tipo_usuario]);


  const handleConnected = () => {
    setConnecting(false);
    setConnectionFailed(false);
    setReconnecting(false);
    setRemoteDisconnected(false);
    setShowExitMessage(false);
    setRemoteConnected(true);
    setStatusText('Em consulta');
  };

  // Modo UI: organizar telas/estilo sem lógica de API/signaling.
  // Estados para a ficha de atendimento (médico)
  const [atendimentoData, setAtendimentoData] = useState({
    evolucao: '',
    plano_terapeutico: '',
    diagnostico: '',
    repouso: '',
    destino_final: '',
    endereco_ambulancia: {
      endereco: '',
      complemento: '',
      informacoes_adicionais: '',
      telefone: ''
    }
  });

  // Pre-fill address if ambulance is selected
  useEffect(() => {
    if ((atendimentoData.destino_final.includes('ambulância') || atendimentoData.destino_final.includes('ambulancia')) && consultaDetails?.paciente) {
      // Only pre-fill if it's currently empty to avoid overwriting edits
      if (!atendimentoData.endereco_ambulancia.endereco) {
        const p = consultaDetails.paciente as any;
        const patientAddr = typeof p.endereco === 'string'
          ? p.endereco
          : (p.endereco?.endereco || '');

        const patientComplement = typeof p.endereco === 'object' ? p.endereco?.complemento || '' : '';
        const patientNumber = typeof p.endereco === 'object' ? p.endereco?.numero || '' : '';

        setAtendimentoData(prev => ({
          ...prev,
          endereco_ambulancia: {
            ...prev.endereco_ambulancia,
            endereco: patientAddr + (patientNumber ? `, ${patientNumber}` : ''),
            complemento: patientComplement,
            telefone: p.telefone || ''
          }
        }));
      }
    }
  }, [atendimentoData.destino_final, consultaDetails]);

  const destinoFinalOptions = [
    "Em domicílio com orientações médicas",
    "Indico seguimento externo",
    "Indico seguimento externo no consultório ou ambulatório",
    "Paciente ausente",
    "Anular paciente",
    "Anular por falta de conexão",
    "Envio de ambulância (código amarelo)",
    "Envio de ambulância (código vermelho)"
  ];

  const repousoOptions = [
    "Alta",
    "Repouso 24h",
    "Repouso 48h",
    "Repouso 72h",
    "Consulta não justifica repouso"
  ];

  const handleOptionToggle = (field: 'repouso' | 'destino_final', option: string) => {
    setAtendimentoData(prev => ({
      ...prev,
      [field]: prev[field] === option ? '' : option
    }));
  };

  // Helper para toggle de accordions
  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Lógica de Transcrição
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscricao(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[Transcription] Error:', event.error);
        if (event.error === 'not-allowed') {
          setIsTranscribing(false);
          modal.error('Permissão Negada', 'O acesso ao microfone para transcrição foi negado.');
        }
      };

      recognition.onend = () => {
        if (isTranscribing) {
          recognition.start(); // Auto-restart if should be transcribing
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleTranscription = () => {
    if (!recognitionRef.current) {
      modal.error('Não suportado', 'A transcrição de voz não é suportada neste navegador.');
      return;
    }

    if (isTranscribing) {
      recognitionRef.current.stop();
      setIsTranscribing(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsTranscribing(true);
      } catch (e) {
        console.error('[Transcription] Start error:', e);
      }
    }
  };


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
      if (bypassBeforeUnloadRef.current) return;
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
    // medico é sempre o responsável por iniciar a oferta inicial
    if (role === 'medico' && hasReadySignalRef.current && isLocalReadyRef.current) {
      if (!offeringInitiatedRef.current && sessionRef.current) {
        offeringInitiatedRef.current = true;
        try {
          console.log('[UI] Iniciando oferta para o outro par...');
          await sessionRef.current.createAndSendOffer();
        } catch (err) {
          console.error('[UI] ❌ Erro ao enviar oferta:', err);
          offeringInitiatedRef.current = false;
        }
      }
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

    // Se for paciente em Pronto Atendimento, verifica se já existe um médico
    // antes de iniciar a captura de mídia e o signaling.
    if (role === 'paciente' && !isScheduled) {
      try {
        const data = await getConsulta(cid, token);
        if (!data.medicoId) {
          console.log('[Atendimento] Redirecionando para aguardando: médico ainda não aceitou.');
          router.replace(`/consultas/aguardando?id=${cid}`);
          return;
        }
      } catch (e) {
        console.error('[Atendimento] Falha ao verificar médico antes de iniciar flow:', e);
      }
    }

    claimingRef.current = true;

    try {
      const { roomId: rId, consultaId: cId, iceServers: ice } = await psClaim(cid, token);

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

        if (state === 'connected') handleConnected();
      });

      session.onIceConnectionStateChange((state) => {

        if (state === 'connected' || state === 'completed') {
          handleConnected();
        } else if (state === 'disconnected') {
          setStatusText('Conexão perdida. Tentando reconectar...');
          setConnectionFailed(true);
        } else if (state === 'failed') {
          setStatusText('Falha de conexão grave. Tentando reiniciar...');
          setConnectionFailed(true);
          // Tentar um ICE Restart suave antes de forçar o refresh
          session.restartIce();
        }
      });

      session.onSignalEvent((ev, payload) => {


        // Se recebermos 'joined' e já houver 2 pessoas, agimos como se fosse 'ready'
        const participants = payload?.participants || [];
        const isJoinedReady = ev === 'joined' && Array.isArray(participants) && participants.length >= 2;



        if (ev === 'ready' || ev === 'peer-joined' || isJoinedReady) {
          setStatusText('O outro usuário entrou. Estabelecendo conexão...');
          hasReadySignalRef.current = true;
          checkAndInitiateOffering();
        }
        if (ev === 'answerSent' || ev === 'answerReceived') {
          setStatusText('Finalizando handshake...');
        }

        if (ev === 'peer-left') {
          setRemoteDisconnected(true);
          setRemoteConnected(false);
          setStatusText('O outro usuário saiu da sala.');
          // Reset para permitir nova oferta se ele voltar
          hasReadySignalRef.current = false;
          offeringInitiatedRef.current = false;
        }
      });

      session.onRemoteTrack((stream) => {

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

      isLocalReadyRef.current = true;
      checkAndInitiateOffering();

      // Failsafe: se nada aconteceu em 5 segundos, tenta forçar
      setTimeout(() => {
        if (role === 'medico' && !offeringInitiatedRef.current && isLocalReadyRef.current) {
          console.log('[UI] Failsafe: Forçando sinal de pronto e nova tentativa de oferta.');
          hasReadySignalRef.current = true;
          checkAndInitiateOffering();
        }
      }, 5000);

      setStatusText('Conectado.');

    } catch (err: any) {
      const msg = String(err?.message || 'Falha ao entrar na sala.');
      if (msg.includes('already_claimed')) {
        modal.error('Consulta Indisponível', 'Esta consulta já está sendo atendida por outro médico.', () => router.push('/consultas/pacientes'));
      } else if (msg.includes('consulta_not_found')) {
        modal.error('Erro', 'Consulta não encontrada.', () => router.push('/consultas'));
      } else {
        console.error('Erro no flow de atendimento:', err);
        setStatusText('Erro ao conectar: ' + msg);
      }
    } finally {
      claimingRef.current = false;
    }
  }

  function requestFinishCall() {
    if (role === 'medico') {
      const missing = [];
      if (!atendimentoData.evolucao.trim()) missing.push('Evolução');
      if (!atendimentoData.plano_terapeutico.trim()) missing.push('Plano Terapêutico');
      if (!atendimentoData.diagnostico.trim()) missing.push('Diagnóstico');
      if (!atendimentoData.repouso) missing.push('Repouso');
      if (!atendimentoData.destino_final) missing.push('Destino Final');

      if (missing.length > 0) {
        setShowValidation(true);
        modal.error(
          'Campos pendentes',
          `Por favor, preencha os seguintes campos antes de finalizar: ${missing.join(', ')}.`
        );
        return;
      }
    }

    modal.confirm(
      'Encerrar atendimento',
      'Tem certeza que deseja deixar o atendimento?',
      confirmFinishCall
    );
  }

  async function confirmFinishCall() {
    // Permitir navegação sem disparar o aviso do navegador (beforeunload)
    bypassBeforeUnloadRef.current = true;

    // 1. Check if I am the last one
    const cid = getConsultaIdFromUrl() || consultaIdState || consultaId || '';
    if (cid && token) {
      try {
        const res = await listParticipants(cid, token);
        // If 1 or fewer participants (myself or empty), close it.
        // Usually it includes myself before I leave.
        if (res.participants && res.participants.length <= 1) {
          // Envia hora_fim ao finalizar
          const now = new Date();
          const hora_fim = now.toTimeString().slice(0, 8); // formato HH:MM:SS
          await endConsulta(cid, token, hora_fim, { ...atendimentoData, transcricao });
        }
      } catch (err) {
        console.error('Erro ao verificar/finalizar consulta:', err);
      }
    }

    try { sessionRef.current?.end(); } catch { }
    try { sessionStorage.removeItem('ps_room'); } catch { }
    // Remove dados de reconexão ao sair normalmente
    try { sessionStorage.removeItem('consulta_reconnect'); } catch { }

    // Se for paciente, mostra modal de avaliação antes de sair
    if (role === 'paciente') {
      setShowRatingModal(true);
    } else {
      router.push('/consultas');
    }
  }

  async function handleRatingSubmit() {
    if (ratingStars === 0) {
      modal.error('Erro', 'Por favor, selecione uma nota de 1 a 5 estrelas.');
      return;
    }

    if (ratingStars < 5 && !ratingJustification.trim()) {
      modal.error('Justificativa Necessária', 'Por favor, informe uma justificativa para a sua nota.');
      return;
    }

    const cid = getConsultaIdFromUrl() || consultaIdState || consultaId || '';
    if (!cid || !token) {
      router.push('/consultas');
      return;
    }

    setIsSubmittingRating(true);
    try {
      await avaliarConsulta(cid, token, {
        estrelas: ratingStars,
        avaliacao: ratingJustification
      });
      setShowRatingModal(false);
      modal.success('Obrigado!', 'Sua avaliação foi registrada com sucesso.', () => {
        router.push('/consultas');
      });
    } catch (err: any) {
      console.error('Erro ao enviar avaliação:', err);
      modal.error('Erro', 'Não foi possível enviar sua avaliação no momento. Você será redirecionado.');
      setTimeout(() => router.push('/consultas'), 2000);
    } finally {
      setIsSubmittingRating(false);
    }
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
        {/* LAYOUT PARA MÉDICO - 3 colunas com painéis */}
        {role === 'medico' ? (
          <>
            <div className="atendimento-container medico-layout">
              {/* Painel Esquerdo - Ficha de Atendimento */}
              <aside className="side-panel left-panel">
                <div className="panel-header">Ficha de atendimento</div>
                <div className="panel-content">
                  <Accordion
                    id="historico-consultas"
                    title="Histórico de consultas"
                    isOpen={!!openAccordions['historico-consultas']}
                    onToggle={toggleAccordion}
                  >
                    {loadingHistorico ? (
                      <p className="accordion-placeholder">Carregando histórico...</p>
                    ) : historicoConsultas.length === 0 ? (
                      <p className="accordion-placeholder">Nenhuma consulta anterior registrada.</p>
                    ) : (
                      <div className="historico-list">
                        {historicoConsultas.map((consulta) => (
                          <div key={consulta.id} className="historico-item">
                            <div className="historico-item-info">
                              <div className="historico-item-date">
                                📅 {formatDate(consulta.data_consulta || consulta.createdAt)}
                              </div>
                              <div className="historico-item-status">
                                Status: {consulta.status === 'finished' ? 'Finalizada' : consulta.status}
                              </div>
                            </div>
                            <button
                              className="historico-item-button"
                              onClick={() => setConsultaSelecionada(consulta)}
                            >
                              Ver Detalhes
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Accordion>
                  <Accordion
                    id="historico-prescricoes"
                    title="Histórico de prescrições"
                    isOpen={!!openAccordions['historico-prescricoes']}
                    onToggle={toggleAccordion}
                  >
                    <p className="accordion-placeholder">Nenhuma prescrição anterior registrada.</p>
                  </Accordion>
                  <Accordion
                    id="prescricoes"
                    title="Prescrições"
                    isOpen={!!openAccordions['prescricoes']}
                    onToggle={toggleAccordion}
                  >
                    <p className="accordion-placeholder">Adicione prescrições durante a consulta.</p>
                  </Accordion>
                </div>
              </aside>

              {/* Coluna Central - Vídeo + Ações */}
              <div className="medico-video-column">
                <section className="call-area">
                  <div className="call-header">
                    <span className={`status-dot ${statusColor}`} aria-label={`Status: ${statusColor}`}></span>
                    {statusText || 'Em consulta'}
                  </div>
                  <div className="call-screen">
                    <video
                      ref={remoteRef}
                      className="remote-video large"
                      playsInline
                      autoPlay
                      aria-label="Vídeo do paciente"
                      style={{
                        opacity: remoteHasVideo && !connectionFailed ? 1 : 0,
                        filter: (connectionFailed || !remoteHasVideo) ? 'blur(12px)' : undefined,
                        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />

                    <div className="call-status-layer">
                      {connectionFailed ? (
                        <div className="call-status-content internet-error">
                          <div className="overlay-icon">🌐</div>
                          <div className="overlay-content">
                            <h3>Conexão Perdida</h3>
                            <p>{reconnecting ? 'Tentando restabelecer sinal...' : 'Verifique sua conexão com a internet.'}</p>
                          </div>
                        </div>
                      ) : remoteDisconnected ? (
                        <div className="call-status-content peer-disconnected">
                          <div className="overlay-icon">🔌</div>
                          <div className="overlay-content">
                            <h3>Usuário desconectado</h3>
                            <p>{showExitMessage ? 'A consulta foi encerrada pelo paciente.' : 'O sinal do paciente caiu. Aguardando volta...'}</p>
                            {showExitMessage && (
                              <Button variant="primary" onClick={() => router.push('/consultas')} style={{ marginTop: '1.5rem' }}>
                                Voltar para Consultas
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : !remoteConnected ? (
                        <div className="call-status-content waiting">
                          <div className="call-spinner"></div>
                          <div className="overlay-content">
                            <h3>Aguardando Paciente</h3>
                            <p>A entrada pode levar alguns segundos...</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {!remoteHasVideo && (
                            <div className="call-status-content no-video">
                              <div className="overlay-icon-small">📷</div>
                              <div className="overlay-content">
                                <p>O paciente desligou a câmera</p>
                              </div>
                            </div>
                          )}
                          <div className="status-alerts-container">
                            {!remoteHasAudio && (
                              <div className="remote-mic-alert">
                                <span>🔇</span>
                                <span>Paciente em silêncio</span>
                              </div>
                            )}
                            {!micEnabled && (
                              <div className="remote-mic-alert local">
                                <span>🔇</span>
                                <span>Seu microfone está desligado</span>
                              </div>
                            )}
                            {!camEnabled && (
                              <div className="remote-mic-alert local cam">
                                <span>📷</span>
                                <span>Sua câmera está desligada</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

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
                          <div className="overlay-icon-small">📷</div>
                          <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#94a3b8' }}>Você está sem vídeo</div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <div className="medico-actions-toolbar">
                  <div className="call-controls">
                    <button className={`control-btn ${!camEnabled ? 'off' : ''}`} onClick={toggleCam} aria-label={camEnabled ? 'Desativar câmera' : 'Ativar câmera'}>
                      {camEnabled ? (
                        <svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                      )}
                    </button>
                    <button className={`control-btn ${!micEnabled ? 'off' : ''}`} onClick={toggleMic} aria-label={micEnabled ? 'Desativar microfone' : 'Ativar microfone'}>
                      {micEnabled ? (
                        <svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><path d="M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                      )}
                    </button>
                    <button className={`control-btn ${showChat ? 'active' : ''}`} aria-label={showChat ? "Fechar chat" : "Abrir chat"} onClick={() => setShowChat(prev => !prev)}>
                      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </button>
                    <button className="control-btn end" aria-label="Encerrar chamada" onClick={requestFinishCall}>
                      <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    </button>
                  </div>

                  <div className="video-action-buttons">
                    <button className="action-btn">Prescrição</button>
                    <button className="action-btn">Antecedentes</button>
                    <button className="action-btn">Arquivos</button>
                  </div>
                </div>
              </div>

              {/* Painel Direito - Informações do Paciente + Ficha */}
              <aside className="side-panel right-panel">
                <div className="panel-header">Informações pessoais do paciente</div>
                <div className="patient-info">
                  {consultaDetails ? (
                    <>
                      <div className="patient-info-row">
                        <span className="patient-info-label">Nome:</span>
                        <span className="patient-info-value">{consultaDetails.paciente.nome_completo || '-'}</span>
                      </div>
                      <div className="patient-info-row">
                        <span className="patient-info-label">Gênero:</span>
                        <span className="patient-info-value" style={{ textTransform: 'capitalize' }}>{consultaDetails.paciente.sexo || '-'}</span>
                      </div>
                      <div className="patient-info-row">
                        <span className="patient-info-label">Idade:</span>
                        <span className="patient-info-value">{calculateAge(consultaDetails.paciente.data_nascimento)} anos</span>
                      </div>
                      <div className="patient-info-row">
                        <span className="patient-info-label">CPF:</span>
                        <span className="patient-info-value">{consultaDetails.paciente.cpf || '-'}</span>
                      </div>
                      <div className="patient-info-row">
                        <span className="patient-info-label">Telefone:</span>
                        <span className="patient-info-value">{consultaDetails.paciente.telefone || '-'}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>Carregando dados...</div>
                  )}
                </div>
                <div className="panel-header">Ficha de atendimento</div>
                <div className="panel-content">
                  <Accordion
                    id="evolucao"
                    title="Evolução"
                    isOpen={!!openAccordions['evolucao']}
                    onToggle={toggleAccordion}
                    isFilled={!!atendimentoData.evolucao}
                    isMissing={showValidation && !atendimentoData.evolucao.trim()}
                  >
                    <textarea
                      className="atendimento-textarea"
                      placeholder="Registre a evolução do paciente..."
                      value={atendimentoData.evolucao}
                      onChange={(e) => {
                        setAtendimentoData(prev => ({ ...prev, evolucao: e.target.value }));
                        e.target.style.height = 'inherit';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                    ></textarea>
                  </Accordion>
                  <Accordion
                    id="plano-terapeutico"
                    title="Plano Terapêutico"
                    isOpen={!!openAccordions['plano-terapeutico']}
                    onToggle={toggleAccordion}
                    isFilled={!!atendimentoData.plano_terapeutico}
                    isMissing={showValidation && !atendimentoData.plano_terapeutico.trim()}
                  >
                    <textarea
                      className="atendimento-textarea"
                      placeholder="Defina o plano terapêutico..."
                      value={atendimentoData.plano_terapeutico}
                      onChange={(e) => {
                        setAtendimentoData(prev => ({ ...prev, plano_terapeutico: e.target.value }));
                        e.target.style.height = 'inherit';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                    ></textarea>
                  </Accordion>
                  <Accordion
                    id="diagnostico"
                    title="Diagnóstico"
                    isOpen={!!openAccordions['diagnostico']}
                    onToggle={toggleAccordion}
                    isFilled={!!atendimentoData.diagnostico}
                    isMissing={showValidation && !atendimentoData.diagnostico.trim()}
                  >
                    <div className="address-search-wrapper">
                      <input
                        type="text"
                        className="atendimento-input-small"
                        placeholder="Buscar ou digitar diagnóstico..."
                        value={atendimentoData.diagnostico}
                        onChange={(e) => setAtendimentoData(prev => ({ ...prev, diagnostico: e.target.value }))}
                      />
                      <span className="search-icon-inside">
                        <img src="/icons/Search.png" alt="Buscar" width="16" height="16" />
                      </span>
                    </div>
                  </Accordion>
                  <Accordion
                    id="repouso"
                    title="Repouso"
                    isOpen={!!openAccordions['repouso']}
                    onToggle={toggleAccordion}
                    isFilled={!!atendimentoData.repouso}
                    isMissing={showValidation && !atendimentoData.repouso}
                  >
                    <div className="options-grid">
                      {repousoOptions.map(option => (
                        <label key={option} className={`option-card ${atendimentoData.repouso === option ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            className="hidden-checkbox"
                            checked={atendimentoData.repouso === option}
                            onChange={() => handleOptionToggle('repouso', option)}
                          />
                          <div className="option-indicator"></div>
                          <span className="option-text">{option}</span>
                        </label>
                      ))}
                    </div>
                  </Accordion>
                  <Accordion
                    id="destino-final"
                    title="Destino Final"
                    isOpen={!!openAccordions['destino-final']}
                    onToggle={toggleAccordion}
                    isFilled={!!atendimentoData.destino_final}
                    isMissing={showValidation && !atendimentoData.destino_final}
                  >
                    <div className="options-grid">
                      {destinoFinalOptions.map(option => (
                        <div key={option} className="option-container">
                          <label className={`option-card ${atendimentoData.destino_final === option ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              className="hidden-checkbox"
                              checked={atendimentoData.destino_final === option}
                              onChange={() => handleOptionToggle('destino_final', option)}
                            />
                            <div className="option-indicator"></div>
                            <span className="option-text">{option}</span>
                          </label>

                          {/* Se for ambulância e estiver selecionado, mostra formulário de endereço */}
                          {atendimentoData.destino_final === option && option.toLowerCase().includes('ambulância') && (
                            <div className="ambulance-address-form">
                              <div className="address-row">
                                <span className="input-label-text">Buscar endereço</span>
                                <div className="address-search-wrapper">
                                  <AddressAutocomplete
                                    placeholder="Ex: Av. Paulista, 1000"
                                    className="atendimento-input-small"
                                    value={atendimentoData.endereco_ambulancia.endereco}
                                    onChange={(v) => setAtendimentoData(prev => ({
                                      ...prev,
                                      endereco_ambulancia: { ...prev.endereco_ambulancia, endereco: v }
                                    }))}
                                  />
                                  <span className="search-icon-inside">
                                    <img src="/icons/Search.png" alt="Buscar" width="16" height="16" />
                                  </span>
                                </div>
                              </div>

                              <div className="address-row">
                                <span className="input-label-text">Complemento</span>
                                <input
                                  type="text"
                                  placeholder="Ex: Bloco B, Apto 101"
                                  className="atendimento-input-small"
                                  value={atendimentoData.endereco_ambulancia.complemento}
                                  onChange={(e) => setAtendimentoData(prev => ({
                                    ...prev,
                                    endereco_ambulancia: { ...prev.endereco_ambulancia, complemento: e.target.value }
                                  }))}
                                />
                              </div>

                              <div className="address-row">
                                <span className="input-label-text">Informações adicionais</span>
                                <input
                                  type="text"
                                  placeholder="Ponto de referência, observações..."
                                  className="atendimento-input-small"
                                  value={atendimentoData.endereco_ambulancia.informacoes_adicionais}
                                  onChange={(e) => setAtendimentoData(prev => ({
                                    ...prev,
                                    endereco_ambulancia: { ...prev.endereco_ambulancia, informacoes_adicionais: e.target.value }
                                  }))}
                                />
                              </div>

                              <div className="address-row">
                                <div className="input-with-label">
                                  <span className="input-label-text">Telefone de contato</span>
                                  <input
                                    type="text"
                                    placeholder="(00) 00000-0000"
                                    className="atendimento-input-small"
                                    value={atendimentoData.endereco_ambulancia.telefone}
                                    onChange={(e) => setAtendimentoData(prev => ({
                                      ...prev,
                                      endereco_ambulancia: { ...prev.endereco_ambulancia, telefone: e.target.value }
                                    }))}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Accordion>
                </div>
              </aside>
            </div>

            {showChat && (
              <div className="chat-modal-overlay" onClick={() => setShowChat(false)}>
                <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="chat-header">
                    <span>Chat da consulta</span>
                    <button className="chat-close-btn" onClick={() => setShowChat(false)} aria-label="Fechar chat">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  <div className="chat-body">
                    {messages.map((m, idx) => {
                      let cls = 'chat-msg';
                      if (m.author === 'Você') cls += ' me';
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
                      placeholder="Digite sua mensagem..."
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                    />
                    <Button variant="primary" onClick={sendMessage} aria-label="Enviar">➤</Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* LAYOUT PARA PACIENTE - Layout original com chat */
          <div className={`atendimento-container ${!showChat ? 'full-width' : ''}`}>
            <section className="call-area">
              <div className="call-header">
                <span className={`status-dot ${statusColor}`} aria-label={`Status: ${statusColor}`}></span>
                Você está em uma consulta
              </div>
              <div className="call-screen">
                <video
                  ref={remoteRef}
                  className="remote-video large"
                  playsInline
                  autoPlay
                  aria-label="Vídeo do médico"
                  style={{
                    opacity: remoteHasVideo && !connectionFailed ? 1 : 0,
                    filter: (connectionFailed || !remoteHasVideo) ? 'blur(12px)' : undefined,
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />

                <div className="call-status-layer">
                  {connectionFailed ? (
                    <div className="call-status-content internet-error">
                      <div className="overlay-icon">🌐</div>
                      <div className="overlay-content">
                        <h3>Conexão Perdida</h3>
                        <p>{reconnecting ? 'Tentando restabelecer sinal...' : 'Verifique sua conexão com a internet.'}</p>
                      </div>
                    </div>
                  ) : remoteDisconnected ? (
                    <div className="call-status-content peer-disconnected">
                      <div className="overlay-icon">🔌</div>
                      <div className="overlay-content">
                        <h3>Usuário desconectado</h3>
                        <p>{showExitMessage ? 'A consulta foi encerrada pelo outro participante.' : 'O sinal do outro participante caiu. Aguardando volta...'}</p>
                        {showExitMessage && (
                          <Button variant="primary" onClick={() => role === 'paciente' ? setShowRatingModal(true) : router.push('/consultas')} style={{ marginTop: '1.5rem' }}>
                            Voltar para Consultas
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : !remoteConnected ? (
                    <div className="call-status-content waiting">
                      <div className="call-spinner"></div>
                      <div className="overlay-content">
                        <h3>Aguardando Médico</h3>
                        <p>A entrada pode levar alguns segundos...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!remoteHasVideo && (
                        <div className="call-status-content no-video">
                          <div className="overlay-icon-small">📷</div>
                          <div className="overlay-content">
                            <p>O médico desligou a câmera</p>
                          </div>
                        </div>
                      )}
                      <div className="status-alerts-container">
                        {!remoteHasAudio && (
                          <div className="remote-mic-alert">
                            <span>🔇</span>
                            <span>Médico em silêncio</span>
                          </div>
                        )}
                        {!micEnabled && (
                          <div className="remote-mic-alert local">
                            <span>🔇</span>
                            <span>Seu microfone está desligado</span>
                          </div>
                        )}
                        {!camEnabled && (
                          <div className="remote-mic-alert local cam">
                            <span>📷</span>
                            <span>Sua câmera está desligada</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

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
                      <div className="overlay-icon-small">📷</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#94a3b8' }}>Você está sem vídeo</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="call-controls">
                <button className={`control-btn ${!camEnabled ? 'off' : ''}`} onClick={toggleCam} aria-label={camEnabled ? 'Desativar câmera' : 'Ativar câmera'}>
                  {camEnabled ? (
                    <svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                  )}
                </button>
                <button className={`control-btn ${!micEnabled ? 'off' : ''}`} onClick={toggleMic} aria-label={micEnabled ? 'Desativar microfone' : 'Ativar microfone'}>
                  {micEnabled ? (
                    <svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><path d="M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                  )}
                </button>
                <button className={`control-btn ${showChat ? 'active' : ''}`} aria-label={showChat ? "Esconder chat" : "Mostrar chat"} onClick={() => setShowChat(prev => !prev)}>
                  <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </button>
                <button className="control-btn end" aria-label="Encerrar chamada" onClick={requestFinishCall}>
                  <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                </button>
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
        )}
      </main>

      {/* Modal de Detalhes da Consulta */}
      <ContentModal
        isOpen={!!consultaSelecionada}
        onClose={() => setConsultaSelecionada(null)}
        title="Detalhes do Atendimento"
        size="md"
      >
        {consultaSelecionada && (
          <div className="history-details-modal">
            <div className="details-section">
              <h4>Informações Gerais</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Data:</label>
                  <span>{consultaSelecionada.data_consulta ? formatDate(consultaSelecionada.data_consulta) : formatDate(consultaSelecionada.createdAt)}</span>
                </div>
                <div className="detail-item">
                  <label>Médico:</label>
                  <span>{consultaSelecionada.medico?.nome_completo || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Hora Início:</label>
                  <span>{consultaSelecionada.hora_inicio ? new Date(consultaSelecionada.hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Hora Fim:</label>
                  <span>{consultaSelecionada.hora_fim ? new Date(consultaSelecionada.hora_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h4>Diagnóstico</h4>
              <p className="detail-text">{consultaSelecionada.diagnostico || 'Não registrado'}</p>
            </div>

            <div className="details-section">
              <h4>Evolução</h4>
              <p className="detail-text">{consultaSelecionada.evolucao || 'Não registrada'}</p>
            </div>

            <div className="details-section">
              <h4>Plano Terapêutico</h4>
              <p className="detail-text">{consultaSelecionada.plano_terapeutico || 'Não registrado'}</p>
            </div>

            <div className="details-grid-bottom">
              <div className="details-section">
                <h4>Repouso</h4>
                <p className="detail-text">{consultaSelecionada.repouso || 'Não registrado'}</p>
              </div>
              <div className="details-section">
                <h4>Destino Final</h4>
                <p className="detail-text">{consultaSelecionada.destino_final || 'Não registrado'}</p>
              </div>
            </div>

            {(consultaSelecionada as any).transcricao && (
              <div className="details-section">
                <h4>Transcrição da Consulta</h4>
                <div className="transcription-text-area history">
                  {(consultaSelecionada as any).transcricao}
                </div>
              </div>
            )}
          </div>
        )}
      </ContentModal>

      <Modal
        isOpen={modal.isOpen}
        config={modal.config}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
      />

      {/* Modal de Avaliação do Médico */}
      <ContentModal
        isOpen={showRatingModal}
        onClose={() => { }} // Não permite fechar sem avaliar ou carregar fallback
        title="Avalie o seu atendimento"
        size="sm"
      >
        <div className="rating-modal-content">
          <p className="rating-description">Como você avalia o atendimento do médico?</p>

          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`star-btn ${ratingStars >= star ? 'active' : ''}`}
                onClick={() => setRatingStars(star)}
                aria-label={`${star} estrelas`}
              >
                ★
              </button>
            ))}
          </div>

          {ratingStars > 0 && ratingStars < 5 && (
            <div className="rating-justification">
              <label htmlFor="justification">O que podemos melhorar? (Obrigatório)</label>
              <textarea
                id="justification"
                className="atendimento-textarea"
                placeholder="Conte-nos o motivo da sua nota..."
                value={ratingJustification}
                onChange={(e) => setRatingJustification(e.target.value)}
              ></textarea>
            </div>
          )}

          <div className="rating-actions">
            <Button
              variant="primary"
              onClick={handleRatingSubmit}
              disabled={isSubmittingRating || (ratingStars < 5 && !ratingJustification.trim()) || ratingStars === 0}
              style={{ width: '100%' }}
            >
              {isSubmittingRating ? 'Enviando...' : 'Enviar Avaliação'}
            </Button>
            <button
              className="skip-rating-btn"
              onClick={() => router.push('/consultas')}
              disabled={isSubmittingRating}
            >
              Agora não
            </button>
          </div>
        </div>
      </ContentModal>
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
