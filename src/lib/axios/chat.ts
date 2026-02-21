import axios from 'axios';
import type { ChatIAResponse, ChatHistory } from '@/types/chat';
import { ApiError } from '@/lib/errorHandler';

/** URL do chat-ia via proxy do Next.js (evita CORS em produção). */
const CHAT_IA_URL = '/api/chat-ia';

export type SendChatMessagePayload = {
  message: string;
  history?: ChatHistory;
};

/**
 * Envia uma mensagem para a IA de triagem.
 * Usa sempre o proxy /api/chat-ia para que o Next.js encaminhe ao backend,
 * evitando CORS quando o front está em outro domínio (ex: Vercel).
 */
export async function sendChatMessage(
  payload: SendChatMessagePayload,
  token: string
): Promise<ChatIAResponse> {
  try {
    const res = await axios.post(CHAT_IA_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data as ChatIAResponse;
  } catch (err) {
    throw new ApiError(err);
  }
}
