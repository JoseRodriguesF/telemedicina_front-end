import React from 'react';

interface VideoGridProps {
  remoteRef: React.RefObject<HTMLVideoElement | null>;
  localRef: React.RefObject<HTMLVideoElement | null>;
  remoteHasVideo: boolean;
  remoteHasAudio: boolean;
  connectionFailed: boolean;
  reconnecting: boolean;
  remoteDisconnected: boolean;
  remoteConnected: boolean;
  showExitMessage: boolean;
  statusText: string | null;
  statusColor: string;
  camEnabled: boolean;
  micEnabled: boolean;
  elapsedSeconds: number;
  formatElapsedTime: (seconds: number) => string;
  onFinishCall: () => void;
  onGoBack: () => void;
  role: 'medico' | 'paciente';
  // Informações para conformidade CFM Art. 4
  medicoInfo?: {
    nome?: string;
    crm?: string;
  };
  pacienteInfo?: {
    nome?: string;
  };
  // Props extras para o paciente - controles integrados ao vídeo
  showChat?: boolean;
  unreadMessagesCount?: number;
  onToggleCam?: () => void;
  onToggleMic?: () => void;
  onToggleChat?: () => void;
}

const AtendimentoVideoGrid: React.FC<VideoGridProps> = ({
  remoteRef,
  localRef,
  remoteHasVideo,
  remoteHasAudio,
  connectionFailed,
  reconnecting,
  remoteDisconnected,
  remoteConnected,
  showExitMessage,
  statusText,
  statusColor,
  camEnabled,
  micEnabled,
  elapsedSeconds,
  formatElapsedTime,
  onFinishCall,
  onGoBack,
  role,
  medicoInfo,
  pacienteInfo,
  showChat,
  unreadMessagesCount = 0,
  onToggleCam,
  onToggleMic,
  onToggleChat,
}) => {
  return (
    <section className="call-area">
      <div className="call-header">
        <div className="header-status">
          <span className={`status-dot ${statusColor}`} aria-label={`Status: ${statusColor}`}></span>
          <span className="timer-text">{remoteConnected ? formatElapsedTime(elapsedSeconds) : (statusText || 'Conectando...')}</span>
        </div>
        
        {/* CONFORMIDADE CFM: Identificação do profissional para o paciente */}
        {role === 'paciente' && medicoInfo?.nome && (
          <div className="professional-id-badge">
            <span className="prof-name">{medicoInfo.nome}</span>
            {medicoInfo.crm && <span className="prof-crm">CRM: {medicoInfo.crm}</span>}
          </div>
        )}

        {/* Identificação do paciente para o médico */}
        {role === 'medico' && pacienteInfo?.nome && (
          <div className="professional-id-badge patient">
            <span className="prof-name">Paciente: {pacienteInfo.nome}</span>
          </div>
        )}
      </div>

      <div className="call-screen">
        <video
          ref={remoteRef}
          className="remote-video large"
          playsInline
          autoPlay
          aria-label={role === 'medico' ? "Vídeo do paciente" : "Vídeo do médico"}
          style={{
            opacity: remoteHasVideo && !connectionFailed ? 1 : 0,
            filter: (connectionFailed || !remoteHasVideo) ? 'blur(12px)' : undefined,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        <div className="call-status-layer">
          {connectionFailed ? (
            <div className="call-status-content internet-error">
              <div className="overlay-icon">
                <img src="/icons/no-connection.png" alt="Sem conexão" />
              </div>
              <div className="overlay-content">
                <h3>Conexão Perdida</h3>
                <p>{reconnecting ? 'Tentando restabelecer sinal...' : 'Verifique sua conexão com a internet.'}</p>
              </div>
            </div>
          ) : remoteDisconnected ? (
            <div className="call-status-content peer-disconnected">
              <div className="overlay-icon">🔌</div>
              <div className="overlay-content">
                <h3>Usuário desconectado</h3>
                <p>{showExitMessage ? 'A consulta foi encerrada pelo outro participante.' : 'O sinal do outro participante caiu. Aguardando volta...'}</p>
                {showExitMessage && (
                  <button className="btn btn-primary" onClick={onGoBack} style={{ marginTop: '1.5rem', background: 'var(--color-primary-600)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', border: 'none' }}>
                    Voltar para Consultas
                  </button>
                )}
              </div>
            </div>
          ) : !remoteConnected ? (
            <div className="call-status-content waiting">
              <div className="call-spinner"></div>
              <div className="overlay-content">
                <h3>Aguardando {role === 'medico' ? 'Paciente' : 'Médico'}</h3>
                <p>A entrada pode levar alguns segundos...</p>
              </div>
            </div>
          ) : (
            <>
              {!remoteHasVideo && (
                <div className="call-status-content no-video">
                <div className="overlay-icon-small">
                  <img src="/icons/camera-icon.png" alt="Câmera" />
                </div>
                  <div className="overlay-content">
                    <p>O {role === 'medico' ? 'paciente' : 'médico'} desligou a câmera</p>
                  </div>
                </div>
              )}
              <div className="status-alerts-container">
                {!remoteHasAudio && (
                  <div className="remote-mic-alert">
                    <span>🔇</span>
                    <span>{role === 'medico' ? 'Paciente' : 'Médico'} em silêncio</span>
                  </div>
                )}
                {!micEnabled && (
                  <div className="remote-mic-alert local">
                    <span>🔇</span>
                    <span>Seu microfone está desligado</span>
                  </div>
                )}
                {!camEnabled && (
                  <div className="remote-mic-alert local cam">
                    <img src="/icons/camera-icon.png" alt="Câmera" className="alert-icon-img" />
                    <span>Sua câmera está desligada</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="self-video-container pip">
          <video
            ref={localRef}
            className="self-video"
            playsInline
            autoPlay
            muted
            aria-label="Sua câmera"
            style={{ opacity: camEnabled ? 1 : 0 }}
          />
          {!camEnabled && (
            <div className="no-camera-placeholder pip-placeholder">
              <div className="overlay-icon-small">
                <img src="/icons/camera-icon.png" alt="Câmera" />
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#94a3b8' }}>Você está sem vídeo</div>
            </div>
          )}
        </div>

        {/* Controles do Paciente — sobrepostos ao vídeo */}
        {role === 'paciente' && (
          <div className="call-controls">
            <button
              className={`control-btn ${!camEnabled ? 'off' : ''}`}
              onClick={onToggleCam}
              aria-label={camEnabled ? 'Desativar câmera' : 'Ativar câmera'}
            >
              {camEnabled ? (
                <svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
              ) : (
                <svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
              )}
            </button>
            <button
              className={`control-btn ${!micEnabled ? 'off' : ''}`}
              onClick={onToggleMic}
              aria-label={micEnabled ? 'Desativar microfone' : 'Ativar microfone'}
            >
              {micEnabled ? (
                <svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
              ) : (
                <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><path d="M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
              )}
            </button>
            <button
              className={`control-btn ${showChat ? 'active' : ''}`}
              aria-label={showChat ? "Fechar chat" : "Abrir chat"}
              onClick={onToggleChat}
            >
              <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              {unreadMessagesCount > 0 && !showChat && <span className="chat-notification-badge"></span>}
            </button>
            <button className="control-btn end" aria-label="Encerrar chamada" onClick={onFinishCall}>
              <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default AtendimentoVideoGrid;
