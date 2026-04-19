import { parseApiError, ParsedApiError } from '@/lib/apiError';

export type ErrorHandlerCallbacks = {
    setFieldError?: (field: string, message: string) => void;
    setGlobalError?: (message: string) => void;
    onSuccess?: () => void;
};

/**
 * User-friendly error messages for known API error codes.
 * These are returned by the backend in the `code` field.
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
    // Authentication & Authorization
    'USER_NOT_FOUND': 'Não encontramos uma conta com este email. Verifique ou cadastre-se.',
    'WRONG_PASSWORD': 'Senha incorreta. Tente novamente.',
    'INVALID_TOKEN': 'Sua sessão expirou ou é inválida. Faça login novamente.',
    'TOKEN_EXPIRED': 'Sua sessão expirou. Por favor, faça login novamente.',
    'UNAUTHORIZED': 'Você não tem permissão para realizar esta ação. Faça login.',
    'FORBIDDEN': 'Acesso negado. Você não possui permissão para este recurso.',
    'USE_GOOGLE_AUTH': 'Esta conta usa login social. Clique em "Entrar com Google".',
    'tcle_required': 'Você precisa aceitar o Termo de Consentimento (TCLE) para agendar consultas.',
    'paciente_profile_not_found': 'Perfil de paciente não encontrado. Por favor, complete seu cadastro.',

    // User & Registration
    'EMAIL_ALREADY_EXISTS': 'Este email já está em uso. Faça login ou use outro.',
    'CPF_ALREADY_EXISTS': 'CPF já cadastrado. Entre em contato com o suporte se necessário.',
    'PATIENT_ALREADY_EXISTS': 'Seus dados pessoais já estão cadastrados.',
    'MEDIC_ALREADY_EXISTS': 'Já recebemos os dados deste médico.',
    'INVALID_USER_TYPE': 'Tipo de usuário inválido para esta operação.',
    'USER_ALREADY_IN_QUEUE': 'Você já está na fila de atendimento. Aguarde sua vez.',

    // Validation
    'INVALID_INPUT': 'Dados inválidos. Verifique as informações e tente novamente.',
    'INVALID_CPF': 'CPF inválido. Verifique os dígitos informados.',
    'INVALID_DATE': 'Data inválida. Verifique o formato (DD/MM/AAAA).',
    'INVALID_TIME': 'Horário inválido. Verifique o formato (HH:MM).',
    'MISSING_REQUIRED_FIELD': 'Campos obrigatórios não preenchidos.',

    // Appointments / Consultas
    'CONSULTA_NOT_FOUND': 'Consulta não encontrada. Verifique o ID ou atualize a página.',
    'CONSULTA_ALREADY_SCHEDULED': 'Você já possui uma consulta agendada para este horário.',
    'CONSULTA_ALREADY_CLAIMED': 'Esta consulta já foi assumida por outro médico.',
    'CONSULTA_ALREADY_IN_PROGRESS': 'Esta consulta já está em andamento.',
    'CONSULTA_ALREADY_FINISHED': 'Esta consulta já foi finalizada.',
    'CONSULTA_ALREADY_CANCELLED': 'Esta consulta já foi cancelada.',
    'SLOT_UNAVAILABLE': 'Este horário não está mais disponível. Escolha outro.',
    'TIME_SLOT_CONFLICT': 'Conflito de horário. Você já tem um compromisso neste período.',
    'MEDICO_UNAVAILABLE': 'O médico selecionado não está disponível neste horário.',
    'CANNOT_CANCEL_IN_PROGRESS': 'Não é possível cancelar uma consulta em andamento.',
    'CANNOT_MODIFY_FINISHED': 'Não é possível modificar uma consulta já finalizada.',
    'ONLY_MEDICO_CAN_CLAIM': 'Apenas médicos podem assumir pacientes da fila.',
    'ONLY_MEDICO_CAN_LIST_QUEUE': 'Apenas médicos podem visualizar a fila de pacientes.',
    'ONLY_MEDICO_CAN_START': 'Apenas médicos podem iniciar consultas.',
    'ONLY_PACIENTE_CAN_JOIN_QUEUE': 'Apenas pacientes podem entrar na fila de atendimento.',
    'ALREADY_IN_ACTIVE_CONSULTA': 'Você já possui uma consulta ativa. Finalize-a antes de iniciar outra.',

    // Room & WebRTC
    'ROOM_NOT_FOUND': 'Sala de atendimento não encontrada. A consulta pode ter sido encerrada.',
    'ROOM_ALREADY_EXISTS': 'Sala de atendimento já existe para esta consulta.',
    'CANNOT_JOIN_ROOM': 'Não foi possível entrar na sala. Tente novamente.',
    'CONNECTION_FAILED': 'Falha na conexão. Verifique sua internet e tente novamente.',

    // Server Errors
    'INTERNAL_ERROR': 'Ocorreu um erro no servidor. Tente novamente mais tarde.',
    'DATABASE_ERROR': 'Erro ao acessar o banco de dados. Tente novamente.',
    'SERVICE_UNAVAILABLE': 'Serviço temporariamente indisponível. Tente em alguns minutos.',

    // Rate Limiting
    'RATE_LIMIT_EXCEEDED': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
    'TOO_MANY_REQUESTS': 'Muitas requisições. Aguarde um momento.',
};

/**
 * User-friendly messages for HTTP status codes (fallback when no specific code is provided).
 */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
    400: 'Requisição inválida. Verifique os dados enviados.',
    401: 'Sessão expirada ou não autenticada. Faça login novamente.',
    403: 'Acesso negado. Você não tem permissão para esta ação.',
    404: 'Recurso não encontrado. Verifique o endereço ou tente novamente.',
    409: 'Conflito detectado. Este recurso já existe ou foi modificado.',
    422: 'Dados inválidos. Verifique as informações e tente novamente.',
    429: 'Muitas tentativas. Aguarde alguns minutos.',
    500: 'Erro interno do servidor. Tente novamente mais tarde.',
    502: 'Serviço indisponível. Tente novamente em alguns instantes.',
    503: 'Serviço temporariamente fora do ar. Tente novamente em breve.',
    504: 'Tempo de resposta esgotado. Verifique sua conexão.',
};

