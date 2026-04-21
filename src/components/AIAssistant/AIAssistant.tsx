'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import axios from '@/lib/axios/config';
import { gsap } from 'gsap';
import './ai-assistant.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá, Doutor(a)! Sou seu assistente digital. Como posso te ajudar hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMedico, setIsMedico] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = getUser();
    if (user?.tipo_usuario === 'medico') {
      setIsMedico(true);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      gsap.fromTo(containerRef.current, 
        { opacity: 0, y: 50, scale: 0.9 }, 
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const token = getToken();
      let context = {};
      if (window.location.pathname.includes('/consultas/atendimento/')) {
        const parts = window.location.pathname.split('/');
        const consultaId = parts[parts.length - 1];
        context = { consultaId, page: 'atendimento' };
      }

      const response = await axios.post('/api/chat-ia/assistente-medico', {
        message: userMessage,
        history: messages.slice(-10),
        context
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (error) {
      console.error('Erro no assistente:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, tive um problema técnico. Pode tentar novamente?' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isMedico) return null;

  return (
    <div className="ai-assistant-wrapper">
      {!isOpen ? (
        <button 
          className="ai-bubble-trigger animate-float"
          onClick={() => setIsOpen(true)}
          title="Assistente Digital"
        >
          <Bot size={28} />
          <span className="pulse-ring"></span>
        </button>
      ) : (
        <div ref={containerRef} className="ai-chat-container">
          <header className="ai-chat-header">
            <div className="ai-brand">
              <div className="ai-icon-mini">
                <Sparkles size={16} />
              </div>
              <div className="ai-title">
                <h3>Assistente Digital</h3>
                <span className="status-online">Online</span>
              </div>
            </div>
            <div className="ai-actions">
              <button onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="ai-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`ai-message ${m.role}`}>
                <div className="message-avatar">
                  {m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="message-bubble">
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="ai-message assistant">
                <div className="message-avatar">
                  <Bot size={16} />
                </div>
                <div className="message-bubble loading-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </div>

          <footer className="ai-chat-input">
            <input 
              type="text" 
              placeholder="Pergunte algo..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              className={`btn-send ${!input.trim() || loading ? 'disabled' : ''}`}
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              <Send size={18} />
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
