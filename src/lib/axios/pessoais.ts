import axios from 'axios';
import { isValidDDD } from '@/lib/validation/validators';

export type PessoaisPayload = {
  usuario_id?: number | null;
  nome_completo: string;
  data_nascimento: string; // expect YYYY-MM-DD
  cpf: string;
  sexo: string;
  estado_civil: string;
  telefone: string;
  endereco: {
    endereco: string;
    numero?: number | null;
    complemento?: string | null;
  };
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
  // Sanitizar CPF / telefone e normalizar endereço aninhado
  if (payload.cpf) payload.cpf = payload.cpf.replace(/\D/g, '');
  if (payload.telefone) payload.telefone = payload.telefone.replace(/\D/g, '');
  if (payload.telefone_responsavel) payload.telefone_responsavel = payload.telefone_responsavel.replace(/\D/g, '');

  // Remover campos opcionais vazios ('' ou null) no nível raiz
  const cleaned: Record<string, any> = {};
  const rootEntries = Object.entries(payload);
  rootEntries.forEach(([k, v]) => {
    if (k === 'endereco') return; // trataremos abaixo
    if (v === null) return;
    if (typeof v === 'string' && v.trim() === '') return;
    cleaned[k] = v;
  });

  // Endereço aninhado: limpar campos e converter vazio para null
  const e = payload.endereco || { endereco: '', numero: null, complemento: null };
  const addr: any = {};
  addr.endereco = (e.endereco || '').toString().trim();
  addr.numero = e.numero === null || typeof e.numero === 'undefined' ? null : (Number(String(e.numero).replace(/\D/g, '')) || null);
  const comp = (e.complemento || '').toString().trim();
  addr.complemento = comp ? comp : null;
  cleaned.endereco = addr;
  // Validação rápida de telefone (10 ou 11 dígitos) e DDD
  if (cleaned.telefone) {
    if (!/^\d{10,11}$/.test(cleaned.telefone)) {
      throw new Error('Telefone inválido. Use DDD + número (10 ou 11 dígitos).');
    }
    const ddd = cleaned.telefone.slice(0, 2);
    if (!isValidDDD(ddd)) {
      throw new Error('DDD inválido. Informe um DDD brasileiro válido.');
    }
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