/**
 * Extracts the HTTP status code from an error object (axios or fetch).
 */
function getHttpStatus(error: any): number | null {
    return error?.response?.status || error?.status || null;
}

/**
 * Gets a user-friendly message based on error code or HTTP status.
 */
export function getErrorMessage(error: any): string {
    const parsed = parseApiError(error);
    const { code, message } = parsed;
    const httpStatus = getHttpStatus(error);

    // Priority 1: Known error code from backend
    if (code && ERROR_CODE_MESSAGES[code]) {
        return ERROR_CODE_MESSAGES[code];
    }

    // Priority 2: Known HTTP status code
    if (httpStatus && HTTP_STATUS_MESSAGES[httpStatus]) {
        // If we have a more specific message from the backend, append it
        const baseMessage = HTTP_STATUS_MESSAGES[httpStatus];
        if (message && message !== code && !message.includes('undefined')) {
            // Check if the backend message is informative
            const lowerMsg = message.toLowerCase();
            if (!lowerMsg.includes('error') && !lowerMsg.includes('failed') && lowerMsg.length > 5) {
                return `${baseMessage} Detalhe: ${message}`;
            }
        }
        return baseMessage;
    }

    // Priority 3: Backend message if it seems user-friendly
    if (message && message.length > 3 && !message.toLowerCase().includes('undefined')) {
        return message;
    }

    // Priority 4: Generic fallback
    return 'Ocorreu um erro inesperado. Tente novamente.';
}

/**
 * Error class for API errors with structured information.
 */
export class ApiError extends Error {
    public readonly code: string | undefined;
    public readonly httpStatus: number | null;
    public readonly details: any[] | undefined;
    public readonly originalError: any;

    constructor(error: any) {
        const parsed = parseApiError(error);
        const userMessage = getErrorMessage(error);
        super(userMessage);

        this.name = 'ApiError';
        this.code = parsed.code;
        this.httpStatus = getHttpStatus(error);
        this.details = parsed.details;
        this.originalError = error;
    }
}

/**
 * Maps backend error codes to user-friendly messages and executes callbacks.
 * Enhanced version with HTTP status code handling.
 * 
 * @param error The raw error object from catch block
 * @param callbacks Object containing state setters for errors
 * @returns The parsed error object for further custom handling if needed
 */
export function handleApiError(error: any, callbacks: ErrorHandlerCallbacks): ParsedApiError {
    const parsed = parseApiError(error);
    const { code, details } = parsed;
    const { setFieldError, setGlobalError } = callbacks;
    const httpStatus = getHttpStatus(error);

    // Helper to safely set global error if provided
    const global = (msg: string) => {
        if (setGlobalError) setGlobalError(msg);
    };

    // Handle field-level errors from validation details
    if (Array.isArray(details) && details.length > 0 && setFieldError) {
        details.forEach((d: any) => {
            const path = Array.isArray(d.path) ? String(d.path[0]) : (d.field || '');
            const fieldMsg = d.message || 'Campo inválido';
            if (path) {
                setFieldError(path, fieldMsg);
            }
        });
    }

    // Handle password field specifically for WRONG_PASSWORD
    if (code === 'WRONG_PASSWORD' && setFieldError) {
        setFieldError('password', 'Senha incorreta. Tente novamente.');
        setFieldError('senha', 'Senha incorreta. Tente novamente.');
    }

    // Handle email field specifically for email-related errors
    if (code === 'EMAIL_ALREADY_EXISTS' && setFieldError) {
        setFieldError('email', ERROR_CODE_MESSAGES['EMAIL_ALREADY_EXISTS']);
    }

    // Handle CPF field specifically
    if ((code === 'CPF_ALREADY_EXISTS' || code === 'INVALID_CPF') && setFieldError) {
        setFieldError('cpf', ERROR_CODE_MESSAGES[code] || 'CPF inválido');
    }

    // Always set a global error message
    const userMessage = getErrorMessage(error);
    global(userMessage);

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
        console.error('[handleApiError]', {
            code,
            httpStatus,
            userMessage,
            originalMessage: parsed.message,
            details,
        });
    }

    return parsed;
}

/**
 * Wraps an async API call with standardized error handling.
 * Returns { data, error } instead of throwing.
 */
export async function safeApiCall<T>(
    apiCall: () => Promise<T>,
    callbacks?: ErrorHandlerCallbacks
): Promise<{ data: T | null; error: ApiError | null }> {
    try {
        const data = await apiCall();
        return { data, error: null };
    } catch (err) {
        const apiError = new ApiError(err);
        if (callbacks) {
            handleApiError(err, callbacks);
        }
        return { data: null, error: apiError };
    }
}

export default handleApiError;

