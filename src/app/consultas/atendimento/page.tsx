"use client";

import './atendimento.css';
import '@/app/inicio/inicio.css';
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
import Button from '@/components/common/Buttons/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, useEffect } from 'react';
import { getUser, getToken } from '@/lib/auth';
import { createWebRTCSession } from '@/lib/webrtc';
import { psCreateRoom, psClaim, listParticipants, endConsulta, getConsulta, type ConsultaDetails, getHistoricoConsultasPaciente, type PSFullHistoryItem, avaliarConsulta, updatePacienteNotas } from '@/lib/axios/consultas';
import { createPrescricao, getSugestoesMedicamentos, getSugestoesMarcas, getPrescricoesByConsulta, deletePrescricao, getPrescricoesByPaciente, Prescricao as PrescricaoType, downloadPrescricaoPdf } from '@/lib/axios/prescricoes';
import { getSignalUrl, getConsultaIdFromUrl } from '@/lib/signal';
import { Modal } from '@/components/common/Modal/Modal';
import { useModal } from '@/components/common/Modal/useModal';
import { formatDate, formatTime } from '@/lib/utils/dateFormatters';
import AddressAutocomplete from '@/components/common/Inputs/AddressAutocomplete';
import ContentModal from '@/components/common/Modal/ContentModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import FormattedText from '@/components/common/FormattedText';

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
  const remoteConnectedRef = useRef(false);
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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Estados para accordions do layout de médico
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Estados para histórico de consultas
  const [historicoConsultas, setHistoricoConsultas] = useState<PSFullHistoryItem[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [activePrescricoes, setActivePrescricoes] = useState<PrescricaoType[]>([]);
  const [loadingPrescricoes, setLoadingPrescricoes] = useState(false);
  const [consultaSelecionada, setConsultaSelecionada] = useState<PSFullHistoryItem | null>(null);
  const [historicoPrescricoes, setHistoricoPrescricoes] = useState<PrescricaoType[]>([]);
  const [loadingHistoricoPrescricoes, setLoadingHistoricoPrescricoes] = useState(false);

  const [isClaimed, setIsClaimed] = useState(false);

  // Estados para mensagens não lidas no chat
  const [unreadMessages, setUnreadMessages] = useState(0);
  const lastMessageCountRef = useRef(0);

  // Estados para prescrições
  const [showPrescricaoForm, setShowPrescricaoForm] = useState(false);
  const [prescricaoData, setPrescricaoData] = useState({
    medicamento: '',
    marca: '',
    dosagem: '',
    frequencia: '',
    duracao: '',
    inclusoConvenio: false
  });
  const [medicamentoSugestoes, setMedicamentoSugestoes] = useState<string[]>([]);
  const [marcaSugestoes, setMarcaSugestoes] = useState<string[]>([]);
  const [showMedicamentoSugestoes, setShowMedicamentoSugestoes] = useState(false);
  const [showMarcaSugestoes, setShowMarcaSugestoes] = useState(false);
  const [isSubmittingPrescricao, setIsSubmittingPrescricao] = useState(false);
  const [pacienteNotas, setPacienteNotas] = useState('');
  const [isSavingNotas, setIsSavingNotas] = useState(false);
  const [isEditingNotas, setIsEditingNotas] = useState(false);

  // Estados para Prescrição Digital .gov
  const [prescricaoGerada, setPrescricaoGerada] = useState(false);
  const [signedPdfFile, setSignedPdfFile] = useState<{ data: string; mimetype: string } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);

  const isScheduled = search.get('scheduled') === 'true';

  // Redirecionamento de segurança para pacientes em Pronto Atendimento
  // Se entrar na sala e não houver médico, volta para a tela de espera
  useEffect(() => {
    async function checkSecurityRedirect() {
      if (role === 'paciente' && !isScheduled && consultaId && token) {
        try {
          const data = await getConsulta(consultaId, token);
          if (!data.medicoId) {

            router.replace(`/consultas/aguardando?id=${consultaId}`);
          } else {
            if (data.historiaClinica) {
              if (Array.isArray(data.historiaClinica)) {
                const arr = data.historiaClinica as any[];
                data.historiaClinica = arr.length > 0 ? { id: arr[0].id, conteudo: removeAdministrativeFields(arr[0].conteudo) } : undefined;
              } else if (data.historiaClinica.conteudo) {
                data.historiaClinica.conteudo = removeAdministrativeFields(data.historiaClinica.conteudo);
              }
            }
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
      if (!curCid || !token || user?.tipo_usuario !== 'medico' || !isClaimed) return;

      try {

        const data = await getConsulta(curCid, token);

        if (data.historiaClinica) {
          if (Array.isArray(data.historiaClinica)) {
            const arr = data.historiaClinica as any[];
            data.historiaClinica = arr.length > 0 ? { id: arr[0].id, conteudo: removeAdministrativeFields(arr[0].conteudo) } : undefined;
          } else if (data.historiaClinica.conteudo) {
            data.historiaClinica.conteudo = removeAdministrativeFields(data.historiaClinica.conteudo);
          }
        }
        setConsultaDetails(data);
        if (data.paciente?.notas) {
          setPacienteNotas(data.paciente.notas);
        }
      } catch (err) {
        console.error('[AtendimentoInner] Erro ao buscar detalhes da consulta:', err);
      }
    }

    fetchPatientDetails();
  }, [consultaId, consultaIdState, token, user?.tipo_usuario, isClaimed]);

  // Buscar histórico de consultas do paciente se for médico
  useEffect(() => {
    async function fetchHistory() {
      if (consultaDetails && token && user?.tipo_usuario === 'medico') {
        const pacienteId = consultaDetails.pacienteId;
        if (pacienteId) {
          try {

            setLoadingHistorico(true);
            const historico = await getHistoricoConsultasPaciente(pacienteId, token);

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
  }, [consultaDetails, token, user?.tipo_usuario, isClaimed]);

  // Buscar histórico de prescrições do paciente se for médico
  useEffect(() => {
    async function fetchPrescriptionHistory() {
      if (consultaDetails && token && user?.tipo_usuario === 'medico' && isClaimed) {
        const pacienteId = consultaDetails.pacienteId;
        if (pacienteId) {
          try {
            setLoadingHistoricoPrescricoes(true);
            const data = await getPrescricoesByPaciente(pacienteId, token);
            setHistoricoPrescricoes(data);
          } catch (err) {
            console.error('[AtendimentoInner] Erro ao buscar histórico de prescrições:', err);
          } finally {
            setLoadingHistoricoPrescricoes(false);
          }
        }
      }
    }

    fetchPrescriptionHistory();
  }, [consultaDetails, token, user?.tipo_usuario, isClaimed]);


  const handleConnected = () => {
    remoteConnectedRef.current = true;
    setConnecting(false);
    setConnectionFailed(false);
    setReconnecting(false);
    setRemoteDisconnected(false);
    setShowExitMessage(false);
    setRemoteConnected(true);
    setStatusText('Em consulta');
    console.log('[UI] Consulta conectada com sucesso.');
  };

  // Efeito para garantir que o stream remoto seja anexado ao elemento de vídeo assim que disponível
  useEffect(() => {
    if (remoteStream && remoteRef.current) {
      console.log('[UI] Anexando stream remoto ao elemento de vídeo...');
      remoteRef.current.srcObject = remoteStream;
      remoteRef.current.play().catch(err => {
        console.warn('[UI] Falha ao dar play no vídeo remoto (pode requerer interação):', err);
      });
    }
  }, [remoteStream, remoteRef.current]);

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



  const handleOptionToggle = (field: 'repouso' | 'destino_final', option: string) => {
    setAtendimentoData(prev => ({
      ...prev,
      [field]: prev[field] === option ? '' : option
    }));
  };

  // Helper para toggle de accordions
  useEffect(() => {
    async function fetchPrescricoes() {
      const cid = getConsultaIdFromUrl() || consultaIdState || consultaId || '';
      if (cid && token && role === 'medico' && isClaimed) {
        setLoadingPrescricoes(true);
        try {
          const list = await getPrescricoesByConsulta(Number(cid), token);
          setActivePrescricoes(list);
        } catch (err) {
          console.error('Erro ao buscar prescrições:', err);
        } finally {
          setLoadingPrescricoes(false);
        }
      }
    }
    fetchPrescricoes();
  }, [consultaIdState, consultaId, token, role, isClaimed]);

  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Handler para submeter uma nova prescrição
  const handleSubmitPrescricao = async () => {
    if (!prescricaoData.medicamento || !prescricaoData.dosagem || !prescricaoData.frequencia || !prescricaoData.duracao) {
      modal.error('Campos obrigatórios', 'Preencha todos os campos obrigatórios da prescrição.');
      return;
    }

    setIsSubmittingPrescricao(true);
    try {
      // Adiciona a prescrição localmente com flag isNew
      const novaPrescricao = {
        id: Date.now(), // ID temporário
        consultaId: Number(consultaId),
        medicamento: prescricaoData.medicamento,
        marca: prescricaoData.marca || null,
        dosagem: prescricaoData.dosagem,
        frequencia: prescricaoData.frequencia,
        duracao: prescricaoData.duracao,
        inclusoConvenio: prescricaoData.inclusoConvenio,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isNew: true // Flag para identificar prescrições ainda não salvas no banco
      } as any;

      setActivePrescricoes(prev => [...prev, novaPrescricao]);

      // Limpa o formulário
      setPrescricaoData({
        medicamento: '',
        marca: '',
        dosagem: '',
        frequencia: '',
        duracao: '',
        inclusoConvenio: false
      });
      setShowPrescricaoForm(false);
    } catch (err) {
      console.error('Erro ao adicionar prescrição:', err);
      modal.error('Erro', 'Não foi possível adicionar a prescrição.');
    } finally {
      setIsSubmittingPrescricao(false);
    }
  };

  // Handler para mudança no campo medicamento (com autocomplete)
  const handleMedicamentoChange = async (value: string) => {
    setPrescricaoData(prev => ({ ...prev, medicamento: value }));

    if (value.length > 2 && token) {
      try {
        const sugestoes = await getSugestoesMedicamentos(value, token);
        setMedicamentoSugestoes(sugestoes);
        setShowMedicamentoSugestoes(true);
      } catch (err) {
        console.error('Erro ao buscar sugestões de medicamentos:', err);
      }
    } else {
      setShowMedicamentoSugestoes(false);
    }
  };

  // Handler para mudança no campo marca (com autocomplete)
  const handleMarcaChange = async (value: string) => {
    setPrescricaoData(prev => ({ ...prev, marca: value }));

    if (value.length > 1 && token) {
      try {
        const sugestoes = await getSugestoesMarcas(value, token);
        setMarcaSugestoes(sugestoes);
        setShowMarcaSugestoes(true);
      } catch (err) {
        console.error('Erro ao buscar sugestões de marcas:', err);
      }
    } else {
      setShowMarcaSugestoes(false);
    }
  };

  // Handler para deletar uma prescrição
  const handleDeletePrescricao = async (id: number) => {
    const prescricao = activePrescricoes.find(p => p.id === id);
    if (!prescricao) return;

    const isNew = (prescricao as any).isNew;

    if (isNew) {
      // Se é nova e ainda não foi salva, apenas remove localmente
      setActivePrescricoes(prev => prev.filter(p => p.id !== id));
    } else {
      // Se já está no banco, faz a chamada para deletar
      try {
        if (token) {
          await deletePrescricao(id, token);
          setActivePrescricoes(prev => prev.filter(p => p.id !== id));
        }
      } catch (err) {
        console.error('Erro ao deletar prescrição:', err);
        modal.error('Erro', 'Não foi possível deletar a prescrição.');
      }
    }
  };

  // Handler para baixar PDF de uma prescrição
  const handleDownloadPrescricaoPdf = async (id: number) => {
    if (!token) return;

    try {
      const blob = await downloadPrescricaoPdf(id, token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prescricao_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      modal.error('Erro', 'Não foi possível baixar o PDF da prescrição.');
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
    if (!cid || !token || (role === 'medico' && !isClaimed)) return;
    if (pollingRef.current !== null) return;

    let stopped = false;
    const check = async () => {
      try {
        const resp = await listParticipants(cid, token);
        if (!stopped && Array.isArray(resp?.participants) && resp.participants.length >= 2) {
          // Se o polling detecta 2 pessoas mas não estamos conectados, reforça o sinal de 'ready'
          if (!remoteConnected) {
            if (!hasReadySignalRef.current) {
              console.log('[UI] Polling detectou participantes. Ativando handshake...');
              hasReadySignalRef.current = true;
            }
            // Chama independentemente para garantir que um médico entrando depois dispare a oferta
            checkAndInitiateOffering();
          }
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
    const intervalMs = 5000; // 5s para reduzir carga na API (evita spam de checkAuth)
    const timerId = window.setInterval(check, intervalMs);
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
      if (sessionRef.current && !remoteConnected) {
        // Se já houver uma oferta iniciada há pouco tempo e ainda estivermos em estado instável, aguardamos.
        // Mas permitimos re-tentar se estiver 'stable' novamente ou se passou o tempo do timeout.
        if (sessionRef.current.pc.signalingState !== 'stable' && offeringInitiatedRef.current) {
          console.log('[UI] [Handshake] Já existe processo em curso. Estado:', sessionRef.current.pc.signalingState);
          return;
        }

        offeringInitiatedRef.current = true;
        try {
          console.log('[UI] [Handshake] Enviando oferta WebRTC...');
          if (sessionRef.current && 'setPeerReady' in sessionRef.current) {
            (sessionRef.current as any).setPeerReady();
          }
          await sessionRef.current.createAndSendOffer();
        } catch (err) {
          console.error('[UI] [Handshake] ❌ Erro ao enviar oferta:', err);
          // Permite tentar novamente após 3 segundos em caso de erro
          setTimeout(() => { offeringInitiatedRef.current = false; }, 3000);
        }
      } else {
        if (!sessionRef.current) console.log('[UI] [Handshake] Session null');
        if (remoteConnected) console.log('[UI] [Handshake] Já conectado');
      }
    } else {
      // Debug log opcional
      // console.log('[UI] [Handshake] Condições não atendidas:', { role, hasReady: hasReadySignalRef.current, isLocalReady: isLocalReadyRef.current });
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

          router.replace(`/consultas/aguardando?id=${cid}`);
          return;
        }
      } catch (e) {
        console.error('[Atendimento] Falha ao verificar médico antes de iniciar flow:', e);
      }
    }

    claimingRef.current = true;

    try {
      const { roomId: rId, iceServers: ice } = await psClaim(cid, token);
      setIsClaimed(true); // Permite que os useEffects de busca de dados rodem agora que temos acesso
      setRoomId(rId);
      setConsultaIdState(cid);

      // Persiste os dados para futuras reconexões (refresh de página)
      try {
        sessionStorage.setItem('consulta_reconnect', JSON.stringify({
          roomId: rId,
          consultaId: cid,
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
          remoteConnectedRef.current = false;
          setRemoteDisconnected(true);
          setRemoteConnected(false);
          setStatusText('O outro usuário saiu da sala.');
          // Reset para permitir nova oferta se ele voltar
          hasReadySignalRef.current = false;
          offeringInitiatedRef.current = false;
        }

        // Quando o paciente recebe a notificação de que o médico está desligando
        if (ev === 'doctor-disconnecting') {
          const u = getUser();
          const r = u?.tipo_usuario === 'medico' ? 'medico' : 'paciente';

          if (r === 'paciente') {
            console.log('[Atendimento] Paciente recebeu notificação: médico desligando');
            // Desconectar imediatamente e redirecionar para /inicio
            bypassBeforeUnloadRef.current = true;
            try { sessionRef.current?.end(); } catch { }
            try { sessionStorage.removeItem('ps_room'); } catch { }
            try { sessionStorage.removeItem('consulta_reconnect'); } catch { }

            // Pegar o ID da consulta atual para a avaliação
            const currentCid = getConsultaIdFromUrl() || consultaIdState || consultaId;
            router.push(`/inicio?showRating=true&consultaId=${currentCid}`);
          }
        }
      });

      session.onRemoteTrack((stream) => {
        console.log('[UI] Recebido stream remoto. ID:', stream.id);
        setRemoteStream(stream);
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
        remoteConnectedRef.current = false;
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

      // Failsafe: se nada aconteceu em 5s, força handshake; em 12s repete oferta (caso a primeira se perca no signaling)
      setTimeout(() => {
        if (role === 'medico' && !offeringInitiatedRef.current && isLocalReadyRef.current) {
          hasReadySignalRef.current = true;
          checkAndInitiateOffering();
        }
      }, 5000);
      setTimeout(() => {
        if (role === 'medico' && !remoteConnectedRef.current && sessionRef.current) {
          offeringInitiatedRef.current = false;
          hasReadySignalRef.current = true;
          checkAndInitiateOffering();
        }
      }, 12000);

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
      // Verifica se o médico está anulando o paciente
      const isAnulacao = atendimentoData.destino_final?.toLowerCase().includes('anular');

      // Se for anulação, apenas verifica se o destino final foi preenchido
      if (isAnulacao) {
        if (!atendimentoData.destino_final) {
          setShowValidation(true);
          modal.error(
            'Campos pendentes',
            'Por favor, selecione o motivo da anulação no campo Destino Final.'
          );
          return;
        }
        // Se destino final de anulação está preenchido, permite encerrar
      } else {
        // Validação completa para casos normais
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

      // Notificar o paciente que o médico está desligando
      try {
        sessionRef.current?.sendDoctorDisconnecting();
        console.log('[Atendimento] Notificação enviada ao paciente: médico desligando');
      } catch (err) {
        console.error('[Atendimento] Erro ao notificar paciente:', err);
      }

      // Abrir modal de confirmação para o médico
      setIsConfirmingEnd(true);
    } else {
      confirmFinishCall();
    }
  }

  async function confirmFinishCall() {
    // Permitir navegação sem disparar o aviso do navegador (beforeunload)
    bypassBeforeUnloadRef.current = true;

    const cid = getConsultaIdFromUrl() || consultaIdState || consultaId || '';

    // Se for médico, salvar dados ANTES de terminar a chamada
    if (role === 'medico' && cid && token) {
      try {
        console.log('[Atendimento] Médico: iniciando salvamento dos dados...');

        // Salvar Prescrições
        const newPrescricoes = activePrescricoes.filter((p: any) => p.isNew);
        if (newPrescricoes.length > 0) {
          console.log(`[Atendimento] Salvando ${newPrescricoes.length} prescrições...`);
          for (let i = 0; i < newPrescricoes.length; i++) {
            const p = newPrescricoes[i];
            await createPrescricao({
              consultaId: Number(cid),
              medicamento: p.medicamento,
              marca: p.marca || undefined,
              dosagem: p.dosagem,
              frequencia: p.frequencia,
              duracao: p.duracao,
              inclusoConvenio: p.inclusoConvenio,
              pdf: (i === 0) ? (signedPdfFile || undefined) : undefined
            }, token);
            console.log(`[Atendimento] Prescrição ${i + 1}/${newPrescricoes.length} salva`);
          }
        }

        // Salvar Notas
        if (pacienteNotas) {
          console.log('[Atendimento] Salvando notas do paciente...');
          await updatePacienteNotas(cid, token, pacienteNotas);
          console.log('[Atendimento] Notas salvas com sucesso');
        }

        // Finalizar Consulta
        const hora_fim = new Date().toTimeString().slice(0, 8);
        console.log('[Atendimento] Finalizando consulta...');
        await endConsulta(cid, token, hora_fim, atendimentoData);
        console.log('[Atendimento] Consulta finalizada com sucesso');

        // Limpar estados locais
        setSignedPdfFile(null);
      } catch (err) {
        console.error('[Atendimento] ERRO ao salvar dados:', err);
        modal.error(
          'Erro ao Salvar',
          'Houve um erro ao salvar os dados da consulta. Por favor, verifique sua conexão e tente novamente.'
        );
        // Não prosseguir se houver erro no salvamento
        bypassBeforeUnloadRef.current = false;
        return;
      }
    }

    // Terminar a chamada WebRTC
    try { sessionRef.current?.end(); } catch { }
    try { sessionStorage.removeItem('ps_room'); } catch { }
    try { sessionStorage.removeItem('consulta_reconnect'); } catch { }

    // Navegar para a página apropriada
    if (role === 'paciente') {
      router.push(`/inicio?showRating=true&consultaId=${cid}`);
    } else {
      router.push('/consultas');
    }
  }

  async function confirmFinishWithValidation() {
    if (role === 'medico') {
      const isAnulacao = atendimentoData.destino_final?.toLowerCase().includes('anular');
      if (isAnulacao) {
        if (!atendimentoData.destino_final) {
          setShowValidation(true);
          modal.error('Campos pendentes', 'Por favor, selecione o motivo da anulação.');
          return;
        }
      } else {
        const missing = [];
        if (!atendimentoData.evolucao.trim()) missing.push('Evolução');
        if (!atendimentoData.plano_terapeutico.trim()) missing.push('Plano Terapêutico');
        if (!atendimentoData.diagnostico.trim()) missing.push('Diagnóstico');
        if (!atendimentoData.repouso) missing.push('Repouso');
        if (!atendimentoData.destino_final) missing.push('Destino Final');

        if (missing.length > 0) {
          setShowValidation(true);
          modal.error('Campos pendentes', `Por favor, preencha os seguintes campos antes de finalizar: ${missing.join(', ')}.`);
          return;
        }

        // Validação do PDF caso haja prescrições novas
        const hasNewPrescricoes = activePrescricoes.some((p: any) => p.isNew);
        if (hasNewPrescricoes && !signedPdfFile) {
          modal.error('Prescrição não assinada', 'Você adicionou novos medicamentos. Por favor, gere e anexe o PDF assinado (.gov) no painel lateral antes de finalizar.');
          return;
        }
      }
    }

    setIsConfirmingEnd(false);
    confirmFinishCall();
  }

  // Função para filtrar campos administrativos do prontuário de triagem
  const removeAdministrativeFields = (content: string): string => {
    if (!content) return content;
    const lines = content.split('\n');
    const filteredLines: string[] = [];
    let inHeader = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      if (inHeader) {
        if (
          trimmedLine.startsWith('---') ||
          trimmedLine.includes('PRONTUÁRIO DE TRIAGEM') ||
          trimmedLine.includes('ID DO PACIENTE:') ||
          trimmedLine.includes('DATA DA TRIAGEM:') ||
          trimmedLine.includes('RESPONSÁVEL:') ||
          trimmedLine.includes('⚠️ SÍNTESE DA CONDUTA:') ||
          trimmedLine.includes('PRÉ-CONSULTA') ||
          trimmedLine === ''
        ) {
          continue;
        } else {
          inHeader = false;
          filteredLines.push(line);
        }
      } else {
        filteredLines.push(line);
      }
    }
    return filteredLines.join('\n').trim();
  };

  // Detectar mensagens não lidas quando o chat está fechado
  useEffect(() => {
    if (!showChat && messages.length > lastMessageCountRef.current) {
      setUnreadMessages(messages.length - lastMessageCountRef.current);
    } else if (showChat) {
      setUnreadMessages(0);
      lastMessageCountRef.current = messages.length;
    }
  }, [messages, showChat]);

  // Funções auxiliares para prescrição (apenas as que não foram duplicadas)
  async function handleSaveNotas() {
    const curCid = getConsultaIdFromUrl() || consultaIdState || consultaId;
    if (!curCid || !token) return;

    setIsSavingNotas(true);
    try {
      await updatePacienteNotas(curCid, token, pacienteNotas);
      modal.success('Sucesso', 'Notas do paciente atualizadas.');
      setIsEditingNotas(false);
    } catch (err) {
      console.error('Erro ao salvar notas:', err);
      modal.error('Erro', 'Não foi possível salvar as notas.');
    } finally {
      setIsSavingNotas(false);
    }
  }

  function cancelPrescricaoForm() {
    setPrescricaoData({
      medicamento: '',
      marca: '',
      dosagem: '',
      frequencia: '',
      duracao: '',
      inclusoConvenio: false
    });
    setShowPrescricaoForm(false);
  }

  // Lógica para Gerar e Baixar PDF Profissional
  async function handleGenerateFinalPDF() {
    if (activePrescricoes.length === 0) {
      modal.error('Erro', 'Adicione pelo menos um medicamento para gerar a prescrição.');
      return;
    }

    setIsGeneratingPDF(true);
    // Expandir o accordion de prescrições se não estiver aberto para garantir renderização do template
    if (!openAccordions['prescricoes']) {
      setOpenAccordions(prev => ({ ...prev, prescricoes: true }));
    }

    // Pequeno delay para garantir que o DOM renderizou o template com os dados
    setTimeout(async () => {
      const element = document.getElementById('atendimento-prescription-pdf-template');
      if (!element) {
        setIsGeneratingPDF(false);
        modal.error('Erro', 'Não foi possível localizar o template de impressão.');
        return;
      }

      try {
        const canvas = await html2canvas(element, {
          scale: 1.6, // Reduzido de 2.0 para diminuir tamanho sem perder legibilidade
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85); // Mudado para JPEG com compressão para reduzir drasticamente o tamanho
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true // Ativa compressão nativa do jsPDF
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Prescricao_${consultaDetails?.paciente?.nome_completo || 'Paciente'}_${new Date().toLocaleDateString()}.pdf`);

        // Marcar como gerada para trovar a UI
        setPrescricaoGerada(true);
        setShowPrescricaoForm(false);
        modal.success('PDF Gerado!', 'Assine o documento no portal do Gov.br e anexe o arquivo final aqui.');
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        modal.error('Erro', 'Falha ao processar a imagem do PDF.');
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 800);
  }

  async function handleSignedPdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite de segurança para Vercel (4.5MB total de request, então o arquivo deve ser < ~3MB)
    const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
    if (file.size > MAX_FILE_SIZE) {
      modal.error('Arquivo muito grande', 'O PDF assinado deve ter no máximo 3MB para ser processado corretamente.');
      e.target.value = '';
      return;
    }

    if (file.type !== 'application/pdf') {
      modal.error('Formato Inválido', 'Por favor, anexe apenas arquivos PDF assinados.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Data = (reader.result as string).split(',')[1];
        setSignedPdfFile({
          data: base64Data,
          mimetype: file.type
        });
        modal.success('Sucesso', 'Prescrição assinada anexada com sucesso!');
      };
    } catch (err) {
      console.error('Erro ao ler PDF:', err);
      modal.error('Erro', 'Não foi possível processar o arquivo.');
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
                    id="triagem"
                    title="História Clínica (Triagem)"
                    isOpen={!!openAccordions['triagem']}
                    onToggle={toggleAccordion}
                    isFilled={!!consultaDetails?.historiaClinica}
                  >
                    {consultaDetails?.historiaClinica ? (
                      <div className="triagem-content-wrapper" style={{ padding: '0.5rem 0' }}>
                        <FormattedText
                          text={consultaDetails.historiaClinica.conteudo || 'Não informada'}
                          style={{
                            fontSize: '1rem',
                            color: 'var(--text-primary)',
                            lineHeight: 1.7
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                        Informações de triagem não encontradas.
                      </div>
                    )}
                  </Accordion>
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
                            <div className="historico-item-avatar">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                            </div>
                            <div className="historico-item-info">
                              <div className="historico-item-date">
                                📅 {formatDate(consulta.data_consulta || consulta.createdAt)}
                              </div>
                            </div>
                            <button
                              className="historico-item-button"
                              onClick={() => setConsultaSelecionada(consulta)}
                            >
                              Ver
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
                    {loadingHistoricoPrescricoes ? (
                      <p className="accordion-placeholder">Carregando histórico...</p>
                    ) : historicoPrescricoes.length === 0 ? (
                      <p className="accordion-placeholder">Nenhuma prescrição anterior registrada.</p>
                    ) : (
                      <div className="historico-list">
                        {historicoPrescricoes.map((prescrito) => (
                          <div key={prescrito.id} className="historico-item">
                            <div className="historico-item-avatar" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                                <path d="m8.5 8.5 7 7" />
                              </svg>
                            </div>
                            <div className="historico-item-info">
                              <div className="historico-item-date" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                {prescrito.medicamento} {prescrito.marca ? `(${prescrito.marca})` : ''}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                                {formatDate((prescrito as any).consulta?.data_consulta || (prescrito as any).consulta?.createdAt || prescrito.createdAt)}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {prescrito.dosagem} • {prescrito.frequencia} • {prescrito.duracao}
                              </div>
                            </div>
                            <div className="historico-item-actions">
                              <button
                                className="action-btn-secondary"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '0.75rem',
                                  opacity: (prescrito as any).tem_pdf ? 1 : 0.4,
                                  cursor: (prescrito as any).tem_pdf ? 'pointer' : 'not-allowed'
                                }}
                                disabled={!(prescrito as any).tem_pdf}
                                onClick={() => handleDownloadPrescricaoPdf(prescrito.id)}
                                title={(prescrito as any).tem_pdf ? 'Baixar PDF Assinado' : 'PDF não disponível'}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                                </svg>
                                PDF
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Accordion>

                  <Accordion
                    id="prescricoes"
                    title="Prescrições"
                    isOpen={!!openAccordions['prescricoes']}
                    onToggle={toggleAccordion}
                    isFilled={activePrescricoes.length > 0 || !!signedPdfFile}
                  >
                    {!prescricaoGerada ? (
                      <>
                        <div className="prescricoes-list" style={{ marginBottom: activePrescricoes.length > 0 ? '1rem' : '0' }}>
                          {loadingPrescricoes ? (
                            <p style={{ fontSize: '0.85rem', color: '#6b7280', textAlign: 'center' }}>Carregando...</p>
                          ) : activePrescricoes.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' }}>Nenhuma prescrição adicionada.</p>
                          ) : (
                            activePrescricoes.map((p) => (
                              <div key={p.id} className="prescricao-card">
                                <div className="prescricao-card-header">
                                  <div>
                                    <div className="prescricao-card-medicamento">{p.medicamento}</div>
                                    {p.marca && <div className="prescricao-card-marca">{p.marca}</div>}
                                  </div>
                                  <button
                                    className="prescricao-card-btn-delete"
                                    onClick={() => handleDeletePrescricao(p.id)}
                                    title="Excluir"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div className="prescricao-card-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span><strong>Dosagem:</strong> {p.dosagem}</span>
                                  <span><strong>Frequência:</strong> {p.frequencia}</span>
                                  <span><strong>Duração:</strong> {p.duracao}</span>
                                </div>
                                {p.inclusoConvenio && <div className="prescricao-card-badge">Convênio</div>}
                              </div>
                            ))
                          )}
                        </div>

                        <div className="prescricao-form">
                          {!showPrescricaoForm ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <button
                                className="prescricao-add-button"
                                onClick={() => setShowPrescricaoForm(true)}
                                style={{ width: '100%' }}
                              >
                                <span>+</span> Adicionar Medicamento
                              </button>

                              {activePrescricoes.length > 0 && (
                                <button
                                  className="prescricao-btn prescricao-btn-submit"
                                  style={{ width: '100%', padding: '12px', background: 'var(--color-primary-600)' }}
                                  onClick={handleGenerateFinalPDF}
                                  disabled={isGeneratingPDF}
                                >
                                  {isGeneratingPDF ? 'Processando...' : 'Gerar PDF para Assinar'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="prescricao-form-inputs">
                              <div className="prescricao-checkbox-wrapper">
                                <input
                                  type="checkbox"
                                  id="incluso-convenio"
                                  checked={prescricaoData.inclusoConvenio}
                                  onChange={(e) => setPrescricaoData(prev => ({ ...prev, inclusoConvenio: e.target.checked }))}
                                />
                                <label htmlFor="incluso-convenio">Incluso no convênio</label>
                              </div>

                              <div className="prescricao-input-wrapper">
                                <label className="prescricao-input-label">Medicamento *</label>
                                <input
                                  type="text"
                                  className="prescricao-input"
                                  placeholder="Digite o nome do medicamento..."
                                  value={prescricaoData.medicamento}
                                  onChange={(e) => handleMedicamentoChange(e.target.value)}
                                  onBlur={() => setTimeout(() => setShowMedicamentoSugestoes(false), 200)}
                                />
                                {showMedicamentoSugestoes && medicamentoSugestoes.length > 0 && (
                                  <div className="prescricao-suggestions">
                                    {medicamentoSugestoes.map((sugestao, idx) => (
                                      <div
                                        key={idx}
                                        className="prescricao-suggestions-item"
                                        onClick={() => {
                                          setPrescricaoData(prev => ({ ...prev, medicamento: sugestao }));
                                          setShowMedicamentoSugestoes(false);
                                        }}
                                      >
                                        {sugestao}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="prescricao-input-wrapper">
                                <label className="prescricao-input-label">Marca</label>
                                <input
                                  type="text"
                                  className="prescricao-input"
                                  placeholder="Digite a marca (opcional)..."
                                  value={prescricaoData.marca}
                                  onChange={(e) => handleMarcaChange(e.target.value)}
                                  onBlur={() => setTimeout(() => setShowMarcaSugestoes(false), 200)}
                                />
                                {showMarcaSugestoes && marcaSugestoes.length > 0 && (
                                  <div className="prescricao-suggestions">
                                    {marcaSugestoes.map((sugestao, idx) => (
                                      <div
                                        key={idx}
                                        className="prescricao-suggestions-item"
                                        onClick={() => {
                                          setPrescricaoData(prev => ({ ...prev, marca: sugestao }));
                                          setShowMarcaSugestoes(false);
                                        }}
                                      >
                                        {sugestao}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="prescricao-input-wrapper">
                                <label className="prescricao-input-label">Dosagem *</label>
                                <input
                                  type="text"
                                  className="prescricao-input"
                                  placeholder="Ex: 500mg, 1 comprimido, 5ml..."
                                  value={prescricaoData.dosagem}
                                  onChange={(e) => setPrescricaoData(prev => ({ ...prev, dosagem: e.target.value }))}
                                />
                              </div>

                              <div className="prescricao-input-wrapper">
                                <label className="prescricao-input-label">Frequência *</label>
                                <input
                                  type="text"
                                  className="prescricao-input"
                                  placeholder="Ex: 8/8h, uma vez ao dia, se dor..."
                                  value={prescricaoData.frequencia}
                                  onChange={(e) => setPrescricaoData(prev => ({ ...prev, frequencia: e.target.value }))}
                                />
                              </div>

                              <div className="prescricao-input-wrapper">
                                <label className="prescricao-input-label">Duração *</label>
                                <input
                                  type="text"
                                  className="prescricao-input"
                                  placeholder="Ex: 7 dias, uso contínuo..."
                                  value={prescricaoData.duracao}
                                  onChange={(e) => setPrescricaoData(prev => ({ ...prev, duracao: e.target.value }))}
                                />
                              </div>

                              <div className="prescricao-form-actions">
                                <button
                                  className="prescricao-btn prescricao-btn-cancel"
                                  onClick={cancelPrescricaoForm}
                                  disabled={isSubmittingPrescricao}
                                >
                                  Cancelar
                                </button>
                                <button
                                  className="prescricao-btn prescricao-btn-submit"
                                  onClick={handleSubmitPrescricao}
                                  disabled={isSubmittingPrescricao || !prescricaoData.medicamento || !prescricaoData.dosagem}
                                >
                                  {isSubmittingPrescricao ? 'Salvando...' : 'Agregar'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="signed-upload-zone" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                        <div style={{
                          background: 'var(--bg-secondary)',
                          padding: '1rem',
                          borderRadius: '12px',
                          border: '2px dashed var(--border-color)',
                          textAlign: 'center'
                        }}>
                          <input
                            type="file"
                            accept=".pdf"
                            style={{ display: 'none' }}
                            ref={hiddenFileInputRef}
                            onChange={handleSignedPdfUpload}
                          />

                          {signedPdfFile ? (
                            <div style={{ color: '#22c55e', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                              <span>✅ PDF Assinado Anexado</span>
                              <button
                                className="action-btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                onClick={() => hiddenFileInputRef.current?.click()}
                              >
                                Substituir
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                                Assine o PDF no <strong>Gov.br</strong> e anexe o arquivo final abaixo.
                              </p>
                              <button
                                className="prescricao-add-button"
                                style={{ width: '100%', marginTop: '5px' }}
                                onClick={() => hiddenFileInputRef.current?.click()}
                              >
                                Anexar PDF Assinado
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          className="prescricao-btn-cancel"
                          style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: '1px solid currentColor',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            alignSelf: 'center',
                            padding: '2px 0'
                          }}
                          onClick={() => setPrescricaoGerada(false)}
                        >
                          Voltar para edição de itens
                        </button>
                      </div>
                    )}
                  </Accordion>

                  <Accordion
                    id="notas"
                    title="Notas"
                    isOpen={!!openAccordions['notas']}
                    onToggle={toggleAccordion}
                  >
                    <div className="notas-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {!isEditingNotas ? (
                        <>
                          {pacienteNotas ? (
                            <div className="prescricao-card" style={{ marginBottom: '8px' }}>
                              <div className="prescricao-card-header">
                                <div className="prescricao-card-medicamento">Notas do Paciente</div>
                              </div>
                              <div className="prescricao-card-info" style={{ whiteSpace: 'pre-wrap' }}>
                                {pacienteNotas}
                              </div>
                              <button
                                className="prescricao-add-button"
                                onClick={() => setIsEditingNotas(true)}
                                style={{ marginTop: '12px', width: '100%', fontSize: '0.8rem', padding: '6px' }}
                              >
                                Editar Notas
                              </button>
                            </div>
                          ) : (
                            <button
                              className="prescricao-add-button"
                              onClick={() => setIsEditingNotas(true)}
                              style={{ width: '100%' }}
                            >
                              <span>+</span> Adicionar Notas
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <textarea
                            className="atendimento-textarea"
                            placeholder="Notas exclusivas do médico sobre este paciente..."
                            value={pacienteNotas}
                            onChange={(e) => setPacienteNotas(e.target.value)}
                            rows={6}
                            style={{ minHeight: '150px', width: '100%' }}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="prescricao-btn prescricao-btn-cancel"
                              onClick={() => setIsEditingNotas(false)}
                              disabled={isSavingNotas}
                              style={{ flex: 1 }}
                            >
                              Cancelar
                            </button>
                            <button
                              className="prescricao-btn prescricao-btn-submit"
                              onClick={handleSaveNotas}
                              disabled={isSavingNotas}
                              style={{ flex: 2 }}
                            >
                              {isSavingNotas ? 'Salvando...' : 'Salvar Notas'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
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
                      {unreadMessages > 0 && !showChat && <span className="chat-notification-badge"></span>}
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
                        <span className="patient-info-value">{consultaDetails.paciente?.nome_completo || '-'}</span>
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

            {/* Chat Modal para Médico */}
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
                            <Button variant="primary" onClick={confirmFinishCall} style={{ marginTop: '1.5rem' }}>
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
                    {unreadMessages > 0 && !showChat && <span className="chat-notification-badge"></span>}
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
          </div>
        )}
      </ContentModal>

      {/* Modal de Confirmação de Finalização (Médico) */}
      <ContentModal
        isOpen={isConfirmingEnd}
        onClose={() => setIsConfirmingEnd(false)}
        title="Confirmar Informações do Atendimento"
        size="xl"
      >
        <div className="confirmation-screen">
          <p className="confirmation-description">
            Revise abaixo todas as informações inseridas durante a consulta. Você pode editá-las antes de finalizar definitivamente.
          </p>

          <div className="confirmation-grid">
            <div className="confirmation-section">
              <h4>Ficha de Atendimento</h4>
              <div className="confirmation-form">
                <div className="form-group">
                  <label>Evolução</label>
                  <textarea
                    className="atendimento-textarea"
                    style={{ minHeight: '100px' }}
                    value={atendimentoData.evolucao}
                    onChange={(e) => setAtendimentoData(prev => ({ ...prev, evolucao: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Notas Privadas (Sobre o Paciente)</label>
                  <textarea
                    className="atendimento-textarea"
                    style={{ minHeight: '80px', borderLeft: '4px solid var(--color-primary-500)' }}
                    placeholder="Notas exclusivas para seu controle..."
                    value={pacienteNotas}
                    onChange={(e) => setPacienteNotas(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Plano Terapêutico</label>
                  <textarea
                    className="atendimento-textarea"
                    style={{ minHeight: '100px' }}
                    value={atendimentoData.plano_terapeutico}
                    onChange={(e) => setAtendimentoData(prev => ({ ...prev, plano_terapeutico: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Diagnóstico</label>
                  <input
                    type="text"
                    className="atendimento-input-small"
                    value={atendimentoData.diagnostico}
                    onChange={(e) => setAtendimentoData(prev => ({ ...prev, diagnostico: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Repouso</label>
                    <select
                      className="atendimento-input-small"
                      value={atendimentoData.repouso}
                      onChange={(e) => setAtendimentoData(prev => ({ ...prev, repouso: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      {repousoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Destino Final</label>
                    <select
                      className="atendimento-input-small"
                      value={atendimentoData.destino_final}
                      onChange={(e) => setAtendimentoData(prev => ({ ...prev, destino_final: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      {destinoFinalOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                {atendimentoData.destino_final.toLowerCase().includes('ambulância') && (
                  <div className="confirmation-ambulance-fields" style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#b45309' }}>Dados para Envio de Ambulância</h5>
                    <div className="form-group">
                      <label>Endereço Completo</label>
                      <input
                        type="text"
                        className="atendimento-input-small"
                        value={atendimentoData.endereco_ambulancia.endereco}
                        onChange={(e) => setAtendimentoData(prev => ({
                          ...prev,
                          endereco_ambulancia: { ...prev.endereco_ambulancia, endereco: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="form-row" style={{ marginTop: '0.75rem' }}>
                      <div className="form-group">
                        <label>Complemento</label>
                        <input
                          type="text"
                          className="atendimento-input-small"
                          value={atendimentoData.endereco_ambulancia.complemento}
                          onChange={(e) => setAtendimentoData(prev => ({
                            ...prev,
                            endereco_ambulancia: { ...prev.endereco_ambulancia, complemento: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Telefone de Contato</label>
                        <input
                          type="text"
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
            </div>

            <div className="confirmation-section">
              <h4>Prescrições</h4>
              <div className="confirmation-prescriptions">
                {activePrescricoes.length === 0 ? (
                  <p className="no-prescriptions">Nenhuma prescrição adicionada.</p>
                ) : (
                  <div className="prescricao-list">
                    {activePrescricoes.map((p) => (
                      <div key={p.id} className="prescricao-card">
                        <div className="prescricao-card-header">
                          <div className="prescricao-card-medicamento">{p.medicamento}</div>
                          <button
                            className="prescricao-delete-btn"
                            onClick={() => handleDeletePrescricao(p.id)}
                          >
                            Excluir
                          </button>
                        </div>
                        <div className="prescricao-card-info">
                          {p.dosagem} - {p.frequencia} - {p.duracao}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'auto', textAlign: 'center' }}>
                  Para adicionar novas prescrições, utilize o painel lateral durante a consulta.
                </p>
              </div>
            </div>
          </div>

          <div className="confirmation-actions">
            <Button variant="ghost" onClick={() => setIsConfirmingEnd(false)}>
              Voltar
            </Button>
            <Button variant="primary" onClick={confirmFinishWithValidation}>
              Confirmar e Finalizar Atendimento
            </Button>
          </div>
        </div>
      </ContentModal >

      <Modal
        isOpen={modal.isOpen}
        config={modal.config}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
      />

      {/* Template para o PDF (Invisível) - Design de Prescrição Realista */}
      <div id="atendimento-prescription-pdf-template" style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
        <div id="prescription-pdf-template">
          <div className="pdf-inner-border"></div>

          <div className="pdf-header">
            <div className="pdf-logo-wrapper">
              <div className="pdf-logo-circle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22v-5" /><path d="M12 12V2" /><path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /><path d="m15 13-3-3-3 3" />
                </svg>
              </div>
              <div className="pdf-logo-text">
                <h1>JJ Telemedicina</h1>
                <p>Cuidado Digital de Excelência</p>
              </div>
            </div>
            <div className="pdf-header-meta">
              <div>JJ Serviços Médicos e Tecnológicos Ltda.</div>
              <div>CNPJ: 00.000.000/0001-00</div>
              <div>contato@jjtelemedicina.com.br</div>
              <div>www.jjtelemedicina.com.br</div>
            </div>
          </div>

          <div className="pdf-title-section">
            <h2 className="pdf-title-main">Receituário</h2>
            <p className="pdf-title-sub">Prescrição Médica Digital</p>
          </div>

          <div className="pdf-patient-section">
            <span className="pdf-patient-label">Para:</span>
            <p className="pdf-patient-name">{consultaDetails?.paciente?.nome_completo || 'Paciente'}</p>
          </div>

          <div className="pdf-prescription-body">
            {activePrescricoes.map((p, index) => (
              <div key={p.id} className="pdf-med-item">
                <span className="pdf-med-number">{index + 1}.</span>
                <div className="pdf-med-name-row">
                  <span className="pdf-med-name">{p.medicamento} {p.dosagem}</span>
                  <span className="pdf-med-quantity">1 Unidade</span>
                </div>

                <div className="pdf-instructions-box">
                  <div className="pdf-instruction-line">
                    <span className="pdf-instruction-label">Uso:</span>
                    Tomar conforme orientação: {p.frequencia} por {p.duracao}.
                  </div>
                  {p.marca && (
                    <div className="pdf-instruction-line" style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                      <span className="pdf-instruction-label">Obs:</span> Preferência por marca {p.marca}.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pdf-footer">
            <div className="pdf-seal-wrapper">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="pdf-signature-area">
              <div className="pdf-signature-line"></div>
              <p className="pdf-doctor-name">Dr(a). {getUser()?.nome || 'Médico'}</p>
              <p className="pdf-doctor-info">CRM/UF: 000000 - Especialista em Telemedicina</p>
            </div>

            <div className="pdf-auth-footer">
              <div>
                Emitido em: <strong>{formatDate(new Date())} às {formatTime(new Date())}</strong>
              </div>
              <div className="pdf-auth-code">
                CÓD: {Math.random().toString(36).substring(2, 10).toUpperCase()}-{consultaDetails?.id || 'REF'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}

export default function AtendimentoPage() {
  return (
    <Suspense fallback={<div className="atendimento-loading">Carregando atendimento...</div>}>
      <AtendimentoInner />
    </Suspense>
  );
}
