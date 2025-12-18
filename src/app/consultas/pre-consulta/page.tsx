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

function PreConsultaInner() {
  const router = useRouter();
  // Chat temporário para pré-consulta — substitui o formulário
  type ChatMessage = { author: 'Você' | 'Assistente' | 'Sistema' | 'Angélica'; text: string };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
    // Mensagem inicial do bot (Angélica)
    useEffect(() => {
      if (messages.length === 0) {
        (async () => {
          const token = getToken();
          if (!token) return;
          setIsLoading(true);
          try {
            const res = await fetch('/api/chat-ia', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ message: 'oi' })
            });
            if (!res.ok) {
              const txt = await res.text();
              throw new Error(txt || 'Erro ao contactar a IA');
            }
            const data = await res.json();
            const answer = String(data?.answer ?? 'Olá!');
            setMessages([{ author: 'Angélica', text: answer }]);
          } catch (err: any) {
            setMessages([{ author: 'Angélica', text: 'Olá! (mensagem padrão)' }]);
          } finally {
            setIsLoading(false);
          }
        })();
      }
    }, []);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  async function sendMessage() {
    const t = draft.trim();
    if (!t) return;
    setMessages(prev => [...prev, { author: 'Você', text: t }]);
    setDraft('');
    const token = getToken();
    if (!token) {
      setMessages(prev => [...prev, { author: 'Sistema', text: 'Não autenticado. Faça login para usar a IA.' }]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: t })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Erro ao contactar a IA');
      }
      const data = await res.json();
      const answer = String(data?.answer ?? 'Sem resposta da IA.');
      setMessages(prev => [...prev, { author: 'Assistente', text: answer }]);
    } catch (err: any) {
      const msg = String(err?.message ?? 'Erro desconhecido ao chamar a IA');
      setMessages(prev => [...prev, { author: 'Sistema', text: `Erro: ${msg}` }]);
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    const el = chatBodyRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="inicio-page">
      <Sidebar activeId="consultas" />
      <main className="inicio-main">
        <div className="center-card">
          <div className="pc-card">
            <div className="pc-card-header">
              <h2 className="pc-title">Pré-consulta — Chat</h2>
              <div className="pc-action">
                <Button variant="primary" onClick={handleEnviar}>Concluir</Button>
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
              </div>
              <div className="pc-chat-input">
                <input
                  className="c-input"
                  placeholder="Digite aqui e pressione Enter para enviar"
                  value={draft}
                  autoComplete="off"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
                />
                {isLoading && <div className="pc-chat-loading">Enviando...</div>}
                {/* action moved to header as 'Concluir' */}
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
