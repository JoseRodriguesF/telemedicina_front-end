import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export interface Prescricao {
    id: number;
    consultaId: number;
    medicamento: string;
    marca?: string | null;
    dosagem: string;
    frequencia: string;
    duracao: string;
    inclusoConvenio: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePrescricaoData {
    consultaId: number;
    medicamento: string;
    marca?: string;
    dosagem: string;
    frequencia: string;
    duracao: string;
    inclusoConvenio?: boolean;
}

/**
 * Criar uma nova prescrição
 */
export async function createPrescricao(data: CreatePrescricaoData, token: string): Promise<Prescricao> {
    const response = await axios.post(
        `${API_URL}/prescricoes`,
        data,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );
    return response.data;
}

/**
 * Listar prescrições de uma consulta
 */
export async function getPrescricoesByConsulta(consultaId: number, token: string): Promise<Prescricao[]> {
    const response = await axios.get(
        `${API_URL}/prescricoes/consulta/${consultaId}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );
    return response.data;
}

/**
 * Atualizar uma prescrição
 */
export async function updatePrescricao(
    id: number,
    data: Partial<CreatePrescricaoData>,
    token: string
): Promise<Prescricao> {
    const response = await axios.put(
        `${API_URL}/prescricoes/${id}`,
        data,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );
    return response.data;
}

/**
 * Deletar uma prescrição
 */
export async function deletePrescricao(id: number, token: string): Promise<void> {
    await axios.delete(
        `${API_URL}/prescricoes/${id}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );
}

/**
 * Obter sugestões de medicamentos
 */
export async function getSugestoesMedicamentos(query: string, token: string): Promise<string[]> {
    const response = await axios.get(
        `${API_URL}/prescricoes/sugestoes/medicamentos`,
        {
            params: { query },
            headers: { Authorization: `Bearer ${token}` }
        }
    );
    return response.data;
}

/**
 * Obter sugestões de marcas
 */
export async function getSugestoesMarcas(query: string, token: string): Promise<string[]> {
    const response = await axios.get(
        `${API_URL}/prescricoes/sugestoes/marcas`,
        {
            params: { query },
            headers: { Authorization: `Bearer ${token}` }
        }
    );
    return response.data;
}
/**
 * Obter histórico de prescrições de um paciente
 */
export async function getPrescricoesByPaciente(pacienteId: number, token: string): Promise<Prescricao[]> {
    const response = await axios.get(
        `${API_URL}/prescricoes/paciente/${pacienteId}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );
    return response.data;
}
