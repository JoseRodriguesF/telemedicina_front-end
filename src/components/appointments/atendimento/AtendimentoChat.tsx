import React, { useState, useRef, useEffect } from 'react';
import Button from '@/components/common/Buttons/Button';

interface ChatMessage {
  author: 'Você' | 'Médico' | 'Paciente';
  text?: string;
  attachment?: { id?: number; nome?: string; tipo_mime?: string; url?: string }
}

interface ChatProps {
  messages: ChatMessage[];
  draft: string;
  isUploadingChat: boolean;
  onSendMessage: () => void;
  onDraftChange: (text: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  showChat: boolean;
  onClose?: () => void;
  variant: 'modal' | 'panel';
  unreadMessages?: number;
}

const AtendimentoChat: React.FC<ChatProps> = ({
  messages,
  draft,
  isUploadingChat,
  onSendMessage,
  onDraftChange,
  onFileUpload,
  fileInputRef,
  chatEndRef,
  showChat,
  onClose,
  variant
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const modalPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (showChat && variant === 'modal') {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Default position: bottom-right corner
      setPosition({ x: Math.max(20, w - 400), y: Math.max(20, h - 600) });
      modalPos.current = { x: Math.max(20, w - 400), y: Math.max(20, h - 600) };
    }
  }, [showChat, variant]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      setPosition({ x: modalPos.current.x + dx, y: modalPos.current.y + dy });
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      modalPos.current = {
        x: modalPos.current.x + (e.clientX - dragStartPos.current.x),
        y: modalPos.current.y + (e.clientY - dragStartPos.current.y)
      };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  if (!showChat && variant === 'modal') return null;

  const ChatContent = (
    <div className={`chat-inner ${variant}`} style={variant === 'modal' ? { height: '100%', display: 'flex', flexDirection: 'column' } : undefined}>
      <div 
        className="chat-header" 
        onMouseDown={variant === 'modal' ? handleMouseDown : undefined}
        style={variant === 'modal' ? { cursor: 'move', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', userSelect: 'none' } : undefined}
      >
        <span style={{ fontWeight: 600 }}>Chat da Consulta</span>
        {variant === 'modal' && (
          <button className="chat-close-btn" onClick={onClose} aria-label="Fechar chat" style={{ cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
      <div className="chat-body">
        {messages.map((m, idx) => {
          let cls = 'chat-msg';
          if (m.author === 'Você') cls += ' me';
          else if (m.author === 'Médico') cls += ' doctor';
          else cls += ' patient';

          return (
            <div key={idx} className={cls}>
              <div className="chat-author">{m.author}</div>
              <div className="chat-bubble">
                {m.text && <div>{m.text}</div>}
                {m.attachment && (
                  <div className="chat-attachment-card">
                    <div className="attachment-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                      <span>{m.attachment.nome}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => window.open(m.attachment?.url, '_blank')}
                    >
                      Abrir
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-input-wrapper">
        {isUploadingChat && <div className="chat-upload-loading">Subindo arquivo...</div>}
        <div className="chat-input">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={onFileUpload}
          />
          <button 
            className="chat-attach-btn" 
            onClick={() => fileInputRef.current?.click()}
            title="Anexar arquivo"
            disabled={isUploadingChat}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input
            className="c-input"
            placeholder="Digite..."
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSendMessage(); }}
            disabled={isUploadingChat}
          />
          <Button variant="primary" onClick={onSendMessage} aria-label="Enviar" disabled={isUploadingChat}>➤</Button>
        </div>
      </div>
    </div>
  );

  if (variant === 'modal') {
    return (
      <div 
        className="chat-floating-modal" 
        style={{
          position: 'fixed',
          top: `${position.y}px`,
          left: `${position.x}px`,
          width: '380px',
          height: '550px',
          background: 'var(--bg-primary)',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          border: '1px solid var(--border-color)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {ChatContent}
      </div>
    );
  }

  return (
    <aside className="chat-panel" aria-label="Chat da consulta">
      {ChatContent}
    </aside>
  );
};

export default AtendimentoChat;
