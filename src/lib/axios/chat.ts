import axios from 'axios';
import type { ChatIAResponse, ChatHistory } from '@/types/chat';
import { ApiError } from '@/lib/errorHandler';

/**
 * Retorna a URL base da API.
 * Usa URL absoluta quando definida (mais confiável que o proxy do Next.js).
 */
function getChatApiUrl(): string {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (apiUrl) {
    return `${apiUrl.replace(/\/$/, '')}/chat-ia`;
  }
  return '/api/chat-ia';
}

export type SendChatMessagePayload = {
  message: string;
  history?: ChatHistory;
};

/**
 * Envia uma mensagem para a IA de triagem.
 * Usa a URL da API diretamente quando NEXT_PUBLIC_API_URL está definida,
 * evitando problemas com proxy em diferentes ambientes.
 */
export async function sendChatMessage(
  payload: SendChatMessagePayload,
  token: string
): Promise<ChatIAResponse> {
  try {
    const url = getChatApiUrl();
    const res = await axios.post(url, payload, {
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
