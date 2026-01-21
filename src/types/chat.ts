// Tipos para respostas da API de Chat IA

/**
 * Resposta base do endpoint /api/chat-ia
 */
export interface ChatIAResponse {
    /** Resposta textual da IA */
    answer: string;

    /** Indica se a triagem foi concluída */
    completed: boolean;

    /** Indica se a história clínica foi salva com sucesso (apenas quando completed=true) */
    historiaClinicaSalva?: boolean;

    /** ID da história clínica salva (apenas quando historiaClinicaSalva=true) */
    historiaClinicaId?: number;

    /** Mensagem de erro caso falhe ao salvar (apenas quando historiaClinicaSalva=false) */
    erro?: string;
}

/**
 * Estrutura do histórico de mensagens enviado para a API
 */
export type ChatHistory = Array<{
    role: 'user' | 'assistant';
    content: string;
}>;

/**
 * Estrutura de uma mensagem no chat do frontend
 */
export interface ChatMessage {
    author: 'Você' | 'Sistema' | 'Angélica';
    text: string;
}

/**
 * Request body para o endpoint /api/chat-ia
 */
export interface ChatIARequest {
    message: string;
    history?: ChatHistory;
}
