type StoredUser = {
  id?: number;
  email?: string;
  tipo_usuario?: string;
  [key: string]: any;
};

const STORAGE_KEY = 'telemedicina_user';
const TOKEN_KEYS = ['telemedicina_token', 'token', 'auth_token'];

export function saveUser(user: StoredUser | null) {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    // ignore
  }
}

export function getUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getUserId(): number | null {
  const u = getUser();
  if (!u) return null;
  return typeof u.id === 'number' ? u.id : (u.id ? Number(u.id) : null);
}

export function getUserDisplayName(user?: StoredUser | null): string {
  const u = user ?? getUser();
  if (!u) return 'Usuário';
  const tryStr = (v: any) => (typeof v === 'string' ? v.trim() : '');
  const nested = (obj: any, ...keys: string[]) => {
    if (!obj) return '';
    for (const k of keys) {
      const val = obj?.[k];
      const s = tryStr(val);
      if (s) return s;
    }
    return '';
  };
  const candidates: string[] = [];
  candidates.push(
    tryStr(u.nome),
    tryStr(u.nome_completo),
    tryStr(u.name),
    tryStr(u.fullName),
    tryStr((u as any).displayName),
  );
  // nested common shapes
  const paciente = (u as any).paciente || (u as any).patient;
  candidates.push(
    nested(paciente, 'nome_completo', 'nome', 'name')
  );
  const dp = (u as any).dados_pessoais || (u as any).dadosPessoais || (u as any).profile || (u as any).perfil;
  candidates.push(
    nested(dp, 'nome_completo', 'nome', 'name')
  );
  const medico = (u as any).medico || (u as any).doctor;
  candidates.push(
    nested(medico, 'nome_completo', 'nome', 'name')
  );
  const name = candidates.find((s) => typeof s === 'string' && s.length > 0);
  if (name) return name;
  return tryStr(u.email) || 'Usuário';
}

export function getUserFirstName(user?: StoredUser | null): string {
  const full = getUserDisplayName(user);
  if (!full) return 'Usuário';
  const trimmed = full.trim();
  const parts = trimmed.split(/\s+/);
  return parts[0] || trimmed || 'Usuário';
}

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  // Try common token locations
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v && v.trim().length > 0) return v.trim();
  }
  const u = getUser();
  const tryStr = (v: any) => (typeof v === 'string' ? v.trim() : '');
  // Look for token fields inside stored user
  const candidates = [
    tryStr((u as any)?.token),
    tryStr((u as any)?.jwt),
    tryStr((u as any)?.id_token),
    tryStr((u as any)?.accessToken),
    tryStr((u as any)?.auth?.token),
  ];
  const found = candidates.find((s) => s && s.length > 0);
  return found || '';
}

export default { saveUser, getUser, clearUser, getUserId, getUserDisplayName, getUserFirstName, getToken };
