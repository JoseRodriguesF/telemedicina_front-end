"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import Button from '@/components/common/Buttons/Button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type ChatMessage = { author: 'Você' | 'Médico'; text: string };

export default function AtendimentoPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { author: 'Você', text: 'Olá' },
    { author: 'Médico', text: 'Olá, como se sente?' },
  ]);
  const [draft, setDraft] = useState('');

  function sendMessage() {
    const t = draft.trim();
    if (!t) return;
    setMessages([...messages, { author: 'Você', text: t }]);
    setDraft('');
  }

  return (
    <div className="atendimento-page">
      <main className="atendimento-main">
        <section className="call-area">
          <div className="call-header">Você está em uma consulta com: (nome do médico)</div>
          <div className="call-screen">
            <div className="call-wait">Você será atendido em alguns minutos</div>
            <div className="self-video" aria-label="Sua câmera" />
          </div>
          <div className="call-controls">
            <button className="control-btn" aria-label="Abrir chat">💬</button>
            <button className="control-btn" aria-label="Compartilhar tela">🖥️</button>
            <button className="control-btn" aria-label="Microfone">🎤</button>
            <button className="control-btn end" aria-label="Encerrar chamada" onClick={() => router.push('/consultas')}>📞</button>
          </div>
        </section>

        <aside className="chat-panel" aria-label="Chat da consulta">
          <div className="chat-header">Chat da consulta</div>
          <div className="chat-body">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-msg ${m.author === 'Você' ? 'me' : 'doctor'}`}>
                <div className="chat-author">{m.author}</div>
                <div className="chat-bubble">{m.text}</div>
              </div>
            ))}
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
      </main>
    </div>
  );
}
