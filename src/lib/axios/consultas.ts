// Buscar próxima consulta agendada
export type NextAppointment = {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  timestamp: number;
};

export async function getNextAppointment(token: string): Promise<NextAppointment | null> {
  const res = await axios.get('/proxy/consultas/agendadas', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.data) return null;
  // Ajuste conforme o backend: adapte os campos se necessário
  const appt = res.data;
  return {
    id: String(appt.id),
    doctorName: appt.doctorName || appt.medico_nome || '',
    specialty: appt.specialty || appt.especialidade || '',
    date: appt.date || appt.data_consulta || '',
    time: appt.time || appt.hora_inicio || '',
    timestamp: appt.timestamp || (appt.data_consulta && appt.hora_inicio ? new Date(`${appt.data_consulta}T${appt.hora_inicio}`).getTime() : Date.now())
  };
}
import axios from 'axios';

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
  const url = userId ? `/api/ps/salas-em-andamento?userId=${userId}` : '/api/ps/salas-em-andamento';
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as PSActiveRoom[];
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

export async function endConsulta(
  consultaId: string,
  token: string,
  hora_fim?: string
): Promise<{ ok: boolean }> {
  const body: Record<string, any> = {};
  if (hora_fim) body.hora_fim = hora_fim;
  const res = await axios.post(`/api/consultas/${consultaId}/end`, body, { headers: { Authorization: `Bearer ${token}` } });
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
  const res = await axios.get('/api/ps/historico-completo', { headers: { Authorization: `Bearer ${token}` } });
  return res.data as PSFullHistoryItem[];
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
  const res = await axios.get('/api/ps/historico', { headers: { Authorization: `Bearer ${token}` } });
  return res.data as PSHistoryResponse;
}
