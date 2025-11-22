import axios from 'axios';

export type AcessoPayload = {
  email: string;
  senha: string;
  tipo_usuario?: string;
};

export async function createAcesso(payload: AcessoPayload) {
  const body = { email: payload.email, senha: payload.senha, tipo_usuario: payload.tipo_usuario || 'paciente' };
  // POST to the local Next.js proxy route to avoid CORS in development
  const resp = await axios.post('/api/register/acesso', body, { headers: { 'Content-Type': 'application/json' } });
  return resp.data;
}

export default createAcesso;
