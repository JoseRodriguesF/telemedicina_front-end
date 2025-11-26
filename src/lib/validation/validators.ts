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

/**
 * Valida data nas formas DD/MM/YYYY ou YYYY-MM-DD e verifica se não é futura
 * e tem idade plausível (0..130).
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;

  let year: number | null = null;
  let month: number | null = null; // 0-based
  let day: number | null = null;

  const s = dateStr.trim();

  // Caso formato DD/MM/YYYY
  if (s.includes('/')) {
    const parts = s.split('/').map((p) => p.trim());
    if (parts.length !== 3) return false;
    const d = Number(parts[0]);
    const m = Number(parts[1]);
    const y = Number(parts[2]);
    if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return false;
    day = d;
    month = m - 1;
    year = y;
  } else if (s.includes('-')) {
    // aceitar YYYY-MM-DD ou possivelmente ISO
    const d = new Date(s);
    if (isNaN(d.getTime())) return false;
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  } else {
    // tentar interpretar como DDMMYYYY (somente dígitos)
    const only = s.replace(/\D/g, '');
    if (only.length === 8) {
      const d = Number(only.slice(0, 2));
      const m = Number(only.slice(2, 4));
      const y = Number(only.slice(4, 8));
      day = d;
      month = m - 1;
      year = y;
    } else {
      return false;
    }
  }

  if (year === null || month === null || day === null) return false;
  // basic ranges
  if (year < 1900 || year > 9999) return false;
  if (month < 0 || month > 11) return false;
  if (day < 1 || day > 31) return false;

  const dt = new Date(year, month, day);
  if (isNaN(dt.getTime())) return false;
  // ensure the constructed date matches parts (avoid 31/02 -> becomes 03/03)
  if (dt.getFullYear() !== year || dt.getMonth() !== month || dt.getDate() !== day) return false;

  const today = new Date();
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const cmp = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  if (cmp > now) return false;

  // age sanity check: not older than 130
  let age = now.getFullYear() - cmp.getFullYear();
  if (now.getMonth() < cmp.getMonth() || (now.getMonth() === cmp.getMonth() && now.getDate() < cmp.getDate())) {
    age -= 1;
  }
  return age >= 0 && age <= 130;
}

  /**
   * Format and constrain a date input as DD/MM/YYYY while typing.
   * It progressively enforces possible day and month values and clamps impossible dates
   * (e.g., month > 12 becomes 12, day > 31 becomes 31, and respects month length + leap year when year is provided).
   */
  export function formatConstrainedDateInput(raw: string): string {
    let digits = (raw || '').replace(/\D/g, '').slice(0, 8); // up to DDMMYYYY
    // Day
    let dd = digits.slice(0, 2);
    if (dd.length === 1) {
      if (parseInt(dd, 10) > 3) dd = '3';
    } else if (dd.length === 2) {
      const dNum = parseInt(dd, 10);
      if (dNum === 0) dd = '01';
      else if (dNum > 31) dd = '31';
      else if (dd[0] === '3' && parseInt(dd[1], 10) > 1) dd = '31';
    }

    // Month
    let mm = digits.slice(2, 4);
    if (mm.length === 1) {
      if (parseInt(mm, 10) > 1) mm = '1';
    } else if (mm.length === 2) {
      const mNum = parseInt(mm, 10);
      if (mNum === 0) mm = '01';
      else if (mNum > 12) mm = '12';
    }

    // Year
    let yyyy = digits.slice(4, 8);
    // When we have full month, apply month-specific max day (optionally leap year if year is complete)
    if (dd.length === 2 && mm.length === 2) {
      const dNum = parseInt(dd, 10);
      const mNum = parseInt(mm, 10);
      let isLeap = false;
      if (yyyy.length === 4) {
        const yNum = parseInt(yyyy, 10);
        isLeap = (yNum % 4 === 0 && yNum % 100 !== 0) || (yNum % 400 === 0);
      }
      const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][Math.max(0, mNum - 1)];
      if (dNum > daysInMonth) dd = String(daysInMonth).padStart(2, '0');
    }

    let out = dd;
    if (mm.length) out += '/' + mm;
    if (yyyy.length) out += '/' + yyyy;
    return out;
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
