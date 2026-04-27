import axios from 'axios';
import { storageService, StorageService } from './storageService';
import prisma from '../config/database';
import logger from '../utils/logger';

export class MevoService {
    /**
     * Processa o evento EMISSION do Webhook da Mevo.
     * Baixa os PDFs (que expiram em 10 min) e salva no nosso GCS.
     */
    static async handleEmission(payload: any) {
        const { idPrescricao, Documentos, Paciente } = payload;
        
        logger.info('Processando EMISSION da Mevo', { idPrescricao });

        // Tenta localizar a consulta vinculada (Pela ReferenciaInterna ou pelo CPF do paciente se necessário)
        // No "Iniciar", enviaremos o consultaId como ReferenciaInterna.
        const consultaId = Number(payload.ReferenciaInterna);
        if (isNaN(consultaId)) {
            logger.error('ReferenciaInterna inválida no webhook da Mevo', { payload });
            return;
        }

        if (!Documentos || !Array.isArray(Documentos)) return;

        for (const doc of Documentos) {
            try {
                // 1. Download do PDF da Mevo
                const response = await axios.get(doc.URL, { responseType: 'arraybuffer' });
                const pdfBuffer = Buffer.from(response.data);

                // 2. Upload para o nosso GCS
                const fileName = `${doc.TipoDocumento}_${idPrescricao}.pdf`;
                const gcsPath = StorageService.buildPrescricaoPath(consultaId, fileName);
                
                await storageService.uploadDocument(pdfBuffer, gcsPath, 'application/pdf');

                // 3. Registrar na tabela de Prescricao
                await prisma.prescricao.create({
                    data: {
                        consultaId,
                        mevoId: String(idPrescricao),
                        mevoStatus: 'EMITIDA',
                        medicamento: doc.TipoDocumento, // Nome genérico para o doc
                        dosagem: 'Ver PDF',
                        frequencia: 'Ver PDF',
                        duracao: 'Ver PDF',
                        pdf_url: gcsPath,
                        pdf_mimetype: 'application/pdf'
                    }
                });

                logger.info('Documento Mevo salvo com sucesso', { idPrescricao, gcsPath });
            } catch (error) {
                logger.error('Erro ao processar documento individual da Mevo', { idPrescricao, error });
            }
        }
    }

    static async handleCancel(payload: any) {
        const { idPrescricao } = payload;
        await prisma.prescricao.updateMany({
            where: { mevoId: String(idPrescricao) },
            data: { mevoStatus: 'CANCELADA' }
        });
    }
}
