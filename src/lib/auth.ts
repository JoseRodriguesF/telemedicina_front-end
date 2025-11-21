type StoredUser = {
  id?: number;
  email?: string;
  tipo_usuario?: string;
  [key: string]: any;
};

const STORAGE_KEY = 'telemedicina_user';

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

export default { saveUser, getUser, clearUser, getUserId };
