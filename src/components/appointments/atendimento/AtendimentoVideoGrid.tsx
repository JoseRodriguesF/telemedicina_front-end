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
  role
}) => {
  return (
    <section className="call-area">
      <div className="call-header">
        <span className={`status-dot ${statusColor}`} aria-label={`Status: ${statusColor}`}></span>
        {remoteConnected ? `Tempo de consulta: ${formatElapsedTime(elapsedSeconds)}` : (statusText || 'Em consulta')}
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
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />

        <div className="call-status-layer">
          {connectionFailed ? (
            <div className="call-status-content internet-error">
              <div className="overlay-icon">🌐</div>
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
                  <div className="overlay-icon-small">📷</div>
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
                    <span>📷</span>
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
              <div className="overlay-icon-small">📷</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#94a3b8' }}>Você está sem vídeo</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AtendimentoVideoGrid;
