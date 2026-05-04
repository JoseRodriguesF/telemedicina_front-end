"use client";

import './atendimento.css';
import '@/app/inicio/inicio.css';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, useEffect } from 'react';
import { getUser, getToken } from '@/lib/auth';
import { createWebRTCSession } from '@/lib/webrtc';
import { psCreateRoom, psClaim, listParticipants, endConsulta, getConsulta, type ConsultaDetails, getHistoricoConsultasPaciente, type PSFullHistoryItem, updatePacienteNotas, listAnexosConsulta, type ConsultaAnexo, enviarAnexosConsulta, logEventoTecnico, downloadAnexo } from '@/lib/axios/consultas';
import { createPrescricao, getSugestoesMedicamentos, getSugestoesMarcas, getPrescricoesByConsulta, deletePrescricao, getPrescricoesByPaciente, Prescricao as PrescricaoType, downloadPrescricaoPdf } from '@/lib/axios/prescricoes';
import { gerarEvolucaoTriagemIA } from '@/lib/axios/chat';
import { getSignalUrl, getConsultaIdFromUrl } from '@/lib/signal';
import { Modal } from '@/components/common/Modal/Modal';
import { useModal } from '@/components/common/Modal/useModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { buscarCID, type CID10 } from '@/lib/constants/cid10';

// Novos sub-componentes refatorados
import AtendimentoVideoGrid from '@/components/appointments/atendimento/AtendimentoVideoGrid';
import AtendimentoToolbar from '@/components/appointments/atendimento/AtendimentoToolbar';
import AtendimentoChat from '@/components/appointments/atendimento/AtendimentoChat';
import ClinicalPanel from '@/components/appointments/atendimento/ClinicalPanel';
import AssistancePanel from '@/components/appointments/atendimento/AssistancePanel';
import AtendimentoModals from '@/components/appointments/atendimento/AtendimentoModals';
import PrescriptionPDFTemplate from '@/components/appointments/atendimento/PrescriptionPDFTemplate';

type ChatMessage = { 
  author: 'Você' | 'Médico' | 'Paciente'; 
  text?: string;
  attachment?: { id?: number; nome?: string; tipo_mime?: string; url?: string }
};

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

