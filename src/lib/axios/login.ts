import axios from 'axios';

export type LoginPayload = {
  email: string;
  senha: string;
};

export async function doLogin(payload: LoginPayload) {
  // call local proxy to avoid CORS
  const resp = await axios.post('/api/login', payload, { headers: { 'Content-Type': 'application/json' } });
  return resp.data;
}

export default doLogin;
""