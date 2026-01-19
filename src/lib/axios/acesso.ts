import axios from 'axios';
import { ApiError } from '@/lib/errorHandler';

export type AcessoPayload = {
  email: string;
  senha: string;
  tipo_usuario?: string;
};

export async function createAcesso(payload: AcessoPayload) {
  try {
    const body = { email: payload.email, senha: payload.senha, tipo_usuario: payload.tipo_usuario || 'paciente' };
    // POST to the local Next.js proxy route to avoid CORS in development
    const resp = await axios.post('/api/register/acesso', body, { headers: { 'Content-Type': 'application/json' } });
    return resp.data;
  } catch (err) {
    throw new ApiError(err);
  }
}

export default createAcesso;

