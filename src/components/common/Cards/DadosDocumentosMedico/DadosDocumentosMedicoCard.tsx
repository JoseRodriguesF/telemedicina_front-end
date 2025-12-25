'use client';

import './DadosDocumentosMedicoCard.css';
import Button from '@/components/common/Buttons/Button';
import Image from 'next/image';
import { useState } from 'react';
import { handleApiError } from '@/lib/errorHandler';

type Props = {
  onBack?: () => void;
  onComplete?: (data?: any) => void;
  userId?: number | null;
  pessoaisData?: any | null;
};

export default function DadosDocumentosMedicoCard({ onBack, onComplete, userId, pessoaisData }: Props) {
  const [seguroFile, setSeguroFile] = useState<File | null>(null);
  const [diplomaFile, setDiplomaFile] = useState<File | null>(null);
  const [diplomaEspFile, setDiplomaEspFile] = useState<File | null>(null);
  const [assinaturaFile, setAssinaturaFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
            <div className={`file-placeholder ${file ? 'has-file' : ''}`}>{file ? 'Documento anexado' : placeholder}</div>
            {file && <div className="file-sub">Clique para substituir</div>}
          </div>
        </label>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!seguroFile || !diplomaFile || !assinaturaFile) {
      setError('Por favor, anexe todos os documentos obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      const upload = (await import('@/lib/upload')).default;
      const createMedico = (await import('@/lib/axios/medicos')).default;

      // upload required files to server -> cloudinary
      const seguroResp = await upload(seguroFile as File);
      const diplomaResp = await upload(diplomaFile as File);
      const assinaturaResp = await upload(assinaturaFile as File);
      const especializacaoResp = diplomaEspFile ? await upload(diplomaEspFile as File) : null;

      // build payload using passed props (userId and pessoaisData) or fallbacks
      const pd = pessoaisData || {};
      const toISODate = (d: string) => {
        if (!d) return '';
        if (d.includes('/')) {
          const parts = d.split('/');
          if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return d;
      };

      const payload: any = {
        usuario_id: userId || null,
        nome_completo: pd?.name || pd?.nome || '',
        data_nascimento: toISODate(pd?.birthDate || pd?.data_nascimento || ''),
        cpf: (pd?.cpf || '').toString().replace(/\D/g, ''),
        sexo: (pd?.gender || pd?.sexo || '').toString().toLowerCase(),
        crm: pd?.crm || '',
        diploma_url: diplomaResp?.secure_url || diplomaResp?.url || null,
        especializacao_url: especializacaoResp?.secure_url || especializacaoResp?.url || null,
        assinatura_digital_url: assinaturaResp?.secure_url || assinaturaResp?.url || null,
        seguro_responsabilidade_url: seguroResp?.secure_url || seguroResp?.url || null,
      };

      // Remove keys with null or undefined values so the backend doesn't reject
      // optional fields that are omitted by the client.
      Object.keys(payload).forEach((k) => {
        if (payload[k] === null || typeof payload[k] === 'undefined') {
          delete payload[k];
        }
      });

      const resp = await createMedico(payload);

      try {
        const { saveUser } = await import('@/lib/auth');
        if (resp?.user) saveUser(resp.user);
      } catch (e) {
        // ignore save failures
      }

      onComplete?.(resp);
    } catch (err: any) {
      handleApiError(err, { setGlobalError: setError });
    } finally {
      setLoading(false);
    }
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
          <Button type="button" variant="ghost" onClick={onBack} className="btn-equal" disabled={loading}>Voltar</Button>
          <Button
            type="submit"
            variant="primary"
            className="btn-equal"
            disabled={loading || !(seguroFile && diplomaFile && assinaturaFile)}
            loading={loading}
          >
            {loading ? 'Enviando...' : 'Próximo'}
          </Button>
        </div>
      </form>
    </section>
  );
}
