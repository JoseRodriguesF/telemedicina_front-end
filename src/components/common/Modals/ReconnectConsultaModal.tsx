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
    <div className="rc-overlay">
      <div className="rc-modal" role="dialog" aria-modal="true">
        <div className="rc-header">
          <div className="rc-icon-pulse">
            <div className="rc-inner-dot" />
          </div>
          <h3 className="rc-title">Consulta em Andamento</h3>
        </div>

        <div className="rc-body">
          <p>Detectamos que você possui uma sessão ativa. Deseja retornar ao atendimento agora?</p>

          <div className="rc-info-row">
            <span className="rc-info-label">ID da Sessão:</span>
            <span className="rc-info-value">{consultaId ? String(consultaId).slice(0, 8) : '...'}</span>
          </div>

          <div className="rc-info-row">
            <span className="rc-info-label">Perfil de Acesso:</span>
            <span className="rc-info-value">{role === 'medico' ? 'Médico' : 'Paciente'}</span>
          </div>
        </div>

        <div className="rc-actions">
          <Button variant="ghost" onClick={onClose}>Continuar no Início</Button>
          <Button variant="primary" onClick={onReconnect}>Reconectar Agora</Button>
        </div>
      </div>

      <style jsx>{`
        .rc-overlay {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(15, 23, 42, 0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease-out;
        }

        .rc-modal {
          background: #fff;
          border-radius: 16px;
          width: 90%;
          max-width: 420px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .rc-header {
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
          background: #fff;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .rc-icon-pulse {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          background: #e0f2fe;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .rc-inner-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #0ea5e9;
          animation: rc-pulse 2s infinite;
        }

        @keyframes rc-pulse {
          0% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(14, 165, 233, 0); }
          100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); }
        }

        .rc-title {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
        }

        .rc-body {
          padding: 24px;
          color: #334155;
          font-size: 1rem;
          line-height: 1.5;
        }

        .rc-body p {
          margin-bottom: 20px;
          color: #64748b;
        }

        .rc-info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f8fafc;
        }

        .rc-info-label {
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .rc-info-value {
          color: #1e293b;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .rc-actions {
          padding: 16px 24px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
      `}</style>
    </div>
  );
};

export default ReconnectConsultaModal;
