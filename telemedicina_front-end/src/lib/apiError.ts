export type ApiErrorDetail = {
  path?: Array<string | number>;
  message?: string;
  [key: string]: any;
};

export type ParsedApiError = {
  code?: string;
  message?: string;
  details?: ApiErrorDetail[];
};

export function parseApiError(err: any): ParsedApiError {
  const data = err?.response?.data || err?.data || null;
  // Our proxy returns { error: true, status, upstream } on failures
  const upstream = (data && typeof data === 'object') ? (data as any).upstream : null;
  const apiErr = (data && (data as any).error && upstream) ? upstream : ((data && (data as any).error) || data) || null;
  const code = (apiErr as any)?.code || (upstream as any)?.code;
  const message = (apiErr as any)?.message || err?.message || 'Erro na requisição';
  const details = (apiErr as any)?.details || (upstream as any)?.details || null;
  return { code, message, details };
}

export default parseApiError;
