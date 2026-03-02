// Tipos para respostas da API de Chat IA

/**
 * Resposta base do endpoint /api/chat-ia
 */
export interface ChatIAResponse {
    /** Resposta textual da IA */
    answer: string;

    /** Indica se a triagem foi concluída */
    completed: boolean;

    /** Indica se a história clínica foi salva com sucesso */
    historiaClinicaSalva?: boolean;

    /** ID da história clínica salva */
    historiaClinicaId?: number;

    /** Mensagem de erro caso falhe ao salvar */
    erro?: string;

    /** Dados estruturados retornados quando completed=true e aguardandoConfirmacao=true */
    dadosEstruturados?: {
        queixa_principal?: string;
        descricao_sintomas?: string;
        historico_pessoal?: {
            doencas?: string[];
            medicamentos?: string[];
            alergias?: string[];
        };
        antecedentes_familiares?: Record<string, string>;
        estilo_vida?: Record<string, string>;
        vacinacao?: string;
        conteudo?: string;
    };

    /** Quando true, o frontend deve exibir o relatório de confirmação antes de salvar */
    aguardandoConfirmacao?: boolean;
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
