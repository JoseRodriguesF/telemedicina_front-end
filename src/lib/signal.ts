export function getSignalUrl(apiBase: string): string {
  const base = (apiBase || '').trim();
  if (!base) return '';
  try {
    const u = new URL(base);
    const isHttps = u.protocol === 'https:';
    u.protocol = isHttps ? 'wss:' : 'ws:';
    return `${u.origin}/signal`;
  } catch {
    return '';
  }
}

export function getConsultaIdFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const sp = new URLSearchParams(window.location.search);
  return sp.get('id') || '';
}
