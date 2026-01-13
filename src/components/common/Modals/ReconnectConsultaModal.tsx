import React from 'react';
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
    <div className="modal-overlay">
      <div className="modal-content animate-pop-in">
        <div className="modal-header">
          <div className="pulse-icon">
            <div className="inner-pulse" />
          </div>
          <h2>Consulta em Andamento</h2>
        </div>

        <div className="modal-body">
          <p>Detectamos que você possui uma sessão ativa. Deseja retornar ao atendimento agora?</p>

          <div className="info-badge">
            <span className="info-label">ID da Sessão:</span>
            <span className="info-value">{consultaId ? String(consultaId).slice(0, 8) : '...'}</span>
          </div>

          <div className="info-badge">
            <span className="info-label">Perfil de Acesso:</span>
            <span className="info-value">{role === 'medico' ? 'Médico' : 'Paciente'}</span>
          </div>
        </div>

        <div className="modal-actions">
          <Button variant="primary" onClick={onReconnect} className="btn-reconnect">
            Reconectar Agora
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Continuar no Início
          </Button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: #ffffff;
          border-radius: 20px;
          padding: 40px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          text-align: center;
        }

        .animate-pop-in {
          animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes popIn {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .modal-header {
          margin-bottom: 24px;
        }

        .pulse-icon {
          width: 64px;
          height: 64px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 50%;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .inner-pulse {
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }

        h2 {
          color: #1e293b;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .modal-body {
          margin-bottom: 32px;
        }

        p {
          color: #64748b;
          font-size: 1rem;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .info-badge {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .info-label {
          color: #94a3b8;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .info-value {
          color: #334155;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .modal-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        :global(.btn-reconnect) {
          height: 48px !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
          width: 100% !important;
        }
      `}</style>
    </div>
  );
};

export default ReconnectConsultaModal;
