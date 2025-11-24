import axios from 'axios';

export type MedicoPayload = {
  usuario_id?: number | null;
  nome_completo: string;
  data_nascimento: string; // YYYY-MM-DD
  cpf: string; // digits only
  sexo: string; // 'masculino' | 'feminino' | 'outro'
  crm: string; // e.g. 'CRM-12345' or '12345'
  diploma_url?: string | null;
  especializacao_url?: string | null;
  assinatura_digital_url?: string | null;
  seguro_responsabilidade_url?: string | null;
};

export type CreateMedicoResponse = {
  message: string;
  medicoId: number;
  user?: {
    id: number;
    email: string;
    tipo_usuario: string;
    token?: string;
  };
};

/**
 * Create / register medico (server proxy route used in dev should forward to remote API)
 * POST /api/register/medicos
 */
export async function createMedico(payload: MedicoPayload): Promise<CreateMedicoResponse> {
  const resp = await axios.post('/api/register/medicos', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return resp.data as CreateMedicoResponse;
}

export default createMedico;
