// Buscar salas em andamento (consultas ativas)
export type PSActiveRoom = {
  consultaId: string;
  pacienteId: string;
  medicoId: string;
  roomId: string;
  createdAt: number;
  status: 'in_progress';
};

export async function psListActiveRooms(token: string, userId?: string): Promise<PSActiveRoom[]> {
  const url = userId ? `/api/ps/salas-em-andamento?userId=${userId}` : '/api/ps/salas-em-andamento';
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as PSActiveRoom[];
}
import axios from 'axios';

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
  const res = await axios.get('/api/consultas/aguardando', { headers: { Authorization: `Bearer ${token}` } });
  return res.data as WaitingConsulta[];
}

export async function getRoom(consultaId: string, token: string): Promise<RoomResponse> {
  const res = await axios.post(`/api/consultas/${consultaId}/room`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as RoomResponse;
}

export async function joinRoom(consultaId: string, payload: JoinPayload, token: string): Promise<ParticipantsResponse> {
  const res = await axios.post(`/api/consultas/${consultaId}/join`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as ParticipantsResponse;
}

export async function listParticipants(consultaId: string, token: string): Promise<ParticipantsResponse> {
  const res = await axios.get(`/api/consultas/${consultaId}/participants`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as ParticipantsResponse;
}

export async function endConsulta(consultaId: string, token: string): Promise<{ ok: boolean }> {
  const res = await axios.post(`/api/consultas/${consultaId}/end`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean };
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

export async function psCreateRoom(token: string): Promise<PSRoomResponse> {
  try {
    const res = await axios.post(`/api/ps/rooms`, {}, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as PSRoomResponse;
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Falha ao criar sala';
    throw new Error(msg);
  }
}

export async function psListFila(token: string): Promise<PSFilaItem[]> {
  const res = await axios.get(`/api/ps/fila`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as PSFilaItem[];
}

export async function psClaim(consultaId: string, token: string): Promise<PSRoomResponse> {
  const res = await axios.post(`/api/ps/fila/${consultaId}/claim`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as PSRoomResponse;
}
