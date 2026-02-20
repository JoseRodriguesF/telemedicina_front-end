"use client";

import '../../inicio/inicio.css';
import './pre-consulta.css';
import '@/components/layout/Header/header.css';
import '@/components/common/Inputs/input.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Button from '@/components/common/Buttons/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useRef, useEffect } from 'react';
import type { ChatIAResponse, ChatHistory, ChatMessage as ChatMsg } from '@/types/chat';


// Função simples para converter markdown básico em HTML seguro
function formatIaText(text: string): string {
  if (!text) return '';
  let html = text
    .replace(/^### (.*$)/gm, '<h3 style="color: var(--color-primary-600); font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; font-size: 1rem; text-transform: uppercase;">$1</h3>') // ### Cabeçalho
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // **negrito**
    .replace(/\n\n/g, '<br/><br/>') // parágrafos
    .replace(/\n/g, '<br/>') // quebras de linha
    .replace(/^- (.*)$/gm, '<li>$1</li>'); // tópicos

  // Se houver <li>, envolver todos em <ul>
  if (/<li>/.test(html)) {
    // Processar grupos de li para envolver em ul
    html = html.replace(/(<li>.*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);
  }

  // Limpar possíveis bolds excessivos dentro de headers já formatados
  html = html.replace(/<h3(.*?)><b>(.*?)<\/b><\/h3>/g, '<h3$1>$2</h3>');

  return html;
}

import { getToken, getUser } from '@/lib/auth';
import { psCreateRoom } from '@/lib/axios/consultas';
import { sendChatMessage } from '@/lib/axios/chat';

import { Modal } from '@/components/common/Modal/Modal';
import { useModal } from '@/components/common/Modal/useModal';
import { formatDate } from '@/lib/utils/dateFormatters';


function PreConsultaInner() {
  const router = useRouter();
  const modal = useModal();
  const searchParams = useSearchParams();
  const flow = searchParams.get('flow'); // 'agendamento' or null (PS)
  const dateStr = searchParams.get('date');
  const timeStr = searchParams.get('time');

  // Estados do chat (usando tipos importados de @/types/chat)
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  // Histórico para o backend
  const [history, setHistory] = useState<ChatHistory>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [iaTyping, setIaTyping] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [historiaClinicaId, setHistoriaClinicaId] = useState<number | undefined>(undefined);
  const historiaClinicaIdRef = useRef<number | undefined>(undefined);
  const [isTriageStarted, setIsTriageStarted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const messagesToHistory = (msgs: ChatMsg[]): ChatHistory => {
    return msgs
      .filter(m => m.author === 'Você' || m.author === 'Angélica')
      .map(m => ({
        role: m.author === 'Você' ? 'user' : 'assistant',
        content: m.text
      }));
  };

  // Only auto-scroll if we have messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, iaTyping]);

  async function sendMessage(textInput?: string, hidden: boolean = false) {
    if (hidden) {
      setIsTriageStarted(true);
      // Aguarda a animação de fadeOut antes de remover do DOM
      setTimeout(() => setShowWelcome(false), 500);
    }
    const t = (textInput || draft).trim();
    if (!t || isLoading || iaTyping) return;

    let currentMessages = messages;
    if (!hidden) {
      const userMsg: ChatMsg = { author: 'Você', text: t };
      setMessages(prev => [...prev, userMsg]);
      currentMessages = [...messages, userMsg];
    }

    setDraft('');

    const token = getToken();
    if (!token) {
      setMessages(prev => [...prev, { author: 'Sistema', text: 'Não autenticado. Faça login para usar a IA.' }]);
      return;
    }

    setIsLoading(true);
    setIaTyping(true);

    try {
      const currentHistory = messagesToHistory(currentMessages);
      const data = await sendChatMessage(
        { message: t, history: currentHistory },
        token
      );
      const answer = String(data?.answer ?? 'Sem resposta da IA.');
      let finalId = historiaClinicaIdRef.current;

      if (data.historiaClinicaId) {
        finalId = data.historiaClinicaId;
        historiaClinicaIdRef.current = data.historiaClinicaId;
        setHistoriaClinicaId(data.historiaClinicaId);
      }

      if (data?.completed === true) {
        // Triagem concluída — não exibir o relatório clínico no chat do paciente
        setMessages(prev => [...prev, { author: 'Angélica', text: 'Triagem concluída com sucesso! Estou encaminhando você para o atendimento...' }]);
        setHistory(prev => [
          ...prev,
          { role: 'user', content: t },
          { role: 'assistant', content: answer }
        ]);
        setCompleted(true);
        if (data.historiaClinicaSalva === false) {
          modal.warning(
            'Triagem concluída parcialmente',
            'Os dados da triagem não puderam ser salvos automaticamente, mas você pode prosseguir. O médico terá acesso ao que você informou no chat.',
            () => handleEnviar(finalId)
          );
          return;
        }
        handleEnviar(finalId);
      } else {
        setMessages(prev => [...prev, { author: 'Angélica', text: answer }]);
        setHistory(prev => [
          ...prev,
          { role: 'user', content: t },
          { role: 'assistant', content: answer }
        ]);
      }
    } catch (err: any) {
      const msg = String(err?.message ?? 'Erro desconhecido ao chamar a IA');
      setMessages(prev => [...prev, { author: 'Sistema', text: `Erro: ${msg}` }]);
    } finally {
      setIsLoading(false);
      setIaTyping(false);
    }
  }

  async function handleEnviar(forcedHistoriaId?: number) {
    const token = getToken();
    const user = getUser();
    if (user?.tipo_usuario !== 'paciente') {
      modal.error('Acesso Negado', 'Apenas pacientes podem iniciar consultas no pronto socorro. (forbidden_only_paciente_can_create_room)');
      return;
    }
    if (!token) {
      modal.warning('Login Expirado', 'Faça login novamente para continuar.');
      return;
    }

    const currentHistoriaId = forcedHistoriaId || historiaClinicaIdRef.current || historiaClinicaId;

    if (token) {
      if (flow === 'agendamento') {
        const queryParams = new URLSearchParams({
          date: dateStr || '',
          time: timeStr || ''
        });
        if (currentHistoriaId) {
          queryParams.append('historiaId', String(currentHistoriaId));
        }
        router.push(`/consultas/selecao-medico?${queryParams.toString()}`);
        return;
      }

      try {
        const { roomId, consultaId, iceServers } = await psCreateRoom(token, {
          historiaClinicaId: currentHistoriaId
        });
        sessionStorage.setItem('ps_room', JSON.stringify({ roomId, consultaId, iceServers }));
        router.push(`/consultas/aguardando?id=${encodeURIComponent(consultaId)}`);
      } catch (err: any) {
        const msg = String(err?.message || 'Não foi possível criar sua consulta. Tente novamente.');
        if (msg.includes('forbidden_only_paciente_can_create_room')) {
          modal.error('Acesso Negado', 'Apenas pacientes podem criar consulta no pronto socorro.');
        } else if (msg.includes('paciente_record_not_found_for_usuario')) {
          modal.error('Cadastro Incompleto', 'Seu usuário não está vinculado a um cadastro de Paciente. Complete o cadastro para continuar.');
        } else {
          modal.error('Erro', msg);
        }
      }
    }
  }

  // Scroll automático do chat
  useEffect(() => {
    const el = messagesEndRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ✅ Limpar histórico ao sair da tela (desmontar componente)
  useEffect(() => {
    return () => {
      setHistory([]);
      setMessages([]);
    };
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <div className={`inicio-page ${isTriageStarted ? 'triage-mode' : ''}`}>
      <Sidebar
        activeId="consultas"
        className={isTriageStarted ? 'sidebar-hidden' : ''}
      />
      <main className="inicio-main" style={{ padding: 0 }}>

        <div className="pc-page-container">
          <div className="pc-centered-layout">

            {/* Content Only - Centered */}
            <div className="pc-content-side">
              {showWelcome && (
                /* Welcome State */
                <div className={`pc-welcome-container ${isTriageStarted ? 'fade-out' : ''}`}>
                  <div className="pc-welcome-text">
                    <h1>
                      {flow === 'agendamento'
                        ? `Tudo pronto para sua consulta no dia ${formatDate(dateStr || '')}!`
                        : 'Bem-vindo(a)! Eu sou a Angélica, sua assistente de saúde IA.'}
                      <br />
                      {flow === 'agendamento'
                        ? 'Vamos realizar sua triagem prévia para agilizar o atendimento.'
                        : 'Estou aqui para realizar sua triagem inicial.'}
                    </h1>
                    <p>
                      {flow === 'agendamento'
                        ? `Para que seu médico possa te atender com toda a atenção necessária na data marcada, gostaria de conhecer melhor seu quadro clínico atual.`
                        : 'Vamos conversar sobre seus sintomas, dores ou preocupações para que eu possa encaminhá-lo para o especialista correto.'}
                    </p>
                    <button
                      className="pc-start-btn"
                      onClick={() => sendMessage('oi', true)}
                      disabled={isLoading || iaTyping}
                    >
                      {isLoading ? 'Iniciando...' : 'Iniciar triagem'}
                    </button>
                  </div>
                </div>
              )}

              {isTriageStarted && (
                /* Chat Active State */
                <div className="pc-chat-history-container">
                  <div className="pc-chat-messages">
                    {messages.map((m, i) => (
                      <div key={i} className={`pc-message-row ${m.author === 'Você' ? 'user' : 'assistant'}`}>
                        <div className="pc-message-bubble">
                          {m.author === 'Angélica' ? (
                            <span dangerouslySetInnerHTML={{ __html: formatIaText(m.text) }} />
                          ) : (
                            m.text
                          )}
                        </div>
                      </div>
                    ))}
                    {iaTyping && (
                      <div className="pc-message-row assistant">
                        <div className="pc-message-bubble">
                          <span className="typing-dots">...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}

              {/* Input Area (Shared) */}
              {isTriageStarted && (
                <div className="pc-input-wrapper">
                  <div className="pc-input-container">
                    <input
                      className="pc-input-field"
                      placeholder="Compartilhe o que está sentindo agora..."
                      value={draft}
                      autoComplete="off"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isLoading && !iaTyping) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <button
                      className="pc-send-btn"
                      onClick={() => sendMessage()}
                      disabled={isLoading || iaTyping || !draft.trim()}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>

      </main>
      <Modal
        isOpen={modal.isOpen}
        config={modal.config}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
      />
    </div>
  );
}

export default function PreConsultaPage() {
  return (
    <Suspense fallback={<div className="pc-loading">Carregando pré-consulta...</div>}>
      <PreConsultaInner />
    </Suspense>
  );
}