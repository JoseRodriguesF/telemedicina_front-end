// Tipos de status de consulta
export type ConsultaStatus = 'solicitada' | 'agendada' | 'in_progress' | 'finished' | 'cancelled';

import axios from 'axios';
import { ApiError } from '@/lib/errorHandler';

// Buscar consultas agendadas
export type ConsultaAgendada = {
  id: number;
  medicoId: number;
  pacienteId: number;
  status: ConsultaStatus;
  data_consulta: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm:ss ou ISO
  hora_fim: string | null;
  createdAt: string;
  updatedAt: string;
  medico: {
    id: number;
    nome_completo: string;
  };
  paciente: {
    id: number;
    nome_completo: string;
  };
};

export async function getConsultasAgendadas(token: string): Promise<ConsultaAgendada[]> {
  try {
    const res = await axios.get('/api/consultas/agendadas', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return (res.data || []) as ConsultaAgendada[];
  } catch (err) {
    throw new ApiError(err);
  }
}

/**
 * Schedule a new appointment
 * POST /api/consultas/agendar
 */
export type AgendarConsultaPayload = {
  medico_id: number;
  paciente_id: number;
  data_consulta: string; // format: YYYY-MM-DD or DD/MM/YYYY
  hora_inicio: string; // format: HH:mm
};

export type AgendarConsultaResponse = {
  message?: string;
  consultaId?: number;
  id?: number;
  ok?: boolean;
};

export async function agendarConsulta(payload: AgendarConsultaPayload, token: string): Promise<AgendarConsultaResponse> {
  try {
    // IMPORTANTE: Prisma espera DateTime ISO-8601, NÃO time
    // O schema do backend define hora_inicio como DateTime
    const { data_consulta, hora_inicio, ...rest } = payload;

    // Combinar data (YYYY-MM-DD) + hora (HH:mm) em DateTime ISO-8601
    // Exemplo: "2026-01-30" + "14:00" = "2026-01-30T14:00:00.000Z"
    const dateTimeString = `${data_consulta}T${hora_inicio}:00.000Z`;

    const transformedPayload = {
      ...rest,
      data_consulta: data_consulta,
      hora_inicio: dateTimeString,  // DateTime ISO-8601: "2026-01-30T14:00:00.000Z"
    };

    const res = await axios.post('/api/consultas/agendar', transformedPayload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    return res.data as AgendarConsultaResponse;
  } catch (err) {
    throw new ApiError(err);
  }
}

/**
 * Confirm a requested appointment (change status from 'solicitada' to 'agendada')
 * PATCH /api/consultas/:id/confirmar
 */
export async function confirmarConsulta(consultaId: number, token: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await axios.patch(`/api/consultas/${consultaId}/confirmar`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data as { ok: boolean; message?: string };
  } catch (err) {
    throw new ApiError(err);
  }
}

/**
 * Cancel an appointment
 * DELETE /api/consultas/:id
 */
export async function cancelarConsulta(consultaId: number, token: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await axios.delete(`/api/consultas/${consultaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data as { ok: boolean; message?: string };
  } catch (err) {
    throw new ApiError(err);
  }
}

// Buscar salas em andamento (consultas ativas)
export type PSActiveRoom = {
  consultaId: string;
  pacienteId: string;
  medicoId: string;
  roomId: string;
  createdAt: number;
  status: 'in_progress';
  pacienteNome?: string;
  medicoNome?: string;
};

export async function psListActiveRooms(token: string, userId?: string): Promise<PSActiveRoom[]> {
  try {
    const url = userId ? `/api/ps/salas-em-andamento?userId=${userId}` : '/api/ps/salas-em-andamento';
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as PSActiveRoom[];
  } catch (err) {
    throw new ApiError(err);
  }
}

export type IceServer = {
  urls: string[];
  username?: string;
  credential?: string;
};

export type RoomResponse = {
  roomId: string;
  iceServers: IceServer[];
};

export type JoinPayload = {
  userId: number;
  role: 'medico' | 'paciente';
};

export type ParticipantsResponse = {
  roomId: string;
  participants: Array<JoinPayload>;
};

export type WaitingConsulta = {
  id: string; // consultaId
  nome: string; // nome do paciente
  status: 'aguardando' | 'em_consulta' | 'concluido' | 'cancelado';
  prioridade?: 'alta' | 'normal' | 'baixa';
};

export async function listWaitingConsultas(token: string): Promise<WaitingConsulta[]> {
  try {
    const res = await axios.get('/api/consultas/aguardando', { headers: { Authorization: `Bearer ${token}` } });
    return res.data as WaitingConsulta[];
  } catch (err) {
    throw new ApiError(err);
  }
}

export async function getRoom(consultaId: string, token: string): Promise<RoomResponse> {
  try {
    const res = await axios.post(`/api/consultas/${consultaId}/room`, {}, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as RoomResponse;
  } catch (err) {
    throw new ApiError(err);
  }
}

export async function joinRoom(consultaId: string, payload: JoinPayload, token: string): Promise<ParticipantsResponse> {
  try {
    const res = await axios.post(`/api/consultas/${consultaId}/join`, payload, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as ParticipantsResponse;
  } catch (err) {
    throw new ApiError(err);
  }
}

export async function listParticipants(consultaId: string, token: string): Promise<ParticipantsResponse> {
  try {
    const res = await axios.get(`/api/consultas/${consultaId}/participants`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as ParticipantsResponse;
  } catch (err) {
    throw new ApiError(err);
  }
}

export async function endConsulta(
  consultaId: string,
  token: string,
  hora_fim?: string
): Promise<{ ok: boolean }> {
  try {
    const body: Record<string, any> = {};
    if (hora_fim) body.hora_fim = hora_fim;
    const res = await axios.post(`/api/consultas/${consultaId}/end`, body, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as { ok: boolean };
  } catch (err) {
    throw new ApiError(err);
  }
}

// Pronto Socorro (PS) endpoints
export type PSFilaItem = {
  consultaId: string;
  pacienteId: string;
  roomId?: string;
  createdAt: string;
  status: 'scheduled' | 'in_progress' | 'finished';
};

export type PSRoomResponse = {
  roomId: string;
  consultaId: string;
  iceServers: IceServer[];
};

export async function psCreateRoom(
  token: string,
  options?: {
    data_consulta?: string;
    hora_inicio?: string;
    hora_fim?: string;
  }
): Promise<PSRoomResponse> {
  try {
    const body: Record<string, any> = {};
    if (options?.data_consulta) body.data_consulta = options.data_consulta;
    if (options?.hora_inicio) body.hora_inicio = options.hora_inicio;
    if (options?.hora_fim) body.hora_fim = options.hora_fim;
    const res = await axios.post(`/api/ps/rooms`, body, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as PSRoomResponse;
  } catch (err) {
    throw new ApiError(err);
  }
}

export async function psListFila(token: string): Promise<PSFilaItem[]> {
  try {
    const res = await axios.get(`/api/ps/fila`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as PSFilaItem[];
  } catch (err) {
    throw new ApiError(err);
  }
}

export async function psClaim(consultaId: string, token: string): Promise<PSRoomResponse> {
  try {
    const res = await axios.post(`/api/ps/fila/${consultaId}/claim`, {}, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as PSRoomResponse;
  } catch (err) {
    throw new ApiError(err);
  }
}

export type PSFullHistoryItem = {
  id: number;
  status: string;
  createdAt: string;
  medico: {
    nome_completo: string;
  };
  paciente: {
    nome_completo: string;
  };
};

export async function psGetFullHistory(token: string): Promise<PSFullHistoryItem[]> {
  try {
    const res = await axios.get('/api/ps/historico-completo', { headers: { Authorization: `Bearer ${token}` } });
    return res.data as PSFullHistoryItem[];
  } catch (err) {
    throw new ApiError(err);
  }
}

export type PSHistoryResponse = {
  count: number;
  lastConsulta: {
    id: number;
    status: string;
    createdAt: string;
    medico: {
      nome_completo: string;
    };
    paciente: {
      nome_completo: string;
    };
  } | null;
};

export async function psGetHistory(token: string): Promise<PSHistoryResponse> {
  try {
    const res = await axios.get('/api/ps/historico', { headers: { Authorization: `Bearer ${token}` } });
    return res.data as PSHistoryResponse;
  } catch (err) {
    throw new ApiError(err);
  }
}
