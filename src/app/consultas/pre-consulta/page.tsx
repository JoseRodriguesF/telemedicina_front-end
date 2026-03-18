"use client";

import '../../inicio/inicio.css';
import './pre-consulta.css';
import '@/components/layout/Header/header.css';
import '@/components/common/Inputs/input.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useRef, useEffect } from 'react';
import type { ChatIAResponse, ChatHistory, ChatMessage as ChatMsg } from '@/types/chat';

// Função simples para converter markdown básico em HTML seguro
function formatIaText(text: string): string {
  if (!text) return '';
  let html = text
    .replace(/^### (.*$)/gm, '<h3 style="color: var(--color-primary-600); font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; font-size: 1rem; text-transform: uppercase;">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
    .replace(/^- (.*)$/gm, '<li>$1</li>');

  if (/<li>/.test(html)) {
    html = html.replace(/(<li>.*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);
  }

  html = html.replace(/<h3(.*?)><b>(.*?)<\/b><\/h3>/g, '<h3$1>$2</h3>');
  return html;
}

import { getToken, getUser } from '@/lib/auth';
import { psCreateRoom } from '@/lib/axios/consultas';
import { sendChatMessage, confirmTriagem } from '@/lib/axios/chat';

import { Modal } from '@/components/common/Modal/Modal';
import { useModal } from '@/components/common/Modal/useModal';
import { formatDate } from '@/lib/utils/dateFormatters';

type TriagemDados = NonNullable<ChatIAResponse['dadosEstruturados']>;

function PreConsultaInner() {
  const router = useRouter();
  const modal = useModal();
  const searchParams = useSearchParams();
  const flow = searchParams.get('flow'); // 'agendamento' or null (PS)
  const dateStr = searchParams.get('date');
  const timeStr = searchParams.get('time');

  // Estados do chat
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [history, setHistory] = useState<ChatHistory>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [iaTyping, setIaTyping] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isTriageStarted, setIsTriageStarted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Estados para o relatório de confirmação
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [dadosTriagem, setDadosTriagem] = useState<TriagemDados | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const historiaClinicaIdRef = useRef<number | undefined>(undefined);

  const messagesToHistory = (msgs: ChatMsg[]): ChatHistory => {
    return msgs
      .filter(m => m.author === 'Você' || m.author === 'Angélica')
      .map(m => ({
        role: m.author === 'Você' ? 'user' : 'assistant',
        content: m.text
      }));
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, iaTyping]);

  async function sendMessage(textInput?: string, hidden: boolean = false) {
    if (hidden) {
      setIsTriageStarted(true);
      setTimeout(() => setShowWelcome(false), 500);
    }
    const t = (textInput || draft).trim();
    if (!t || isLoading || iaTyping) return;

    let currentMessages = messages;
    if (!hidden) {
      const userMsg: ChatMsg = { author: 'Você', text: t };
      setMessages(prev => [...prev, userMsg]);
      currentMessages = [...messages, { author: 'Você', text: t }];
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

      if (data?.completed === true && data.aguardandoConfirmacao && data.dadosEstruturados) {
        // Triagem concluída - mostrar mensagem e exibir relatório
        setMessages(prev => [...prev, {
          author: 'Angélica',
          text: 'Triagem concluída! Revise suas informações abaixo antes de prosseguir.'
        }]);
        setHistory(prev => [
          ...prev,
          { role: 'user', content: t },
          { role: 'assistant', content: answer }
        ]);
        setCompleted(true);
        setDadosTriagem(data.dadosEstruturados);
        // Pequeno delay para mostrar a mensagem antes do relatório
        setTimeout(() => setShowRelatorio(true), 600);

      } else if (data?.completed === true) {
        // Fallback: IA completou mas pode ter havido erro no JSON estruturado ou flag faltando
        setMessages(prev => [...prev, {
          author: 'Angélica',
          text: 'Entendido! Sua triagem foi processada. Clique no botão abaixo para revisar e prosseguir.'
        }]);
        setHistory(prev => [
          ...prev,
          { role: 'user', content: t },
          { role: 'assistant', content: answer }
        ]);
        setCompleted(true);
        // Se tiver dados, mostra o relatório. Se não, permite prosseguir via botão
        if (data.dadosEstruturados) {
          setDadosTriagem(data.dadosEstruturados);
          setTimeout(() => setShowRelatorio(true), 1000);
        } else {
          // Caso raro de erro total no JSON
          setMessages(prev => [...prev, {
            author: 'Angélica',
            text: 'Tive um pequeno problema ao estruturar seus dados, mas não se preocupe, o médico poderá ver nossa conversa. Pode prosseguir!'
          }]);
        }
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

  async function handleConfirmarTriagem() {
    const token = getToken();
    if (!token || !dadosTriagem) return;

    setIsConfirming(true);
    try {
      const result = await confirmTriagem(dadosTriagem, token);
      if (result.historiaClinicaId) {
        historiaClinicaIdRef.current = result.historiaClinicaId;
      }
      setShowRelatorio(false);
      handleEnviar(result.historiaClinicaId);
    } catch (err: any) {
      // Mesmo que falhe ao salvar, permite prosseguir
      modal.warning(
        'Triagem concluída parcialmente',
        'Os dados da triagem não puderam ser salvos automaticamente, mas você pode prosseguir.',
        () => {
          setShowRelatorio(false);
          handleEnviar(undefined);
        }
      );
    } finally {
      setIsConfirming(false);
    }
  }

  function handleEditarTriagem() {
    // Volta ao chat para o paciente adicionar/editar informações
    setShowRelatorio(false);
    setCompleted(false);
    setMessages(prev => [
      ...prev,
      { author: 'Angélica', text: 'Claro! O que você gostaria de adicionar ou corrigir nas suas informações?' }
    ]);
    // Foca no input
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.pc-input-field');
      input?.focus();
    }, 100);
  }

  async function handleEnviar(forcedHistoriaId?: number) {
    const token = getToken();
    const user = getUser();
    if (user?.tipo_usuario !== 'paciente') {
      modal.error('Acesso Negado', 'Apenas pacientes podem iniciar consultas no pronto socorro.');
      return;
    }
    if (!token) {
      modal.warning('Login Expirado', 'Faça login novamente para continuar.');
      return;
    }

    const currentHistoriaId = forcedHistoriaId || historiaClinicaIdRef.current;

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

  // Limpar ao desmontar
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
            <div className="pc-content-side">
              {showWelcome && (
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

              {isTriageStarted && !showRelatorio && (
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

                    {completed && !showRelatorio && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', animation: 'fadeIn 0.5s ease' }}>
                        <button
                          className="pc-relatorio-btn-iniciar"
                          onClick={() => handleEnviar(undefined)}
                          style={{ padding: '0.75rem 2rem' }}
                        >
                          Prosseguir para o atendimento
                        </button>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}

              {/* Relatório de Confirmação */}
              {showRelatorio && dadosTriagem && (
                <div className="pc-relatorio-container">
                  <div className="pc-relatorio-header">
                    <div className="pc-relatorio-icon">✅</div>
                    <h2>Triagem Concluída!</h2>
                    <p>Revise as informações coletadas antes de prosseguir para o atendimento.</p>
                  </div>

                  <div className="pc-relatorio-card">
                    {dadosTriagem.queixa_principal && (
                      <div className="pc-relatorio-section">
                        <h3>📋 Motivo da Consulta</h3>
                        <p>{dadosTriagem.queixa_principal}</p>
                      </div>
                    )}

                    {dadosTriagem.descricao_sintomas && (
                      <div className="pc-relatorio-section">
                        <h3>🩺 Descrição dos Sintomas</h3>
                        <p>{dadosTriagem.descricao_sintomas}</p>
                      </div>
                    )}

                    {dadosTriagem.historico_pessoal && (
                      <div className="pc-relatorio-section">
                        <h3>📁 Histórico Médico Pessoal</h3>
                        {dadosTriagem.historico_pessoal.doencas && dadosTriagem.historico_pessoal.doencas.length > 0 && (
                          <div className="pc-relatorio-item">
                            <span className="pc-relatorio-label">Doenças crônicas:</span>
                            <span>{dadosTriagem.historico_pessoal.doencas.join(', ')}</span>
                          </div>
                        )}
                        {dadosTriagem.historico_pessoal.medicamentos && dadosTriagem.historico_pessoal.medicamentos.length > 0 && (
                          <div className="pc-relatorio-item">
                            <span className="pc-relatorio-label">Medicamentos em uso:</span>
                            <span>{dadosTriagem.historico_pessoal.medicamentos.join(', ')}</span>
                          </div>
                        )}
                        {dadosTriagem.historico_pessoal.alergias && dadosTriagem.historico_pessoal.alergias.length > 0 && (
                          <div className="pc-relatorio-item">
                            <span className="pc-relatorio-label alerta">⚠️ Alergias:</span>
                            <span className="txt-alerta">{dadosTriagem.historico_pessoal.alergias.join(', ')}</span>
                          </div>
                        )}
                        {(!dadosTriagem.historico_pessoal.doencas?.length && !dadosTriagem.historico_pessoal.medicamentos?.length && !dadosTriagem.historico_pessoal.alergias?.length) && (
                          <p className="pc-relatorio-vazio">Nenhuma informação registrada.</p>
                        )}
                      </div>
                    )}

                    {dadosTriagem.antecedentes_familiares && Object.keys(dadosTriagem.antecedentes_familiares).length > 0 && (
                      <div className="pc-relatorio-section">
                        <h3>👨‍👩‍👧 Antecedentes Familiares</h3>
                        {Object.entries(dadosTriagem.antecedentes_familiares).map(([familiar, doenca]) => (
                          <div key={familiar} className="pc-relatorio-item">
                            <span className="pc-relatorio-label">{familiar}:</span>
                            <span>{doenca}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {dadosTriagem.estilo_vida && Object.keys(dadosTriagem.estilo_vida).length > 0 && (
                      <div className="pc-relatorio-section">
                        <h3>🏃 Estilo de Vida</h3>
                        {Object.entries(dadosTriagem.estilo_vida).map(([key, valor]) => (
                          <div key={key} className="pc-relatorio-item">
                            <span className="pc-relatorio-label">{key}:</span>
                            <span>{valor}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {dadosTriagem.vacinacao && dadosTriagem.vacinacao.trim() && !dadosTriagem.vacinacao.toLowerCase().includes('não coletado') && (
                      <div className="pc-relatorio-section">
                        <h3>💉 Vacinação</h3>
                        <p>{dadosTriagem.vacinacao}</p>
                      </div>
                    )}
                  </div>

                  <div className="pc-relatorio-disclaimer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    As informações acima serão compartilhadas com o médico durante o atendimento.
                  </div>

                  <div className="pc-relatorio-actions">
                    <button
                      className="pc-relatorio-btn-editar"
                      onClick={handleEditarTriagem}
                      disabled={isConfirming}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Editar informações
                    </button>
                    <button
                      className="pc-relatorio-btn-iniciar"
                      onClick={handleConfirmarTriagem}
                      disabled={isConfirming}
                    >
                      {isConfirming ? (
                        <>
                          <span className="pc-btn-spinner" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                          </svg>
                          Iniciar atendimento
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Input Area — mostrar somente durante o chat (não no relatório) */}
              {isTriageStarted && !showRelatorio && (
                <div className="pc-input-wrapper">
                  <div className="pc-input-container">
                    <input
                      className="pc-input-field"
                      placeholder="Compartilhe o que está sentindo agora..."
                      value={draft}
                      autoComplete="off"
                      disabled={completed}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isLoading && !iaTyping && !completed) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <button
                      className="pc-send-btn"
                      onClick={() => sendMessage()}
                      disabled={isLoading || iaTyping || !draft.trim() || completed}
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