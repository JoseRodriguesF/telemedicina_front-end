import axios from 'axios';
import logger from '../utils/logger';
import ApiError from '../utils/apiError';

export interface CRMData {
    nome: string;
    numero: string;
    uf: string;
    situacao: string;
    profissao: string;
}

export class VerificationService {
    /**
     * Valida um CRM oficial através da BrasilAPI (Conselho Federal de Medicina)
     */
    static async verifyCRM(crm: string, uf: string): Promise<CRMData> {
        try {
            logger.info('Consultando CRM na BrasilAPI', { crm, uf });
            const response = await axios.get(`https://brasilapi.com.br/api/crm/v1/${crm}`, {
                params: { uf }
            });

            if (response.status !== 200 || !response.data) {
                throw new Error('CRM não localizado na base oficial');
            }

            // O retorno da BrasilAPI costuma ser um array de médicos encontrados
            // Se for um objeto direto, ajustamos.
            const data = Array.isArray(response.data) ? response.data[0] : response.data;

            if (!data) {
                throw new Error('Médico não localizado no CFM para este CRM/UF');
            }

            return {
                nome: data.nome,
                numero: data.numero,
                uf: data.uf,
                situacao: data.situacao,
                profissao: data.profissao
            };
        } catch (error: any) {
            if (error.response && error.response.status === 404) {
                logger.warn('CRM não encontrado na BrasilAPI', { crm, uf });
                throw new ApiError('CRM não localizado no Conselho Federal de Medicina.', 404, 'CRM_NOT_FOUND');
            }
            logger.error('Erro na consulta da BrasilAPI', error);
            throw new ApiError('Falha ao validar CRM com a base oficial. Tente novamente mais tarde.', 503, 'VERIFICATION_SERVICE_UNAVAILABLE');
        }
    }

    /**
     * Placeholder para validação de CPF (LGPD impede consulta gratuita direta por nome)
     * Atualmente faz o checksum. Poderia plugar Serpro/Dataprev/Cofre.io aqui.
     */
    static async verifyCPF(cpf: string): Promise<void> {
        // Por enquanto, confiamos no validateCPF() que faz o checksum.
        // Em um setup real, aqui faríamos a chamada à Serpro.
        return Promise.resolve();
    }
}
