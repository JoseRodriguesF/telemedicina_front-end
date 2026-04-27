import axios from './config';
import { ApiError } from '@/lib/errorHandler';

// Tipos de status de consulta
export type ConsultaStatus = 'solicitada' | 'agendada' | 'scheduled' | 'in_progress' | 'finished' | 'cancelled' | 'expired';

// Comuns
export type IceServer = {
  urls: string[];
  username?: string;
  credential?: string;
};

// Agendamento
export type AgendarConsultaPayload = {
  medico_id: number;
  paciente_id: number;
  data_consulta: string; // format: YYYY-MM-DD or DD/MM/YYYY
  hora_inicio: string; // format: HH:mm
  historiaClinicaId?: number;
};

export type AgendarConsultaResponse = {
  message?: string;
  consultaId?: number;
  id?: number;
  ok?: boolean;
};

export async function agendarConsulta(payload: AgendarConsultaPayload, token: string): Promise<AgendarConsultaResponse> {
  try {
    // IMPORTANTE: Prisma espera DateTime ISO-8601
    const { data_consulta, hora_inicio, ...rest } = payload;

    // Constrói a data assumindo que o input do usuário É em horário de Brasília (-03:00)
    // independentemente de onde o navegador esteja rodando.
    const isoBrasilia = `${data_consulta}T${hora_inicio}:00-03:00`;
    const dateObj = new Date(isoBrasilia);

    // Se a data for inválida (ex: input mal formatado), fallback para local (não ideal, mas seguro contra crash)
    // mas teoricamente os validators já garantiram YYYY-MM-DD e HH:mm
    const finalDate = isNaN(dateObj.getTime())
      ? new Date(`${data_consulta}T${hora_inicio}:00`)
      : dateObj;

    const transformedPayload = {
      ...rest,
      data_consulta: data_consulta, // Mantém YYYY-MM-DD
      hora_inicio: finalDate.toISOString(), // Envia o ponto exato no tempo em UTC (Ex: 10:00 BRT -> 13:00 UTC)
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

export type ConsultaAgendada = {
  id: number;
  medicoId: number;
  pacienteId: number;
  status: ConsultaStatus;
  data_consulta: string;
  hora_inicio: string;
  hora_fim: string | null;
  createdAt: string;
  updatedAt: string;
  medico: {
    id: number;
    nome_completo: string;
  } | null;
  paciente: {
    id: number;
    nome_completo: string;
  } | null;
  historiaClinica?: HistoriaClinicaItem[];
  // Novos campos estruturais
  repouso?: string;
  destino_final?: string;
  especialidade_seguimento?: string;
  ambulancia_endereco?: string;
  ambulancia_complemento?: string;
  ambulancia_info?: string;
  ambulancia_telefone?: string;
  diagnostico?: string;
  evolucao?: string;
  plano_terapeutico?: string;
  resumo_consulta?: string;
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

export async function confirmarConsulta(consultaId: number, token: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await axios.patch(`/api/consultas/${consultaId}/confirmar`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    throw new ApiError(err);
  }
}

export async function cancelarConsulta(consultaId: number, token: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await axios.delete(`/api/consultas/${consultaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    throw new ApiError(err);
  }
}

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

export type ConsultaDetails = {
  id: number;
  medicoId: number | null;
  pacienteId: number;
  status: ConsultaStatus;
  data_consulta?: string;
  hora_inicio?: string;
  hora_fim?: string;
  createdAt: string;
  updatedAt: string;
  paciente: {
    id: number;
    nome_completo: string;
    cpf: string;
    sexo: string;
    data_nascimento: string;
    telefone: string;
    notas?: string;
  } | null;
  historiaClinica?: HistoriaClinicaItem;
  // Novos campos estruturais
  repouso?: string;
  destino_final?: string;
  especialidade_seguimento?: string;
  ambulancia_endereco?: string;
  ambulancia_complemento?: string;
  ambulancia_info?: string;
  ambulancia_telefone?: string;
  diagnostico?: string;
  evolucao?: string;
  plano_terapeutico?: string;
  resumo_consulta?: string;
  observacaoTecnica?: string;
  anexos?: ConsultaAnexo[];
};

export type ConsultaAnexo = {
  id: number;
  consultaId: number | string;
  url?: string; // Mantido para compatibilidade no frontend, mas será gerado dinamicamente
  nome?: string;
  tipo_mime?: string;
  createdAt?: string;
};

export async function getConsulta(consultaId: string, token: string): Promise<ConsultaDetails> {
  try {
    const res = await axios.get(`/api/consultas/${consultaId}`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as ConsultaDetails;
  } catch (err) {
    throw new ApiError(err);
  }
}

// Salas
export type RoomResponse = {
  roomId: string;
  iceServers: IceServer[];
};

export async function getRoom(consultaId: string, token: string): Promise<RoomResponse> {
  try {
    const res = await axios.post(`/api/consultas/${consultaId}/room`, {}, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as RoomResponse;
  } catch (err) {
    throw new ApiError(err);
  }
}

export type JoinPayload = {
  userId: number;
  role: 'medico' | 'paciente';
};

export type ParticipantsResponse = {
  roomId: string;
  participants: Array<JoinPayload>;
};

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

export type EndConsultaData = {
  repouso?: string;
  destino_final?: string;
  especialidade_seguimento?: string;
  diagnostico?: string;
  evolucao?: string;
  plano_terapeutico?: string;
  resumo_consulta?: string;
  ambulancia_endereco?: string;
  ambulancia_complemento?: string;
  ambulancia_info?: string;
  ambulancia_telefone?: string;
  // Campo estruturado (frontend-only, será desestruturado antes do envio)
  endereco_ambulancia?: {
    endereco?: string;
    complemento?: string;
    informacoes_adicionais?: string;
    telefone?: string;
  };
};

export async function endConsulta(
  consultaId: string,
  token: string,
  hora_fim?: string,
  data?: EndConsultaData
): Promise<{ ok: boolean }> {
  try {
    const body: Partial<EndConsultaData & { hora_fim: string }> = {};
    if (hora_fim) body.hora_fim = hora_fim;
    if (data) {
      // Desestrutura o campo endereco_ambulancia (objeto do frontend)
      // nos campos planos que o backend espera
      const { endereco_ambulancia, ...rest } = data;
      Object.assign(body, rest);
      if (endereco_ambulancia) {
        if (endereco_ambulancia.endereco) body.ambulancia_endereco = endereco_ambulancia.endereco;
        if (endereco_ambulancia.complemento) body.ambulancia_complemento = endereco_ambulancia.complemento;
        if (endereco_ambulancia.informacoes_adicionais) body.ambulancia_info = endereco_ambulancia.informacoes_adicionais;
        if (endereco_ambulancia.telefone) body.ambulancia_telefone = endereco_ambulancia.telefone;
      }
    }
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
  pacienteNome?: string;
  roomId?: string;
  createdAt: string;
  status: ConsultaStatus;
  historiaClinica?: HistoriaClinicaItem[];
};

export type PSRoomResponse = {
  roomId: string;
  consultaId: string;
  iceServers: IceServer[];
};

export type PSCreateRoomOptions = {
  data_consulta?: string;
  hora_inicio?: string;
  hora_fim?: string;
  historiaClinicaId?: number;
};

export async function psCreateRoom(
  token: string,
  options?: PSCreateRoomOptions
): Promise<PSRoomResponse> {
  try {
    const body: Partial<PSCreateRoomOptions> = {};
    if (options?.data_consulta) body.data_consulta = options.data_consulta;
    if (options?.hora_inicio) body.hora_inicio = options.hora_inicio;
    if (options?.hora_fim) body.hora_fim = options.hora_fim;
    if (options?.historiaClinicaId) body.historiaClinicaId = options.historiaClinicaId;

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

// História Clínica
export type HistoriaClinicaItem = {
  id: number;
  conteudo: string;
  queixaPrincipal?: string;
  descricaoSintomas?: string;
  historicoPessoal?: any;
  antecedentesFamiliares?: any;
  estiloVida?: any;
};

export type HistoriaClinicaDetails = HistoriaClinicaItem;

export async function getHistoriaClinica(id: number, token: string): Promise<HistoriaClinicaDetails> {
  try {
    const res = await axios.get(`/api/historias-clinicas/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as HistoriaClinicaDetails;
  } catch (err) {
    throw new ApiError(err);
  }
}

export type PSFullHistoryItem = {
  id: number;
  status: string;
  createdAt: string;
  pacienteId?: number;
  medicoId?: number;
  data_consulta?: string;
  hora_inicio?: string;
  hora_fim?: string;
  diagnostico?: string;
  evolucao?: string;
  plano_terapeutico?: string;
  destino_final?: string;
  repouso?: string;
  especialidade_seguimento?: string;
  ambulancia_endereco?: string;
  ambulancia_complemento?: string;
  ambulancia_info?: string;
  ambulancia_telefone?: string;
  resumo_consulta?: string;
  medico: {
    nome_completo: string;
  } | null;
  paciente: {
    nome_completo: string;
    cpf?: string;
  } | null;
  prescricoes: any[]; // Pode trocar por Prescricao[] se importar do outro lib
  historiaClinica?: HistoriaClinicaItem[];
  anexos?: ConsultaAnexo[];
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

/**
 * Busca o histórico de consultas de um paciente específico
 */
export async function getHistoricoConsultasPaciente(pacienteId: number, token: string): Promise<PSFullHistoryItem[]> {
  try {
    const res = await axios.get(`/api/ps/historico-completo?pacienteId=${pacienteId}`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as PSFullHistoryItem[];
  } catch (err) {
    throw new ApiError(err);
  }
}
/**
 * Registra a avaliação de uma consulta pelo paciente
 */
export async function avaliarConsulta(
  consultaId: string,
  token: string,
  payload: { estrelas: number; avaliacao?: string }
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await axios.post(`/api/consultas/${consultaId}/avaliacao`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    throw new ApiError(err);
  }
}

/**
 * Busca consultas no histórico por nome (médico ou paciente)
 * @param searchTerm - Termo de busca (nome do médico ou paciente)
 * @param token - Token de autenticação
 */
export async function searchHistoricoConsultas(
  searchTerm: string,
  token: string
): Promise<PSFullHistoryItem[]> {
  try {
    const res = await axios.get(`/api/ps/historico-completo/search?q=${encodeURIComponent(searchTerm)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data as PSFullHistoryItem[];
  } catch (err) {
    throw new ApiError(err);
  }
}

/**
 * Atualiza as notas exclusivas do médico sobre o paciente
 */
export async function updatePacienteNotas(
  consultaId: string,
  token: string,
  notas: string
): Promise<{ ok: boolean }> {
  try {
    const res = await axios.patch(`/api/consultas/${consultaId}/paciente/notas`, { notas }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    throw new ApiError(err);
  }
}

/**
 * Envia uma lista de arquivos (em Base64) anexados para uma consulta para serem salvos no banco
 */
export async function enviarAnexosConsulta(
  consultaId: string | number,
  token: string,
  anexos: Array<{ data: string; nome?: string; tipo_mime: string }>
): Promise<{ ok: boolean }> {
  try {
    const res = await axios.post(`/api/consultas/${consultaId}/anexos`, { anexos }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    throw new ApiError(err);
  }
}

/**
 * Busca a lista de anexos de uma consulta
 */
export async function listAnexosConsulta(
  consultaId: string | number,
  token: string
): Promise<ConsultaAnexo[]> {
  try {
    const res = await axios.get(`/api/consultas/${consultaId}/anexos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data as ConsultaAnexo[];
  } catch (err) {
    throw new ApiError(err);
  }
}

/**
 * Faz o download seguro de um anexo usando o token no header (Blob)
 * Previne exposição do JWT na URL/Histórico.
 */
export async function downloadAnexo(
  anexoId: number,
  token: string,
  fileName: string = 'arquivo'
): Promise<void> {
  try {
    const response = await axios.get(`/api/consultas/anexos/${anexoId}/arquivo`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    });

    // Criar um link temporário para download do blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    throw new ApiError(err);
  }
}

/**
 * Registra um evento técnico (quedas, qualidade, erros) para fins de conformidade CFM Art. 10
 */
export async function logEventoTecnico(
  token: string,
  payload: { consultaId: number; tipo: string; status_info?: any; observacao?: string }
): Promise<{ ok: boolean }> {
  try {
    const res = await axios.post('/api/audit/tecnico', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    throw new ApiError(err);
  }
}
