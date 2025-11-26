import axios from 'axios';

export type SocialLoginPayload = {
  provider: string; // 'google', etc.
  id_token: string;
};

export async function doSocialLogin(payload: SocialLoginPayload) {
  const resp = await axios.post('/api/login', payload, { headers: { 'Content-Type': 'application/json' } });
  return resp.data;
}

export default doSocialLogin;
