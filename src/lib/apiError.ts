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
  const apiErr = data?.error || data || null;
  const code = apiErr?.code;
  const message = apiErr?.message || err?.message || 'Erro na requisição';
  const details = apiErr?.details || null;
  return { code, message, details };
}

export default parseApiError;
