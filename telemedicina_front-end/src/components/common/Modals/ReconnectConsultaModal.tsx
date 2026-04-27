import React from 'react';
import './ReconnectConsultaModal.css';
import Button from '../Buttons/Button';

interface ReconnectConsultaModalProps {
  open: boolean;
  onClose: () => void;
  onReconnect: () => void;
  consultaId: string;
  role: string;
}

const ReconnectConsultaModal: React.FC<ReconnectConsultaModalProps> = ({ open, onClose, onReconnect, consultaId, role }) => {
  if (!open) return null;

  return (
    <div className="rc-overlay">
      <div className="rc-modal" role="dialog" aria-modal="true">
        <div className="rc-header">
          <div className="rc-icon-pulse">
            <div className="rc-inner-dot" />
          </div>
          <h3 className="rc-title">Sessão em Andamento</h3>
          <p className="rc-subtitle">Detectamos que você possui uma consulta ativa.</p>
        </div>

        <div className="rc-body">
          <div className="rc-info-card">
            <div className="rc-info-row">
              <span className="rc-info-label">ID da Sessão</span>
              <span className="rc-info-value">{consultaId ? String(consultaId).slice(0, 8) : '...'}</span>
            </div>

            <div className="rc-info-row">
              <span className="rc-info-label">Perfil de Acesso</span>
              <span className="rc-info-value">{role === 'medico' ? 'Médico' : 'Paciente'}</span>
            </div>
          </div>
        </div>

        <div className="rc-actions">
          <Button variant="ghost" onClick={onClose}>Agora não</Button>
          <Button variant="primary" onClick={onReconnect}>Reconectar agora</Button>
        </div>
      </div>
    </div>
  );
};

export default ReconnectConsultaModal;
