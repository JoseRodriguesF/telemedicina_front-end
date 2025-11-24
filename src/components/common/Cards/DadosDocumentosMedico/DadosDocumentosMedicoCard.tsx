'use client';

import './DadosDocumentosMedicoCard.css';
import Button from '@/components/common/Buttons/Button';
import Image from 'next/image';
import { useState } from 'react';

type Props = {
  onBack?: () => void;
  onComplete?: (data?: any) => void;
};

export default function DadosDocumentosMedicoCard({ onBack, onComplete }: Props) {
  const [seguroFile, setSeguroFile] = useState<File | null>(null);
  const [diplomaFile, setDiplomaFile] = useState<File | null>(null);
  const [diplomaEspFile, setDiplomaEspFile] = useState<File | null>(null);
  const [assinaturaFile, setAssinaturaFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  function FileField({ id, accept, file, setFile, placeholder }: { id: string; accept?: string; file: File | null; setFile: (f: File | null) => void; placeholder: string; }) {
    const iconSrc = file ? '/images/document.svg' : '/images/document-upload.svg';
    return (
      <div className="file-field">
        <input id={id} type="file" accept={accept} onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <label htmlFor={id} className={`file-visual ${file ? 'has-file' : ''}`} aria-hidden>
          <div className="file-icon">
            <Image src={iconSrc} alt={file ? 'Documento anexado' : 'Anexar documento'} width={28} height={28} />
          </div>
          <div className="file-text">
            <div className={`file-placeholder ${file ? 'has-file' : ''}`}>{file ? (file.name.length > 40 ? file.name.slice(0, 36) + '...' : file.name) : placeholder}</div>
            {file && <div className="file-sub">Clique para substituir</div>}
          </div>
        </label>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!seguroFile) {
      setError('Anexe o Seguro de Responsabilidade Civil.');
      return;
    }
    if (!diplomaFile) {
      setError('Anexe o Diploma.');
      return;
    }
    if (!assinaturaFile) {
      setError('Anexe a Assinatura digital.');
      return;
    }
    // pass back file refs; upload handled elsewhere
    onComplete?.({ seguroFile, diplomaFile, diplomaEspFile, assinaturaFile });
  }

  return (
    <section className="register-card dados-documentos-medico-card">
      <h1 className="register-title">Documentos para cadastro</h1>
      <p className="register-subtitle">Etapa 3 de 3 - Documentos</p>

      <form className="register-form" onSubmit={handleSubmit}>
        {/** Use a single consistent placeholder text for all file fields */}
        {
          (() => {
            const placeholderText = 'Clique para enviar o documento';
            return (
              <>
                <label className="form-label">
                  <span className="label-title">Seguro de Responsabilidade Civil<span className="required-asterisk">*</span></span>
                  <FileField id="seguro" accept="application/pdf,image/*" file={seguroFile} setFile={setSeguroFile} placeholder={placeholderText} />
                </label>

                <label className="form-label">
                  <span className="label-title">Diploma<span className="required-asterisk">*</span></span>
                  <FileField id="diploma" accept="application/pdf,image/*" file={diplomaFile} setFile={setDiplomaFile} placeholder={placeholderText} />
                </label>

                <label className="form-label">
                  <span className="label-title">Diploma de especialista</span>
                  <FileField id="diplomaEsp" accept="application/pdf,image/*" file={diplomaEspFile} setFile={setDiplomaEspFile} placeholder={placeholderText} />
                </label>

                <label className="form-label">
                  <span className="label-title">Assinatura digital<span className="required-asterisk">*</span></span>
                  <FileField id="assinatura" accept="application/pdf,image/*" file={assinaturaFile} setFile={setAssinaturaFile} placeholder={placeholderText} />
                </label>
              </>
            );
          })()
        }

        {error && <div className="error-text">{error}</div>}

        <div className="form-actions actions-full">
          <Button type="button" variant="ghost" onClick={onBack} className="btn-equal">Voltar</Button>
          <Button
            type="submit"
            variant="primary"
            className="btn-equal"
            disabled={!(seguroFile && diplomaFile && assinaturaFile)}
          >
            Próximo
          </Button>
        </div>
      </form>
    </section>
  );
}
