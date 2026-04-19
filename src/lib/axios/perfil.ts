import axios from './config';
import { ApiError } from '@/lib/errorHandler';

export type UserProfile = {
    id: number;
    email: string;
    tipo_usuario: 'medico' | 'paciente';
    registro_full: boolean;
    paciente?: {
        id: number;
        nome_completo: string;
        data_nascimento: string;
        cpf: string;
        sexo: string;
        estado_civil: string;
        telefone: string;
        nome_mae?: string;
        peso?: number;
        altura?: number;
        telefone_responsavel?: string;
        historia_clinica?: string;
    };
    medico?: {
        id: number;
        nome_completo: string;
        data_nascimento: string;
        cpf: string;
        sexo: string;
        crm: string;
        tem_diploma?: boolean;
        tem_especializacao?: boolean;
        tem_assinatura?: boolean;
        tem_seguro?: boolean;
        diploma_url?: string;
        especializacao_url?: string;
        assinatura_digital_url?: string;
        seguro_responsabilidade_url?: string;
        telefone_celular?: string;
        avaliacao?: number;
        resumo_profissional?: string;
        especialidade?: string;
    };
    enderecos?: Array<{
        id: number;
        endereco: string;
        numero: string;
        complemento?: string;
    }>;
};

export async function getMyProfile(token: string): Promise<UserProfile> {
    try {
        const res = await axios.get('/api/usuarios/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data as UserProfile;
    } catch (err) {
        throw new ApiError(err);
    }
}

export async function updateMyProfile(token: string, data: any): Promise<{ success: boolean }> {
    try {
        const res = await axios.patch('/api/usuarios/me', data, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });
        return res.data;
    } catch (err) {
        throw new ApiError(err);
    }
}

export async function deleteMyProfile(token: string): Promise<{ success: boolean }> {
    try {
        const res = await axios.delete('/api/usuarios/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    } catch (err) {
        throw new ApiError(err);
    }
}
