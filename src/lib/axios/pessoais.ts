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
  // Normalizar sexo para 'M'/'F' se vier por extenso
  if (payload.sexo) {
    const s = payload.sexo.toString().toLowerCase();
    if (s.startsWith('m')) payload.sexo = 'M';
    else if (s.startsWith('f')) payload.sexo = 'F';
  }
  // Sanitizar CPF / telefone
  if (payload.cpf) payload.cpf = payload.cpf.replace(/\D/g, '');
  if (payload.telefone) payload.telefone = payload.telefone.replace(/\D/g, '');
  if (payload.telefone_responsavel) payload.telefone_responsavel = payload.telefone_responsavel.replace(/\D/g, '');
  // Remover campos opcionais vazios ('' ou null) para evitar rejeição por validação
  const cleaned: Record<string, any> = {};
  Object.entries(payload).forEach(([k, v]) => {
    if (v === null) return; // omite null
    if (typeof v === 'string' && v.trim() === '') return; // omite vazio
    cleaned[k] = v;
  });
  // Validação rápida de telefone (10 ou 11 dígitos)
  if (cleaned.telefone && !/^\d{10,11}$/.test(cleaned.telefone)) {
    throw new Error('Telefone inválido. Use DDD + número (10 ou 11 dígitos).');
  }
  // Log somente em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[createPessoais] sending sanitized payload:', cleaned);
  }
  const resp = await axios.post('/api/register/pessoais', cleaned, { headers: { 'Content-Type': 'application/json' } });
  return resp.data;
}

export default createPessoais;
