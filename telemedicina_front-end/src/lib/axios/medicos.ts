import axios from './config';
import { ApiError } from '@/lib/errorHandler';

export type MedicoPayload = {
  usuario_id?: number | null;
  nome_completo: string;
  data_nascimento: string; // YYYY-MM-DD
  cpf: string; // digits only
  sexo: string; // 'masculino' | 'feminino' | 'outro'
  crm: string; // e.g. 'CRM-12345' or '12345'
  crm_uf?: string;
  rqe?: string | null;
  telefone_celular?: string;
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
  try {
    console.log(`[Axios] POST /api/register/medicos`, payload);
    const resp = await axios.post('/api/register/medicos', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return resp.data as CreateMedicoResponse;
  } catch (err: any) {
    console.error(`[Axios Error] POST /api/register/medicos:`, err?.response?.data || err?.message);
    throw new ApiError(err);
  }
}

/**
 * List available medicos
 * GET /api/medicos
 */
export type Medico = {
  id: number;
  nome_completo: string;
  crm: string;
  especialidade?: string;
  rating?: number;
  reviews?: number;
};

export async function listMedicos(token: string): Promise<Medico[]> {
  try {
    const resp = await axios.get('/api/medicos', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return resp.data as Medico[];
  } catch (err) {
    throw new ApiError(err);
  }
}

export default createMedico;

