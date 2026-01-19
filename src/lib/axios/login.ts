import axios from 'axios';
import { ApiError } from '@/lib/errorHandler';

export type LoginPayload = {
  email: string;
  senha: string;
};

export async function doLogin(payload: LoginPayload) {
  try {
    // call local proxy to avoid CORS
    const resp = await axios.post('/api/login', payload, { headers: { 'Content-Type': 'application/json' } });
    return resp.data;
  } catch (err) {
    throw new ApiError(err);
  }
}

export default doLogin;
