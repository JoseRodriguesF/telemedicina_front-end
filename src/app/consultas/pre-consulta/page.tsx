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
import { psCreateRoom, enviarAnexosConsulta } from '@/lib/axios/consultas';
import { sendChatMessage, confirmTriagem } from '@/lib/axios/chat';
import axios from 'axios';

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
  const [isNavigating, setIsNavigating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Estados para o relatório de confirmação
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [dadosTriagem, setDadosTriagem] = useState<TriagemDados | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [anexos, setAnexos] = useState<Array<{ data: string; nome: string; tipo_mime: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const historiaClinicaIdRef = useRef<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const user = getUser();
    if (user) setPatientData(user);
  }, []);

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
      // ✅ CORREÇÃO: Pegamos o histórico SEM a mensagem atual, pois ela é enviada no campo 'message'
      const currentHistory = messagesToHistory(messages);
      const data = await sendChatMessage(
        { message: t, history: currentHistory },
        token
      );
      
      let answer = String(data?.answer ?? 'Sem resposta da IA.');

      // ✅ MELHORIA: Função robusta para limpar qualquer resquício de JSON ou Markdown JSON da resposta
      const cleanJsonFromText = (text: string): string => {
        let cleaned = text.trim();
        // Remove blocos de código markdown json
        if (cleaned.includes('```json')) {
          cleaned = cleaned.split('```json')[1].split('```')[0].trim();
        } else if (cleaned.includes('```')) {
          cleaned = cleaned.split('```')[1].split('```')[0].trim();
        }
        
        // Se ainda parecer um objeto JSON, tenta extrair apenas o campo de texto
        if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
          try {
            const parsed = JSON.parse(cleaned);
            return parsed.answer || parsed.message || parsed.text || parsed.content || "Entendi. Pode continuar.";
          } catch (e) {
            // Se falhar o parse, remove chaves e tenta limpar manualmente
            return cleaned.replace(/\{"?[^"]+"?:\s*"/g, '').replace(/"\s*\}$/g, '').trim();
          }
        }
        return cleaned;
      };

      answer = cleanJsonFromText(answer);

      if (data?.completed === true) {
        // Triagem concluída
        setMessages(prev => [...prev, {
          author: 'Angélica',
          text: 'Triagem concluída! Por favor, revise o resumo das suas informações abaixo.'
        }]);
        
        setHistory(prev => [
          ...prev,
          { role: 'user', content: t },
          { role: 'assistant', content: answer }
        ]);
        setCompleted(true);

        // ✅ ALINHAMENTO: Organizar dados para evitar redundância
        const dadosRetornados = data.dadosEstruturados || {};
        
        // Se a IA não gerou um resumo amigável no campo 'conteudo', nós construímos um básico
        // para evitar que o campo fique vazio ou com JSON
        if (!dadosRetornados.conteudo || dadosRetornados.conteudo.trim().startsWith('{')) {
          let constructedContent = '';
          if (dadosRetornados.queixa_principal) constructedContent += `### QUEIXA PRINCIPAL\n${dadosRetornados.queixa_principal}\n\n`;
          if (dadosRetornados.descricao_sintomas) constructedContent += `### SINTOMAS\n${dadosRetornados.descricao_sintomas}\n\n`;
          
          if (dadosRetornados.historico_pessoal) {
            const hp = dadosRetornados.historico_pessoal;
            if (hp.doencas?.length || hp.medicamentos?.length || hp.alergias?.length) {
              constructedContent += `### HISTÓRICO MÉDICO\n`;
              if (hp.doencas?.length) constructedContent += `- Doenças: ${hp.doencas.join(', ')}\n`;
              if (hp.medicamentos?.length) constructedContent += `- Medicamentos: ${hp.medicamentos.join(', ')}\n`;
              if (hp.alergias?.length) constructedContent += `- **ALERGIAS**: ${hp.alergias.join(', ')}\n`;
            }
          }
          
          dadosRetornados.conteudo = constructedContent || answer;
        }

        setDadosTriagem(dadosRetornados);
        setTimeout(() => setShowRelatorio(true), 600);
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
      setIsNavigating(true);
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const token = getToken();
    if (!token) return;

    setIsUploading(true);
    try {
      const newAnexos = [...anexos];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Limite de segurança: 5MB por arquivo no banco (ajustável)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          modal.warning("Arquivo muito grande", `O arquivo "${file.name}" excede o limite de 5MB.`);
          continue;
        }

        // Ler arquivo como Base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });

        newAnexos.push({
          data: base64,
          nome: file.name,
          tipo_mime: file.type
        } as any);
      }
      
      setAnexos(newAnexos);
    } catch (err) {
      console.error("Erro ao processar arquivos:", err);
      modal.error("Erro", "Não foi possível processar os arquivos. Tente novamente.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeAnexo(index: number) {
    setAnexos(prev => prev.filter((_, i) => i !== index));
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

    // ─── Fluxo de Agendamento ───────────────────────────────────────────
    if (flow === 'agendamento') {
      const queryParams = new URLSearchParams({
        date: dateStr || '',
        time: timeStr || ''
      });
      if (currentHistoriaId) {
        queryParams.append('historiaId', String(currentHistoriaId));
      }

      // Salvar anexos temporariamente para serem enviados após a criação da consulta agendada
      if (anexos.length > 0) {
        sessionStorage.setItem('pending_anexos', JSON.stringify(anexos));
      }

      router.push(`/consultas/selecao-medico?${queryParams.toString()}`);
      return;
    }

    // ─── Fluxo de Pronto Atendimento (PS) ──────────────────────────────
    // Cria a sala na fila PS e redireciona para a tela de espera.
    // Um médico em /consultas/pacientes verá a solicitação e fará o claim.
    setIsNavigating(true);
    try {
      const room = await psCreateRoom(token, {
        historiaClinicaId: currentHistoriaId
      });

      // Enviar anexos pendentes vinculados à nova consulta PS
      if (anexos.length > 0 && room.consultaId) {
        try {
          await enviarAnexosConsulta(room.consultaId, token, anexos);
        } catch (e) {
          console.error('[PA] Erro ao enviar anexos:', e);
        }
      }

      router.push(`/consultas/aguardando?id=${room.consultaId}`);
    } catch (err: any) {
      setIsNavigating(false);
      const msg = err?.response?.data?.error || err?.message || 'Erro desconhecido';
      if (msg?.toLowerCase().includes('cadastro') || msg?.toLowerCase().includes('paciente')) {
        modal.error('Cadastro Incompleto', 'Seu usuário não está vinculado a um cadastro de Paciente. Complete o cadastro para continuar.');
      } else {
        modal.error('Erro ao entrar na fila', msg);
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
            <div className={`pc-content-side${showRelatorio ? ' pc-content-side--relatorio' : ''}`}>
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
                      onClick={() => sendMessage('Olá. Meus dados já estão confirmados, pode iniciar a triagem diretamente.', true)}
                      disabled={isLoading || iaTyping}
                    >
                      {isLoading ? 'Iniciando...' : 'Iniciar triagem'}
                    </button>
                  </div>
                </div>
              )}

              {isTriageStarted && !showRelatorio && !isNavigating && (
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

              {/* Relatório de Confirmação */}
              {showRelatorio && dadosTriagem && !isNavigating && (
                <div className="pc-relatorio-container">
                  <div className="pc-relatorio-header">
                    <div className="pc-relatorio-icon">✅</div>
                    <h2>Triagem Concluída!</h2>
                    <p>Revise as informações coletadas antes de prosseguir para o atendimento.</p>
                  </div>

                  <div className="pc-relatorio-card">
                    {patientData && (
                      <div className="pc-relatorio-section">
                        <h3>👤 Meus Dados</h3>
                        <div className="pc-relatorio-item">
                          <span className="pc-relatorio-label">Nome:</span>
                          <span>{patientData.nome_completo || patientData.nome || '-'}</span>
                        </div>
                      </div>
                    )}
                    
                    {dadosTriagem?.queixa_principal && (
                      <div className="pc-relatorio-section">
                        <h3>📋 Motivo da Consulta</h3>
                        <p>{dadosTriagem.queixa_principal}</p>
                      </div>
                    )}

                    {dadosTriagem?.descricao_sintomas && (
                      <div className="pc-relatorio-section">
                        <h3>🩺 Descrição dos Sintomas</h3>
                        <p>{dadosTriagem.descricao_sintomas}</p>
                      </div>
                    )}

                    {dadosTriagem?.historico_pessoal && (
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
                    {dadosTriagem?.antecedentes_familiares && Object.keys(dadosTriagem.antecedentes_familiares).length > 0 && (
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

                    {dadosTriagem?.estilo_vida && Object.keys(dadosTriagem.estilo_vida).length > 0 && (
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

                    {dadosTriagem?.vacinacao && dadosTriagem.vacinacao.trim() && !dadosTriagem.vacinacao.toLowerCase().includes('não coletado') && (
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

                  <div className="pc-anexos-container" style={{
                    marginTop: '1.5rem',
                    marginBottom: '1rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            Anexar arquivos (Opcional)
                          </h3>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Você pode incluir fotos, laudos ou receitas anteriores</p>
                        </div>
                        <button 
                          className="pc-add-file-btn"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          style={{
                            background: anexos.length > 0 ? 'var(--bg-secondary)' : 'var(--color-primary-600)',
                            color: anexos.length > 0 ? 'var(--text-primary)' : 'white',
                            border: anexos.length > 0 ? '1px solid var(--border-color)' : 'none',
                            padding: '0.6rem 1.25rem',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {isUploading ? (
                             <>
                               <span className="pc-btn-spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: anexos.length > 0 ? 'var(--color-primary-600)' : 'white' }} />
                               Carregando...
                             </>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                              {anexos.length > 0 ? 'Adicionar mais' : 'Anexar arquivo'}
                            </>
                          )}
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          style={{ display: 'none' }} 
                          multiple 
                          onChange={handleFileUpload}
                        />
                      </div>

                      {anexos.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
                          {anexos.map((file, idx) => (
                            <div key={idx} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              background: 'var(--bg-secondary)',
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                <div style={{ 
                                  color: 'var(--color-primary-600)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                                </div>
                                <span style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                  {file.nome}
                                </span>
                              </div>
                              <button 
                                onClick={() => removeAnexo(idx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-tertiary)',
                                  cursor: 'pointer',
                                  padding: '0.25rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.2s'
                                }}
                                title="Remover"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

              {/* Input Area — mostrar somente durante o chat (não no relatório ou transição) */}
              {isTriageStarted && !showRelatorio && !isNavigating && (
                <div className="pc-input-wrapper">
                  <div className="pc-input-container">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleFileUpload}
                    />

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