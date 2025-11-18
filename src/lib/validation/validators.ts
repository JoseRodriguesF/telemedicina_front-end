export const DEFAULT_ALLOWED_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'live.com',
  'icloud.com',
  'msn.com',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'yandex.com',
  'gmx.com'
];

/**
 * Verifica formato básico do email (parte local@dominio)
 */
export function isEmailFormatValid(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  // formato básico — não tenta capturar todos os casos RFC, é intencionalmente simples
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Verifica se o domínio do email está em uma allowlist de domínios existentes
 * @param email endereço de email completo
 * @param allowedDomains lista de domínios permitidos (ex: gmail.com)
 */
export function isEmailAllowedDomain(email: string, allowedDomains: string[] = DEFAULT_ALLOWED_DOMAINS): boolean {
  if (!isEmailFormatValid(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  const normalized = allowedDomains.map((d) => d.toLowerCase());
  return normalized.includes(domain);
}

/** Retorna true se as duas senhas são iguais */
export function doPasswordsMatch(password: string, confirm: string): boolean {
  return password === confirm;
}

/** Retorna true se o valor não for vazio (string) */
export function isNotEmpty(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Valida nome básico (não vazio, tamanho mínimo) */
export function isValidName(name: string): boolean {
  if (!isNotEmpty(name)) return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  // allow any unicode letter and spaces, block numbers, emojis and special chars
  // \\p{L} matches any kind of letter from any language (with 'u' flag)
  try {
    return /^[\p{L} ]+$/u.test(trimmed);
  } catch (e) {
    // fallback: basic latin letters and spaces
    return /^[A-Za-z À-ÖØ-öø-ÿ]+$/.test(trimmed);
  }
}

/** Validação simples de CPF (remove não dígitos e aplica cálculo) */
export function isValidCPF(cpf: string): boolean {
  if (!cpf || typeof cpf !== 'string') return false;
  const onlyNumbers = cpf.replace(/\D/g, '');
  if (onlyNumbers.length !== 11) return false;
  // rejeita sequências iguais
  if (/^(\d)\1{10}$/.test(onlyNumbers)) return false;

  const digits = onlyNumbers.split('').map(Number);

  const calc = (count: number) => {
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += digits[i] * (count + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calc(9);
  const d2 = calc(10);
  return d1 === digits[9] && d2 === digits[10];
}

/** Validação simples de telefone (aceita formatos comuns brasileiros) */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  let onlyNumbers = phone.replace(/\D/g, '');
  // se começar com código do país '55', remova antes de validar
  if (onlyNumbers.length > 11 && onlyNumbers.startsWith('55')) {
    onlyNumbers = onlyNumbers.slice(2);
  }
  // aceitar 10 ou 11 dígitos (DDD + número)
  if (!/^(?:\d{10,11})$/.test(onlyNumbers)) return false;
  // verify DDD is plausible
  const ddd = onlyNumbers.slice(0, 2);
  return isValidDDD(ddd);
}

/** Validar DDD brasileiro (dois dígitos) - lista de códigos válidos */
export function isValidDDD(ddd: string): boolean {
  if (!ddd || typeof ddd !== 'string') return false;
  const only = ddd.replace(/\D/g, '');
  if (!/^\d{2}$/.test(only)) return false;
  const states = getStatesForDDD(only);
  return states.length > 0;
}

/** Retorna os estados/UFs que utilizam o DDD informado (array vazio se nenhum) */
export function getStatesForDDD(ddd: string): string[] {
  if (!ddd || typeof ddd !== 'string') return [];
  const only = ddd.replace(/\D/g, '');
  if (!/^\d{2}$/.test(only)) return [];

  const map: Record<string, string[]> = {
    // São Paulo
    '11': ['SP'], '12': ['SP'], '13': ['SP'], '14': ['SP'], '15': ['SP'], '16': ['SP'], '17': ['SP'], '18': ['SP'], '19': ['SP'],
    // Rio de Janeiro
    '21': ['RJ'], '22': ['RJ'], '24': ['RJ'],
    // Espírito Santo
    '27': ['ES'], '28': ['ES'],
    // Minas Gerais
    '31': ['MG'], '32': ['MG'], '33': ['MG'], '34': ['MG'], '35': ['MG'], '37': ['MG'], '38': ['MG'],
    // Paraná
    '41': ['PR'], '42': ['PR'], '43': ['PR'], '44': ['PR'], '45': ['PR'], '46': ['PR'],
    // Santa Catarina
    '47': ['SC'], '48': ['SC'], '49': ['SC'],
    // Rio Grande do Sul
    '51': ['RS'], '53': ['RS'], '54': ['RS'], '55': ['RS'],
    // Distrito Federal / Goiás / Tocantins / Mato Grosso etc
    '61': ['DF'], '62': ['GO'], '63': ['TO'], '64': ['GO'],
    '65': ['MT'], '66': ['MT'], '67': ['MS'], '68': ['AC'], '69': ['RO'],
    // Bahia / Sergipe
    '71': ['BA'], '73': ['BA'], '74': ['BA'], '75': ['BA'], '77': ['BA'], '79': ['SE'],
    // Nordeste (PE/AL/PB/RN/CE/PI)
    '81': ['PE'], '82': ['AL'], '83': ['PB'], '84': ['RN'], '85': ['CE'], '86': ['PI'], '87': ['PE'], '88': ['CE'], '89': ['PI'],
    // Norte (PA/AM/RR/AP/RO/AM/MA)
    '91': ['PA'], '92': ['AM'], '93': ['PA'], '94': ['PA'], '95': ['RR'], '96': ['AP'], '97': ['AM'], '98': ['MA'], '99': ['MA']
  };

  return map[only] || [];
}

/** Valida senha com requisitos mínimos: 6 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial */
export function isStrongPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 6) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

/** Valida data ISO (YYYY-MM-DD) e não futura */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  // ignore time part
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (dt > now) return false;
  // age sanity check: not older than 130
  const age = now.getFullYear() - dt.getFullYear() - (now.getMonth() < dt.getMonth() || (now.getMonth() === dt.getMonth() && now.getDate() < dt.getDate()) ? 1 : 0);
  return age >= 0 && age <= 130;
}

export default {
  isEmailFormatValid,
  isEmailAllowedDomain,
  doPasswordsMatch,
  isNotEmpty,
  isValidName,
  isValidCPF,
  isValidPhone,
  isValidDDD,
  getStatesForDDD,
  isStrongPassword,
  isValidDate,
};
