'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import axios from '@/lib/axios/config';
import { gsap } from 'gsap';
import FormattedText from '@/components/common/FormattedText';
import './ai-assistant.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'medico_ai_chat_history';
const OPEN_STATE_KEY = 'medico_ai_chat_open';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMedico, setIsMedico] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      const vh = window.visualViewport?.height || window.innerHeight;
      const kh = window.innerHeight - vh;
      setKeyboardHeight(Math.max(0, kh));
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // 1. Carregar estado inicial
  useEffect(() => {
    const user = getUser();
    if (user?.tipo_usuario === 'medico') {
      setIsMedico(true);
      
      // Carregar histórico do sessionStorage (limpa ao fechar aba/relogar)
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {
          setMessages([{ role: 'assistant', content: 'Olá, Doutor(a)! Como posso te ajudar hoje?' }]);
        }
      } else {
        setMessages([{ role: 'assistant', content: 'Olá, Doutor(a)! Como posso te ajudar hoje?' }]);
      }

      // Carregar estado de abertura
      const savedOpen = sessionStorage.getItem(OPEN_STATE_KEY);
      if (savedOpen === 'true') {
        setIsOpen(true);
      }
    }
  }, []);

  // 2. Salvar histórico sempre que mudar
  useEffect(() => {
    if (isMedico && messages.length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, isMedico]);

  // 3. Salvar estado de abertura
  useEffect(() => {
    if (isMedico) {
      sessionStorage.setItem(OPEN_STATE_KEY, isOpen.toString());
    }
  }, [isOpen, isMedico]);

  const handleClearChat = () => {
    const initialMessage: Message[] = [{ role: 'assistant', content: 'Olá, Doutor(a)! Como posso te ajudar hoje?' }];
    setMessages(initialMessage);
    setShowSuggestions(true);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(initialMessage));
  };

  const SUGGESTIONS = [
    { id: 'prescrever', text: 'Como prescrever receitas?', icon: '✍️' },
    { id: 'exames', text: 'Como solicitar exames?', icon: '🧪' },
    { id: 'anexos', text: 'Onde vejo os anexos?', icon: '📁' },
    { id: 'encerrar', text: 'Como encerrar atendimento?', icon: '🏁' }
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    // Opcional: enviar automaticamente
    // setTimeout(() => handleSend(suggestion), 100);
  };

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

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = textToSend.trim();
    setInput('');
    setShowSuggestions(false);
    
    const newMessages = [...messages, { role: 'user', content: userMessage } as Message];
    setMessages(newMessages);
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
        history: messages.slice(-15), // Aumentei para 15 para melhor memória
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

  const handleClose = () => {
    setIsOpen(false);
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
        <div 
          ref={containerRef} 
          className="ai-chat-container"
          style={keyboardHeight > 0 ? {
            bottom: `${keyboardHeight + 20}px`,
            transition: 'bottom 0.1s ease-out'
          } : {}}
        >
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
              <button 
                className="btn-clear-chat" 
                onClick={handleClearChat} 
                title="Limpar conversa"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  marginRight: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                LIMPAR
              </button>
              <button onClick={handleClose}>
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
                  <FormattedText text={m.content} />
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

            {showSuggestions && messages.length <= 1 && (
              <div className="ai-suggestions">
                <p className="suggestions-title">Sugestões para esta consulta:</p>
                <div className="suggestions-grid">
                  {SUGGESTIONS.map(s => (
                    <button 
                      key={s.id} 
                      className="suggestion-card"
                      onClick={() => handleSuggestionClick(s.text)}
                    >
                      <span className="suggestion-icon">{s.icon}</span>
                      <span className="suggestion-text">{s.text}</span>
                    </button>
                  ))}
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
              onClick={() => handleSend()}
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
