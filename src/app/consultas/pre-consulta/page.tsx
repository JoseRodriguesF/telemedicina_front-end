"use client";

import '../../inicio/inicio.css';
import './pre-consulta.css';
import '@/components/layout/Header/header.css';
import '@/components/common/Inputs/input.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Button from '@/components/common/Buttons/Button';
import { useRouter } from 'next/navigation';
import { Suspense, useState, useRef, useEffect } from 'react';

// Função simples para converter markdown básico em HTML seguro
function formatIaText(text: string): string {
  if (!text) return '';
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // **negrito**
    .replace(/\n\n/g, '<br/><br/>') // parágrafos
    .replace(/\n/g, '<br/>') // quebras de linha
    .replace(/^- (.*)$/gm, '<li>$1</li>'); // tópicos
  // Se houver <li>, envolver todos em <ul> (sem regex dotAll)
  if (/<li>/.test(html)) {
    // Junta todos <li> em um <ul>
    const lis = html.match(/<li>.*?<\/li>/g);
    if (lis) {
      html = html.replace(/(<li>.*?<\/li>)/g, '');
      html += '<ul>' + lis.join('') + '</ul>';
    }
  }
  return html;
}

import { getToken, getUser } from '@/lib/auth';
import { psCreateRoom } from '@/lib/axios/consultas';

// Tipo para o histórico que será enviado ao backend
type ChatHistory = Array<{ role: 'user' | 'assistant'; content: string }>;

