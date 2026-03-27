import React from 'react';
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
  if (!showChat && variant === 'modal') return null;

  const ChatContent = (
    <div className={`chat-inner ${variant}`}>
      <div className="chat-header">
        <span>Chat da consulta</span>
        {variant === 'modal' && (
          <button className="chat-close-btn" onClick={onClose} aria-label="Fechar chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="chat-modal-overlay" onClick={onClose}>
        <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
          {ChatContent}
        </div>
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
