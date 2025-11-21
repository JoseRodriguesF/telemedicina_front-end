import axios from 'axios';

export type PessoaisPayload = {
  usuario_id?: number | null;
  nome_completo: string;
  data_nascimento: string; // expect YYYY-MM-DD
  cpf: string;
  sexo: string;
  estado_civil: string;
  endereco: string;
  telefone: string;
  responsavel_legal?: string | null;
  telefone_responsavel?: string | null;
  convenio?: string | null;
  numero_carteirinha?: string | null;
};

export async function createPessoais(payload: PessoaisPayload) {
  // Use local proxy route to avoid CORS
  const resp = await axios.post('/api/register/pessoais', payload, { headers: { 'Content-Type': 'application/json' } });
  return resp.data;
}

export default createPessoais;