function PreConsultaInner() {
  const router = useRouter();
  // Chat temporário para pré-consulta — substitui o formulário
  type ChatMessage = { author: 'Você' | 'Assistente' | 'Sistema' | 'Angélica'; text: string };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // ✅ NOVO: Histórico no formato que o backend espera
  const [history, setHistory] = useState<ChatHistory>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [iaTyping, setIaTyping] = useState(false);
  const [completed, setCompleted] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  // ✅ Função auxiliar para converter messages para history
  const messagesToHistory = (msgs: ChatMessage[]): ChatHistory => {
    return msgs
      .filter(m => m.author === 'Você' || m.author === 'Angélica' || m.author === 'Assistente')
      .map(m => ({
        role: m.author === 'Você' ? 'user' : 'assistant',
        content: m.text
      }));
  };

  // Mensagem inicial do bot (Angélica)
  useEffect(() => {
    if (messages.length === 0) {
      (async () => {
        const token = getToken();
        if (!token) return;
        setIsLoading(true);
        setIaTyping(true);
        try {
          // ✅ Enviar com history vazio (primeira mensagem)
          const res = await fetch('/api/chat-ia', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              message: 'oi',
              history: [] // ✅ Histórico vazio na primeira mensagem
            })
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || 'Erro ao contactar a IA');
          }
          const data = await res.json();
          const answer = String(data?.answer ?? 'Olá!');
          setMessages([{ author: 'Angélica', text: answer }]);
          // ✅ Atualizar histórico após primeira resposta
          setHistory([
            { role: 'user', content: 'oi' },
            { role: 'assistant', content: answer }
          ]);
        } catch (err: any) {
          setMessages([{ author: 'Angélica', text: 'Olá! (mensagem padrão)' }]);
        } finally {
          setIsLoading(false);
          setIaTyping(false);
        }
      })();
    }
  }, []);

  async function sendMessage() {
    const t = draft.trim();
    if (!t || isLoading || iaTyping) return;

    setMessages(prev => [...prev, { author: 'Você', text: t }]);
    setDraft('');

    const token = getToken();
    if (!token) {
      setMessages(prev => [...prev, { author: 'Sistema', text: 'Não autenticado. Faça login para usar a IA.' }]);
      return;
    }

    setIsLoading(true);
    setIaTyping(true);

    try {
      const currentHistory = messagesToHistory(messages);
      const res = await fetch('/api/chat-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: t,
          history: currentHistory
        })
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Erro ao contactar a IA');
      }

      const data = await res.json();
      const answer = String(data?.answer ?? 'Sem resposta da IA.');
      setMessages(prev => [...prev, { author: 'Assistente', text: answer }]);
      setHistory(prev => [
        ...prev,
        { role: 'user', content: t },
        { role: 'assistant', content: answer }
      ]);

      if (data?.completed === true) {
        setCompleted(true);
      }
    } catch (err: any) {
      const msg = String(err?.message ?? 'Erro desconhecido ao chamar a IA');
      setMessages(prev => [...prev, { author: 'Sistema', text: `Erro: ${msg}` }]);
    } finally {
      setIsLoading(false);
      setIaTyping(false);
    }
  }

  async function handleEnviar() {
    const token = getToken();
    const user = getUser();
    if (user?.tipo_usuario !== 'paciente') {
      alert('Apenas pacientes podem iniciar consultas no pronto socorro. (forbidden_only_paciente_can_create_room)');
      return;
    }
    if (!token) {
      alert('Faça login novamente para continuar.');
      return;
    }
    try {
      const { roomId, consultaId, iceServers } = await psCreateRoom(token);
      sessionStorage.setItem('ps_room', JSON.stringify({ roomId, consultaId, iceServers }));
      router.push(`/consultas/atendimento?id=${encodeURIComponent(consultaId)}`);
    } catch (err: any) {
      const msg = String(err?.message || 'Não foi possível criar sua consulta. Tente novamente.');
      if (msg.includes('forbidden_only_paciente_can_create_room')) {
        alert('Apenas pacientes podem criar consulta no pronto socorro.');
      } else if (msg.includes('paciente_record_not_found_for_usuario')) {
        alert('Seu usuário não está vinculado a um cadastro de Paciente. Complete o cadastro para continuar.');
      } else {
        alert(msg);
      }
    }
  }

  // Scroll automático do chat
  useEffect(() => {
    const el = chatBodyRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Navegação automática ao completed
  useEffect(() => {
    if (completed) {
      handleEnviar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed]);

  // ✅ Limpar histórico ao sair da tela (desmontar componente)
  useEffect(() => {
    return () => {
      setHistory([]);
      setMessages([]);
    };
  }, []);

  return (
    <div className="inicio-page">
      <Sidebar activeId="consultas" />
      <main className="inicio-main">
        <div className="center-card">
          <div className="pc-card">
            <div className="pc-card-header">
              <h2 className="pc-title">Pré-consulta — Chat</h2>
              <div className="pc-action">
                {!completed && (
                  <Button variant="primary" onClick={handleEnviar}>Concluir</Button>
                )}
              </div>
            </div>
            <div className="pc-chat">
              <div className="pc-chat-body" ref={chatBodyRef}>
                {messages.map((m, i) => {
                  let roleClass = 'assistant';
                  if (m.author === 'Você') roleClass = 'you';
                  if (m.author === 'Angélica') roleClass = 'assistant';
                  return (
                    <div key={i} className={`pc-chat-message ${roleClass}`}>
                      <div className="pc-chat-author">{m.author}</div>
                      <div className="pc-chat-bubble">
                        {m.author === 'Assistente' || m.author === 'Angélica' ? (
                          <span dangerouslySetInnerHTML={{ __html: formatIaText(m.text) }} />
                        ) : (
                          m.text
                        )}
                      </div>
                    </div>
                  );
                })}
                {iaTyping && (
                  <div className="pc-chat-message assistant">
                    <div className="pc-chat-author">Angélica</div>
                    <div className="pc-chat-bubble"><span>...</span></div>
                  </div>
                )}
              </div>
              <div className="pc-chat-input" style={{ display: 'flex', width: '100%' }}>
                <input
                  className="c-input"
                  placeholder="Digite aqui e pressione Enter para enviar"
                  value={draft}
                  autoComplete="off"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading && !iaTyping) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={isLoading || iaTyping}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="pc-send-btn"
                  onClick={sendMessage}
                  disabled={isLoading || iaTyping || !draft.trim()}
                  style={{ marginLeft: 8, padding: '0 16px', borderRadius: 8, background: '#2563EB', color: '#fff', border: 'none', fontWeight: 700, cursor: (isLoading || iaTyping || !draft.trim()) ? 'not-allowed' : 'pointer' }}
                >Enviar</button>
              </div>
            </div>
          </div>
        </div>
      </main>
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