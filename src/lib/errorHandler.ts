import { parseApiError, ParsedApiError } from '@/lib/apiError';

export type ErrorHandlerCallbacks = {
    setFieldError?: (field: string, message: string) => void;
    setGlobalError?: (message: string) => void;
    onSuccess?: () => void; // Optional callback for success (not used for error handling but symmetrical)
};

/**
 * Maps backend error codes to user-friendly messages and executes callbacks.
 * 
 * @param error The raw error object from catch block
 * @param callbacks Object containing state setters for errors
 * @returns The parsed error object for further custom handling if needed
 */
export function handleApiError(error: any, callbacks: ErrorHandlerCallbacks): ParsedApiError {
    const parsed = parseApiError(error);
    const { code, message, details } = parsed;
    const { setFieldError, setGlobalError } = callbacks;

    // Helper to safely set global error if provided
    const global = (msg: string) => {
        if (setGlobalError) setGlobalError(msg);
    };

    switch (code) {
        case 'INVALID_INPUT':
            if (Array.isArray(details) && details.length > 0 && setFieldError) {
                details.forEach((d: any) => {
                    const path = Array.isArray(d.path) ? String(d.path[0]) : '';
                    const msg = d.message || message || 'Dado inválido';
                    // Map backend field names to frontend logic if necessary
                    if (path) {
                        setFieldError(path, msg);
                    }
                });
                // Also set a generic global message if multiple errors or just to notify
                global('Verifique os dados informados e tente novamente.');
            } else {
                global('Dados inválidos. Verifique as informações.');
            }
            break;

        case 'USER_NOT_FOUND':
            global('Não encontramos uma conta com este email. Verifique ou cadastre-se.');
            break;

        case 'WRONG_PASSWORD':
            // If we have a specific field setter for password, we can use it, otherwise global
            if (setFieldError) {
                setFieldError('password', 'Senha incorreta. Tente novamente.');
                setFieldError('senha', 'Senha incorreta. Tente novamente.');
            } else {
                global('Senha incorreta. Tente novamente.');
            }
            break;

        case 'EMAIL_ALREADY_EXISTS':
            if (setFieldError) {
                setFieldError('email', 'Este email já está em uso. Faça login ou use outro.');
            } else {
                global('Este email já está em uso. Faça login ou use outro.');
            }
            break;

        case 'CPF_ALREADY_EXISTS':
            if (setFieldError) {
                setFieldError('cpf', 'CPF já cadastrado. Entre em contato com o suporte se necessário.');
            } else {
                global('CPF já cadastrado. Entre em contato com o suporte se necessário.');
            }
            break;

        case 'PATIENT_ALREADY_EXISTS':
            global('Seus dados pessoais já estão cadastrados.');
            break;

        case 'MEDIC_ALREADY_EXISTS':
            global('Já recebemos os dados deste médico.');
            break;

        case 'USE_GOOGLE_AUTH':
            global('Esta conta usa login social. Clique em "Entrar com Google".');
            break;

        case 'INTERNAL_ERROR':
            global('Ocorreu um erro no servidor. Tente novamente mais tarde.');
            break;

        case 'INVALID_USER_TYPE':
            global('Tipo de usuário inválido para esta operação.');
            break;

        default:
            // Fallback for unmapped codes or generic errors
            global(message || 'Ocorreu um erro inesperado. Tente novamente.');
            break;
    }

    return parsed;
}
