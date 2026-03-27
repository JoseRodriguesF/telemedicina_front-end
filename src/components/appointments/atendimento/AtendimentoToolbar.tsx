import React from 'react';

interface ToolbarProps {
  camEnabled: boolean;
  micEnabled: boolean;
  showChat: boolean;
  unreadMessagesCount: number;
  onToggleCam: () => void;
  onToggleMic: () => void;
  onToggleChat: () => void;
  onEndCall: () => void;
  onOpenPrescription?: () => void;
  onOpenHistory?: () => void;
  onOpenAnexos?: () => void;
  role: 'medico' | 'paciente';
}

const AtendimentoToolbar: React.FC<ToolbarProps> = ({
  camEnabled,
  micEnabled,
  showChat,
  unreadMessagesCount,
  onToggleCam,
  onToggleMic,
  onToggleChat,
  onEndCall,
  onOpenPrescription,
  onOpenHistory,
  onOpenAnexos,
  role
}) => {
  return (
    <div className={`medico-actions-toolbar ${role === 'paciente' ? 'patient' : ''}`}>
      <div className="call-controls">
        <button className={`control-btn ${!camEnabled ? 'off' : ''}`} onClick={onToggleCam} aria-label={camEnabled ? 'Desativar câmera' : 'Ativar câmera'}>
          {camEnabled ? (
            <svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
          )}
        </button>
        <button className={`control-btn ${!micEnabled ? 'off' : ''}`} onClick={onToggleMic} aria-label={micEnabled ? 'Desativar microfone' : 'Ativar microfone'}>
          {micEnabled ? (
            <svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><path d="M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
          )}
        </button>
        <button className={`control-btn ${showChat ? 'active' : ''}`} aria-label={showChat ? "Fechar chat" : "Abrir chat"} onClick={onToggleChat}>
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          {unreadMessagesCount > 0 && !showChat && <span className="chat-notification-badge"></span>}
        </button>
        <button className="control-btn end" aria-label="Encerrar chamada" onClick={onEndCall}>
          <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
        </button>
      </div>

      {role === 'medico' && (
        <div className="video-action-buttons">
          <button className="action-btn" onClick={onOpenPrescription}>Prescrição</button>
          <button className="action-btn" onClick={onOpenHistory}>Antecedentes</button>
          <button className="action-btn" onClick={onOpenAnexos}>Arquivos</button>
        </div>
      )}
    </div>
  );
};

export default AtendimentoToolbar;