// Componente Accordion foi extraído para @/components/appointments/atendimento/Accordion

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
  const [unreadMessages, setUnreadMessages] = useState(0);
  const lastMessageCountRef = useRef(0);
  const [isUploadingChat, setIsUploadingChat] = useState(false);
  const fileInputChatRef = useRef<HTMLInputElement>(null);
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
  const [startTime, setStartTime] = useState<number | null>(null);
  const [maxTimeNotified, setMaxTimeNotified] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Estados para Prescrição Digital .gov
  const [prescricaoGerada, setPrescricaoGerada] = useState(false);
  const [signedPdfFile, setSignedPdfFile] = useState<{ data: string; mimetype: string } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [cidSugestoes, setCidSugestoes] = useState<CID10[]>([]);
  const [cidSearch, setCidSearch] = useState('');
  const [showCidSugestoes, setShowCidSugestoes] = useState(false);
  const [showCidSugestoesModal, setShowCidSugestoesModal] = useState(false);

  // Estados para Anexos (Arquivos enviados pelo paciente)
  const [anexos, setAnexos] = useState<ConsultaAnexo[]>([]);
  const [showAnexosModal, setShowAnexosModal] = useState(false);
  const [loadingAnexos, setLoadingAnexos] = useState(false);
  const [loadingAnexosHistory, setLoadingAnexosHistory] = useState(false);

  // Estado para Modal de Transcrição IA
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);

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
                data.historiaClinica = arr.length > 0 ? { ...arr[0], conteudo: removeAdministrativeFields(arr[0].conteudo) } : undefined;
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
            data.historiaClinica = arr.length > 0 ? { ...arr[0], conteudo: removeAdministrativeFields(arr[0].conteudo) } : undefined;
          } else if (data.historiaClinica.conteudo) {
            data.historiaClinica.conteudo = removeAdministrativeFields(data.historiaClinica.conteudo);
          }
        }
        setConsultaDetails(data);
        if (data.paciente?.notas) {
          setPacienteNotas(data.paciente.notas);
        }

        // --- Nova lógica: Gerar Evolução Clínica via IA a partir da Triagem ---
        // Se a evolução estiver vazia E existir uma história clínica (triagem)
        if (!data.evolucao && data.historiaClinica) {
          setAtendimentoData(prev => ({
            ...prev,
            evolucao: 'Gerando resumo clínico a partir da triagem...'
          }));
          
          gerarEvolucaoTriagemIA(data.historiaClinica, token)
            .then(res => {
              if (res.ok && res.evolucao) {
                setAtendimentoData(prev => ({
                  ...prev,
                  evolucao: res.evolucao
                }));
              } else {
                setAtendimentoData(prev => ({ ...prev, evolucao: '' }));
              }
            })
            .catch(err => {
              console.error('[AtendimentoInner] Erro ao gerar evolução da triagem:', err);
              setAtendimentoData(prev => ({ ...prev, evolucao: '' }));
            });
        } else if (data.evolucao) {
          // Se já existir evolução salva, preenche normalmente
          setAtendimentoData(prev => ({ ...prev, evolucao: data.evolucao || '' }));
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
    async function fetchAnexosHistory() {
      if (consultaSelecionada && !consultaSelecionada.anexos && token) {
        setLoadingAnexosHistory(true);
        try {
          const list = await listAnexosConsulta(consultaSelecionada.id, token);
          setConsultaSelecionada(prev => prev ? { ...prev, anexos: list } : null);
        } catch (err) {
          console.error('Erro ao buscar anexos do histórico:', err);
        } finally {
          setLoadingAnexosHistory(false);
        }
      }
    }
    fetchAnexosHistory();
  }, [consultaSelecionada?.id, token]);

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
    if (!startTime) {
      const cid = getConsultaIdFromUrl() || consultaIdState || consultaId || '';
      const saved = sessionStorage.getItem(`startTime_${cid}`);
      if (saved) {
        setStartTime(Number(saved));
      } else {
        const now = Date.now();
        setStartTime(now);
        sessionStorage.setItem(`startTime_${cid}`, String(now));
      }
    }
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
    especialidade_seguimento: '',
    resumo_consulta: '',
    selectedCIDs: [] as CID10[],
    endereco_ambulancia: {
      endereco: '',
      complemento: '',
      informacoes_adicionais: '',
      telefone: ''
    }
  });

  // Etapa do modal de confirmação: 1 = dados da consulta, 2 = resumo da consulta
  const [confirmationStep, setConfirmationStep] = useState(1);

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

  const handleDiagnosticoChange = async (value: string, isModal = false) => {
    setCidSearch(value);
    const sugestoes = await buscarCID(value);
    setCidSugestoes(sugestoes);
    if (isModal) {
      setShowCidSugestoesModal(value.length >= 1 && sugestoes.length > 0);
    } else {
      setShowCidSugestoes(value.length >= 1 && sugestoes.length > 0);
    }
  };

  const selectCID = (cid: CID10, isModal = false) => {
    // Adicionar à lista se não existir
    setAtendimentoData(prev => {
      const alreadyExists = prev.selectedCIDs.some(c => c.codigo === cid.codigo);
      if (alreadyExists) return prev;

      const newCIDs = [...prev.selectedCIDs, cid];
      // Atualizar o campo de texto diagnostico também para compatibilidade no envio
      const diagnosticoText = newCIDs.map(c => `${c.codigo} - ${c.nome}`).join(', ');
      
      return { 
        ...prev, 
        selectedCIDs: newCIDs,
        diagnostico: diagnosticoText
      };
    });

    setCidSearch('');
    if (isModal) {
      setShowCidSugestoesModal(false);
    } else {
      setShowCidSugestoes(false);
    }
  };

  const removeCID = (cidCodigo: string) => {
    setAtendimentoData(prev => {
      const newCIDs = prev.selectedCIDs.filter(c => c.codigo !== cidCodigo);
      const diagnosticoText = newCIDs.map(c => `${c.codigo} - ${c.nome}`).join(', ');
      
      return { 
        ...prev, 
        selectedCIDs: newCIDs,
        diagnostico: diagnosticoText
      };
    });
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
      
      // Cleanup de segurança: Parar mídia e fechar conexão ao sair da página
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      try { sessionRef.current?.end(); } catch (e) { }
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
              console.log('[UI] Polling detectou participantes. Ativando handshake hand...');
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

  // Efeito para cronômetro e notificações de tempo máximo
  useEffect(() => {
    if (!startTime || !remoteConnected || remoteDisconnected) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffInSecs = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(diffInSecs);

      const elapsedMins = diffInSecs / 60;
      // scheduled=true na URL significa Ambulatorial (50 min)
      // scheduled=false ou ausente significa Pronto Socorro (15 min)
      const isPS = !isScheduled;
      const isAmb = isScheduled;

      if (isPS && elapsedMins >= 15 && !maxTimeNotified) {
        if (role === 'medico') {
          modal.info('Atenção', 'A consulta de Pronto Atendimento atingiu 15 minutos. Por favor, finalize o atendimento.');
        }
        setMaxTimeNotified(true);
      } else if (isAmb && elapsedMins >= 50 && !maxTimeNotified) {
        modal.info('Atenção', `A consulta agendada atingiu 50 minutos.`);
        setMaxTimeNotified(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, remoteConnected, remoteDisconnected, consultaDetails?.status, maxTimeNotified, role, modal]);

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-scroll chat
  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  function sendMessage() {
    const t = draft.trim();
    if (!t || !sessionRef.current) return;
    
    // Incrementa unreadMessages para o outro lado? Não, aqui é local
    setMessages((prev) => [...prev, { author: 'Você', text: t }]);
    sessionRef.current.sendMessage(t);
    setDraft('');
  }

  async function handleChatFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token || !sessionRef.current) return;

    const curCid = getConsultaIdFromUrl() || consultaIdState || consultaId;
    if (!curCid) return;

    // Limite de 5MB
    if (file.size > 5 * 1024 * 1024) {
      modal.error('Arquivo muito grande', 'O limite para envio de arquivos no chat é de 5MB.');
      return;
    }

    setIsUploadingChat(true);
    try {
      // 1. Ler como Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      // 2. Salvar no banco (API)
      const res = await enviarAnexosConsulta(curCid, token, [
        { data: base64, nome: file.name, tipo_mime: file.type }
      ]);

      if (res.ok) {
        // 3. Buscar a lista atualizada para pegar o ID gerado (ou a API poderia retornar o ID)
        // Como o listarAnexos retorna a URL formatada, usamos ele
        const lista = await listAnexosConsulta(curCid, token);
        const novoAnexo = lista[lista.length - 1]; // O último inserido

        if (novoAnexo) {
          // 4. Enviar via DataChannel como JSON
          const attachmentMsg = JSON.stringify({
            type: 'attachment',
            attachment: novoAnexo
          });

          sessionRef.current.sendMessage(attachmentMsg);
          
          // 5. Adicionar localmente ao chat
          setMessages((prev) => [...prev, { 
            author: 'Você', 
            attachment: novoAnexo 
          }]);
        }
      }
    } catch (err) {
      console.error('[Chat] Erro ao enviar arquivo:', err);
      modal.error('Erro', 'Não foi possível enviar o arquivo.');
    } finally {
      setIsUploadingChat(false);
      if (fileInputChatRef.current) fileInputChatRef.current.value = '';
    }
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
          // CFM Art 10: Log de falha de conexão
          if (token && cid) {
            logEventoTecnico(token, {
              consultaId: Number(cid),
              tipo: 'FAIL_CONNECTION',
              observacao: 'Conexão ICE falhou (ICE Connection State Failed)'
            }).catch(() => {});
          }
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

        // CFM Art 10: Iniciar monitoramento de qualidade técnica periódico
        if (token && cid) {
          const statsInterval = setInterval(async () => {
            if (!sessionRef.current || sessionRef.current.pc.iceConnectionState !== 'connected') {
              clearInterval(statsInterval);
              return;
            }

            try {
              const stats = await sessionRef.current.pc.getStats();
              let inboundStats: any = {};
              stats.forEach(report => {
                if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.kind === 'audio')) {
                  inboundStats[report.kind] = {
                    packetsLost: report.packetsLost,
                    jitter: report.jitter,
                    bytesReceived: report.bytesReceived,
                    frameWidth: report.frameWidth,
                    frameHeight: report.frameHeight
                  };
                }
              });

              // Log de qualidade a cada 1 minuto ou se houver perda de pacotes significativa
              await logEventoTecnico(token, {
                consultaId: Number(cid),
                tipo: 'QUALITY_STATS',
                status_info: inboundStats,
                observacao: `Monitoramento periódico de qualidade (WebRTC)`
              });
            } catch (err) {
              console.warn('[Audit] Erro ao coletar stats:', err);
            }
          }, 60000); // 1 minuto
        }
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
        session.onChatMessage((data) => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'attachment') {
              setMessages((prev) => [...prev, { author: 'Paciente', attachment: parsed.attachment }]);
              return;
            }
          } catch { }
          setMessages((prev) => [...prev, { author: 'Paciente', text: data }]);
        });
        session.createChatChannel();
      } else {
        session.onChatMessage((data) => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'attachment') {
              setMessages((prev) => [...prev, { author: 'Médico', attachment: parsed.attachment }]);
              return;
            }
          } catch { }
          setMessages((prev) => [...prev, { author: 'Médico', text: data }]);
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
    // Validação de tempo mínimo (2 minutos)
    const elapsedMins = startTime ? (Date.now() - startTime) / 1000 / 60 : 0;
    if (elapsedMins < 2) {
      modal.error('Tempo insuficiente', 'O atendimento deve ter no mínimo 2 minutos de duração antes de ser encerrado.');
      return;
    }

    if (role === 'medico') {
      console.log('[Atendimento] Médico clicou em Desligar. Encerrando WebRTC e Transcrição...');
      
      // 1. Parar a Transcrição Automática e processar último chunk
      if (isRecordingRef.current && mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          isRecordingRef.current = false;
        } catch (e) {
          console.error('[AI] Erro ao parar gravador:', e);
        }
      }

      // 2. Encerrar Mídia e Conexão WebRTC (Manda o paciente para a avaliação)
      try {
        sessionRef.current?.sendDoctorDisconnecting();
        sessionRef.current?.end();
      } catch (err) {
        console.error('[Atendimento] Erro ao encerrar WebRTC:', err);
      }

      // Parar tracks de mídia local para desligar a luz da câmera/mic
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      setRemoteConnected(false);
      setRemoteDisconnected(true);

      // 3. Abrir modal de confirmação para o médico revisar os dados calmamente
      setConfirmationStep(1);
      setIsConfirmingEnd(true);
    } else {
      console.log('[Atendimento] Paciente clicou em Desligar. Encerrando mídia e WebRTC...');
      
      // 1. Encerrar Sessão WebRTC
      try {
        sessionRef.current?.end();
      } catch (err) {
        console.error('[Atendimento] Erro ao encerrar WebRTC (Paciente):', err);
      }

      // 2. Parar tracks de mídia local IMEDIATAMENTE (desliga a luz da câmera/mic)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`[Atendimento] Track stopped (Paciente): ${track.kind}`);
        });
        localStreamRef.current = null;
      }

      // 3. Prosseguir com o redirecionamento
      confirmFinishCall();
    }
  }

  async function confirmFinishCall() {
    // Permitir navegação sem disparar o aviso do navegador (beforeunload)
    bypassBeforeUnloadRef.current = true;

    const cid = getConsultaIdFromUrl() || consultaIdState || consultaId || '';

    // Se for médico, salvar dados AGORA (o WebRTC já foi encerrado no requestFinishCall)
    if (role === 'medico' && cid && token) {
      try {
        console.log('[Atendimento] Médico: iniciando salvamento final dos dados e encerramento administrativo...');

        // Salvar Prescrições
        const newPrescricoes = activePrescricoes.filter((p: any) => p.isNew);
        if (newPrescricoes.length > 0) {
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
          }
        }

        // Salvar Notas
        if (pacienteNotas) {
          await updatePacienteNotas(cid, token, pacienteNotas);
        }

        // Finalizar Consulta definitivamente no Banco de Dados
        const hora_fim = new Date().toTimeString().slice(0, 8);
        await endConsulta(cid, token, hora_fim, atendimentoData);

        // CFM Art 10: Log de encerramento normal
        logEventoTecnico(token, {
          consultaId: Number(cid),
          tipo: 'SESSION_END',
          observacao: 'Consulta finalizada administrativamente pelo médico após revisão'
        }).catch(() => {});

        // Limpar estados locais
        setSignedPdfFile(null);
      } catch (err) {
        console.error('[Atendimento] ERRO ao salvar dados:', err);
        modal.error(
          'Erro ao Salvar',
          'Houve um erro ao salvar os dados finais. Verifique sua conexão e tente novamente.'
        );
        bypassBeforeUnloadRef.current = false;
        return;
      }
    }

    // Limpeza final de sessão (WebRTC já parou)
    try { sessionStorage.removeItem('ps_room'); } catch { }
    try { sessionStorage.removeItem('consulta_reconnect'); } catch { }
    try { sessionStorage.removeItem(`startTime_${cid}`); } catch { }

    router.push(role === 'paciente' ? `/inicio?showRating=true&consultaId=${cid}` : '/consultas');
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
    
    let cleanText = content;

    // ✅ NOVO: Detectar e extrair JSON se existir (bug reportado de JSON explícito na triagem)
    if (content.trim().startsWith('{') || content.trim().includes('{"')) {
      try {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}') + 1;
        if (start !== -1 && end !== -1) {
          const jsonPart = content.substring(start, end);
          const parsed = JSON.parse(jsonPart);
          if (parsed.conteudo) {
            cleanText = parsed.conteudo;
          } else if (parsed.resumo) {
            cleanText = parsed.resumo;
          } else if (parsed.queixa_principal) {
            // Se for o objeto de triagem estruturado, reconstrói um resumo legível
            cleanText = `Queixa: ${parsed.queixa_principal}\nSintomas: ${parsed.descricao_sintomas || 'Não informados'}`;
          }
        }
      } catch (e) {
        // Fallback para o texto original se o parse falhar
      }
    }

    const lines = cleanText.split('\n');
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

  const [isSummarizing, setIsSummarizing] = useState(false);

  // Função para resumir a transcrição completa no final
  const handleSummarize = async () => {
    if (!atendimentoData.resumo_consulta || !token) {
      modal.warning('Aviso', 'Não há transcrição disponível para resumir.');
      return;
    }

    setIsSummarizing(true);
    try {
      const response = await fetch('/api/chat-ia/resumir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transcricao: atendimentoData.resumo_consulta })
      });

      if (!response.ok) throw new Error('Falha na API de resumo');

      const data = await response.json();
      if (data.ok && data.resumo) {
        setAtendimentoData(prev => ({ ...prev, resumo_consulta: data.resumo }));
        modal.success('Sucesso', 'Um resumo clínico foi gerado a partir da transcrição completa.');
      }
    } catch (err) {
      console.error('[AI] Erro ao gerar resumo final:', err);
      modal.error('Erro', 'Não foi possível gerar o resumo. Tente novamente.');
    } finally {
      setIsSummarizing(false);
    }
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

  /**
   * Abre o modal de arquivos do paciente e faz o fetch dos anexos da consulta atual.
   * Disponível apenas para o médico durante o atendimento.
   */
  async function handleOpenAnexos() {
    console.log('[Atendimento] Abrindo modal de anexos...');
    const curCid = getConsultaIdFromUrl() || consultaIdState || consultaId;
    if (!curCid || !token) {
      console.warn('[Atendimento] Consulta ID ou token ausente:', { curCid, hasToken: !!token });
      return;
    }

    setShowAnexosModal(true);
    setLoadingAnexos(true);
    try {
      const lista = await listAnexosConsulta(curCid, token);
      console.log('[Atendimento] Anexos buscados:', lista.length);
      setAnexos(lista);
    } catch (err) {
      console.error('[Atendimento] Erro ao buscar anexos:', err);
      setAnexos([]);
    } finally {
      setLoadingAnexos(false);
    }
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

  const handleOpenAnexo = async (file: any) => {
    if (!token || !file.id) return;
    try {
      await downloadAnexo(file.id, token, file.nome);
    } catch (err) {
      console.error('Erro ao baixar anexo:', err);
      modal.error('Erro', 'Não foi possível baixar o arquivo.');
    }
  };

  // Determine status color
  let statusColor = 'red';
  if (remoteConnected) {
    statusColor = 'green';
  } else if (localStreamRef.current && !remoteConnected) {
    statusColor = 'yellow';
  } else if (connecting) {
    statusColor = 'yellow';
  }

  // --- Estados para Transcrição Automática e Contínua ---
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false); // Ref para evitar stale closures no MediaRecorder
  const hasAutoStartedRef = useRef(false); // Ref para garantir que o auto-start só ocorra uma vez por sessão
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mixedStreamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const transcriptionBufferRef = useRef<string>(''); // Acumula texto transcrito

  const handleToggleTranscription = () => {
    if (isRecordingRef.current) {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
    } else {
      startAutomaticRecording();
    }
  };

  // Iniciar gravação automática quando a conexão é estabelecida e os streams estão prontos
  useEffect(() => {
    if (remoteConnected && remoteStream && localStreamRef.current && role === 'medico' && !isRecordingRef.current && !hasAutoStartedRef.current) {
      console.log('[AI] Conexão detectada e streams prontos. Iniciando transcrição automática...');
      hasAutoStartedRef.current = true;
      startAutomaticRecording();
    }
  }, [remoteConnected, remoteStream, role]);

  const startAutomaticRecording = async () => {
    if (!localStreamRef.current || !remoteStream) {
      console.warn('[AI] Streams não disponíveis para gravação.');
      return;
    }

    try {
      console.log('[AI] Configurando mixagem de áudio para transcrição...');
      // 1. Setup Audio Mixing (Médico + Paciente)
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      // Garantir que o contexto de áudio não esteja suspenso (política de autoplay)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      audioContextRef.current = audioContext;

      const dest = audioContext.createMediaStreamDestination();
      mixedStreamDestRef.current = dest;

      // Fonte Local (Médico) - Conectar sempre para garantir captura contínua
      if (localStreamRef.current) {
        console.log('[AI] Conectando áudio local (médico) ao mixer...');
        const localSource = audioContext.createMediaStreamSource(localStreamRef.current);
        localSource.connect(dest);
      }

      // Fonte Remota (Paciente) - Conectar sempre para garantir captura do áudio do paciente
      if (remoteStream) {
        console.log('[AI] Conectando áudio remoto (paciente) ao mixer...');
        const remoteSource = audioContext.createMediaStreamSource(remoteStream);
        remoteSource.connect(dest);
      }

      // 2. Setup MediaRecorder com detecção de tipo suportado
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/ogg;codecs=opus';

      console.log(`[AI] Iniciando MediaRecorder com mimeType: ${mimeType}`);
      const recorder = new MediaRecorder(dest.stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          processAudioChunk(audioBlob);
        }
        
        // Reinicia para o próximo bloco se ainda estivermos gravando
        if (isRecordingRef.current && remoteConnected) {
          audioChunksRef.current = [];
          if (recorder.state === 'inactive') {
            recorder.start();
          }
        }
      };

      // Inicia gravação
      recorder.start();
      setIsRecording(true);
      isRecordingRef.current = true;

      // Agendar "rotação" periódica a cada 10 segundos (mais frequente para evitar perda de dados e feedback mais rápido)
      const rotationInterval = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop(); // Dispara processamento e reinício no onstop
        } else if (!isRecordingRef.current) {
          clearInterval(rotationInterval);
        }
      }, 10 * 1000);

    } catch (err) {
      console.error('[AI] Erro ao configurar mixagem/gravação:', err);
    }
  };
          
  const processAudioChunk = async (blob: Blob) => {
    if (!token) return;
    
    try {
      console.log(`[AI] Processando bloco de áudio (${(blob.size / 1024).toFixed(1)} KB)...`);
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // ✅ CORREÇÃO: Usar o prefixo /api para passar pelo proxy do Next.js
        const response = await fetch('/api/chat-ia/transcrever', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            audio: base64Audio, 
            filename: `chunk_${Date.now()}.webm` 
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[AI] Erro na resposta da API:', errorData);
          return;
        }

        const data = await response.json();
        if (data.ok && data.transcricao) {
          console.log('[AI] Nova transcrição diarizada recebida.');
          // Atualiza a transcrição acumulada de forma incremental
          setAtendimentoData(prev => ({ 
            ...prev, 
            resumo_consulta: (prev.resumo_consulta ? prev.resumo_consulta + '\n' : '') + data.transcricao 
          }));
        }
      };
    } catch (err) {
      console.error('[AI] Erro ao enviar bloco de áudio para transcrição:', err);
    }
  };

  return (
    <div className="inicio-page">


      <main className="inicio-main atendimento-main">
        {/* LAYOUT PARA MÉDICO - 3 colunas com painéis */}
        {role === 'medico' ? (
          <div className="atendimento-container medico-layout">
            <ClinicalPanel
              openAccordions={openAccordions}
              toggleAccordion={toggleAccordion}
              consultaDetails={consultaDetails}
              loadingHistorico={loadingHistorico}
              historicoConsultas={historicoConsultas}
              onSetConsultaSelecionada={setConsultaSelecionada}
              loadingHistoricoPrescricoes={loadingHistoricoPrescricoes}
              historicoPrescricoes={historicoPrescricoes}
              onDownloadPrescricaoPdf={handleDownloadPrescricaoPdf}
              loadingPrescricoes={loadingPrescricoes}
              activePrescricoes={activePrescricoes}
              onDeletePrescricao={handleDeletePrescricao}
              prescricaoGerada={prescricaoGerada}
              setPrescricaoGerada={setPrescricaoGerada}
              showPrescricaoForm={showPrescricaoForm}
              setShowPrescricaoForm={setShowPrescricaoForm}
              prescricaoData={prescricaoData}
              setPrescricaoData={setPrescricaoData}
              medicamentoSugestoes={medicamentoSugestoes}
              showMedicamentoSugestoes={showMedicamentoSugestoes}
              setShowMedicamentoSugestoes={setShowMedicamentoSugestoes}
              onMedicamentoChange={handleMedicamentoChange}
              marcaSugestoes={marcaSugestoes}
              showMarcaSugestoes={showMarcaSugestoes}
              setShowMarcaSugestoes={setShowMarcaSugestoes}
              onMarcaChange={handleMarcaChange}
              onCancelPrescricaoForm={cancelPrescricaoForm}
              onSubmitPrescricao={handleSubmitPrescricao}
              isSubmittingPrescricao={isSubmittingPrescricao}
              onGenerateFinalPDF={handleGenerateFinalPDF}
              isGeneratingPDF={isGeneratingPDF}
              signedPdfFile={signedPdfFile}
              hiddenFileInputRef={hiddenFileInputRef}
              onSignedPdfUpload={handleSignedPdfUpload}
              isEditingNotas={isEditingNotas}
              setIsEditingNotas={setIsEditingNotas}
              pacienteNotas={pacienteNotas}
              setPacienteNotas={setPacienteNotas}
              onSaveNotas={handleSaveNotas}
              isSavingNotas={isSavingNotas}
            />
            <div className="medico-video-column">
              <AtendimentoVideoGrid
                remoteRef={remoteRef}
                localRef={localRef}
                remoteHasVideo={remoteHasVideo}
                remoteHasAudio={remoteHasAudio}
                connectionFailed={connectionFailed}
                reconnecting={reconnecting}
                remoteDisconnected={remoteDisconnected}
                remoteConnected={remoteConnected}
                showExitMessage={showExitMessage}
                statusText={statusText}
                statusColor={statusColor}
                camEnabled={camEnabled}
                micEnabled={micEnabled}
                elapsedSeconds={elapsedSeconds}
                formatElapsedTime={formatElapsedTime}
                onFinishCall={requestFinishCall}
                onGoBack={() => router.push('/consultas')}
                role="medico"
              />

              <AtendimentoToolbar
                camEnabled={camEnabled}
                micEnabled={micEnabled}
                showChat={showChat}
                unreadMessagesCount={unreadMessages}
                onToggleCam={toggleCam}
                onToggleMic={toggleMic}
                onToggleChat={() => setShowChat(prev => !prev)}
                onEndCall={requestFinishCall}
                onOpenPrescription={() => setShowPrescricaoForm(true)}
                onOpenTranscription={() => setShowTranscriptionModal(true)}
                onOpenAnexos={handleOpenAnexos}
                onToggleTranscription={handleToggleTranscription}
                isRecording={isRecording}
                isProcessingAudio={isProcessingAudio}
                role="medico"
              />
            </div>

            <AssistancePanel
              consultaDetails={consultaDetails}
              calculateAge={calculateAge}
              openAccordions={openAccordions}
              toggleAccordion={toggleAccordion}
              atendimentoData={atendimentoData}
              setAtendimentoData={setAtendimentoData}
              showValidation={showValidation}
              cidSearch={cidSearch}
              cidSugestoes={cidSugestoes}
              showCidSugestoes={showCidSugestoes}
              onDiagnosticoChange={handleDiagnosticoChange}
              setShowCidSugestoes={setShowCidSugestoes}
              onSelectCID={selectCID}
              onRemoveCID={removeCID}
              repousoOptions={repousoOptions}
              destinoFinalOptions={destinoFinalOptions}
              onOptionToggle={handleOptionToggle}
            />

            <AtendimentoChat
              messages={messages}
              draft={draft}
              isUploadingChat={isUploadingChat}
              onSendMessage={sendMessage}
              onDraftChange={setDraft}
              onFileUpload={handleChatFileUpload}
              fileInputRef={fileInputChatRef}
              chatEndRef={chatEndRef}
              showChat={showChat}
              onClose={() => setShowChat(false)}
              variant="modal"
            />
          </div>
        ) : (
          <div className={`atendimento-container paciente-layout ${!showChat ? 'full-width' : ''}`}>
            <AtendimentoVideoGrid
              remoteRef={remoteRef}
              localRef={localRef}
              remoteHasVideo={remoteHasVideo}
              remoteHasAudio={remoteHasAudio}
              connectionFailed={connectionFailed}
              reconnecting={reconnecting}
              remoteDisconnected={remoteDisconnected}
              remoteConnected={remoteConnected}
              showExitMessage={showExitMessage}
              statusText={statusText}
              statusColor={statusColor}
              camEnabled={camEnabled}
              micEnabled={micEnabled}
              elapsedSeconds={elapsedSeconds}
              formatElapsedTime={formatElapsedTime}
              onFinishCall={requestFinishCall}
              onGoBack={() => router.push('/consultas')}
              role="paciente"
              showChat={showChat}
              unreadMessagesCount={unreadMessages}
              onToggleCam={toggleCam}
              onToggleMic={toggleMic}
              onToggleChat={() => setShowChat(prev => !prev)}
            />

            <AtendimentoChat
              messages={messages}
              draft={draft}
              isUploadingChat={isUploadingChat}
              onSendMessage={sendMessage}
              onDraftChange={setDraft}
              onFileUpload={handleChatFileUpload}
              fileInputRef={fileInputChatRef}
              chatEndRef={chatEndRef}
              showChat={showChat}
              onClose={() => setShowChat(false)}
              variant="panel"
            />
          </div>
        )}

        <AtendimentoModals
          consultaSelecionada={consultaSelecionada}
          setConsultaSelecionada={setConsultaSelecionada}
          loadingAnexosHistory={loadingAnexosHistory}
          isConfirmingEnd={isConfirmingEnd}
          setIsConfirmingEnd={setIsConfirmingEnd}
          showTranscriptionModal={showTranscriptionModal}
          setShowTranscriptionModal={setShowTranscriptionModal}
          atendimentoData={atendimentoData}
          setAtendimentoData={setAtendimentoData}
          pacienteNotas={pacienteNotas}
          setPacienteNotas={setPacienteNotas}
          cidSearch={cidSearch}
          onDiagnosticoChange={handleDiagnosticoChange}
          showCidSugestoesModal={showCidSugestoesModal}
          setShowCidSugestoesModal={setShowCidSugestoesModal}
          cidSugestoes={cidSugestoes}
          onSelectCID={selectCID}
          onRemoveCID={removeCID}
          onConfirmFinishWithValidation={confirmFinishWithValidation}
          activePrescricoes={activePrescricoes}
          onDeletePrescricao={handleDeletePrescricao}
          repousoOptions={repousoOptions}
          destinoFinalOptions={destinoFinalOptions}
          showAnexosModal={showAnexosModal}
          setShowAnexosModal={setShowAnexosModal}
          loadingAnexos={loadingAnexos}
          anexos={anexos}
          onOpenAnexo={(url) => window.open(url, '_blank')}
          confirmationStep={confirmationStep}
          setConfirmationStep={setConfirmationStep}
          onSummarize={handleSummarize}
          isSummarizing={isSummarizing}
        />

        <PrescriptionPDFTemplate
          consultaDetails={consultaDetails}
          activePrescricoes={activePrescricoes}
        />

        <Modal
          isOpen={modal.isOpen}
          config={modal.config}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
        />
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
