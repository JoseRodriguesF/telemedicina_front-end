import axios from 'axios';

export type PessoaisPayload = {
  usuario_id?: number | null;
  nome_completo: string;
  data_nascimento: string; // expect YYYY-MM-DD
  cpf: string;
  sexo: string;
  estado_civil: string;
  endereco: string;
  numero?: number | null;
  complemento?: string | null;
  telefone: string;
  responsavel_legal?: string | null;
  telefone_responsavel?: string | null;
  convenio?: string | null;
  numero_carteirinha?: string | null;
};

export async function createPessoais(payload: PessoaisPayload) {
  // Use local Next.js proxy route to avoid CORS in development
  if (process.env.NODE_ENV === 'development') {
    // Debug outbound payload in development
    // eslint-disable-next-line no-console
    console.log('[createPessoais] sending payload:', payload);
  }
  const resp = await axios.post('/api/register/pessoais', payload, { headers: { 'Content-Type': 'application/json' } });
  return resp.data;
}

export default createPessoais;
