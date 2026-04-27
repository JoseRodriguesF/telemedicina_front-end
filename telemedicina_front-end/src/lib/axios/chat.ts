import axios from './config';
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

/**
 * Confirma a triagem e salva a história clínica no banco.
 * Chamado após o paciente revisar e aprovar o relatório.
 */
export async function confirmTriagem(
  dadosEstruturados: ChatIAResponse['dadosEstruturados'],
  token: string
): Promise<{ ok: boolean; historiaClinicaSalva: boolean; historiaClinicaId?: number }> {
  try {
    const res = await axios.post(`${CHAT_IA_URL}/confirmar`, { dadosEstruturados }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  } catch (err) {
    throw new ApiError(err);
  }
}

