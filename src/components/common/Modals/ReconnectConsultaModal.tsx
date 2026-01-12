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
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="modal-content">
        <h2>Consulta em andamento</h2>
        <p>Você possui uma consulta ativa que não foi finalizada.</p>
        <p>
          Consulta: <b>{consultaId}</b><br />
          Perfil: <b>{role === 'medico' ? 'Médico' : 'Paciente'}</b>
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Button variant="primary" onClick={onReconnect}>Reconectar</Button>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          background: #fff;
          border-radius: 12px;
          padding: 32px 24px;
          min-width: 320px;
          max-width: 90vw;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default ReconnectConsultaModal;
