import axios from './config';

export type GoogleAuthPayload = {
  id_token: string;
};

export async function doGoogleAuth(payload: GoogleAuthPayload) {
  const resp = await axios.post('/api/auth/google', payload, { headers: { 'Content-Type': 'application/json' } });
  return resp.data;
}

export async function doGoogleRegister(payload: GoogleAuthPayload & { tipo_usuario?: string }) {
  const body = { id_token: payload.id_token, tipo_usuario: payload.tipo_usuario || 'paciente' };
  const resp = await axios.post('/api/register/google', body, { headers: { 'Content-Type': 'application/json' } });
  return resp.data;
}

export default { doGoogleAuth, doGoogleRegister };
