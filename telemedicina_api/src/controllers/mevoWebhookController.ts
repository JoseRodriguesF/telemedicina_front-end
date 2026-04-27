import { FastifyRequest, FastifyReply } from 'fastify';
import { MevoService } from '../services/mevoService';
import logger from '../utils/logger';

export async function mevoWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        // SECURITY: Verificar token de autorização da Mevo se necessário
        // IP whitelist: 18.229.151.6
        
        const payload = request.body as any;
        const eventType = request.headers['x-mevo-event'] || payload?.DataCriacao ? 'EMISSION' : 'UNKNOWN';

        logger.info('Mevo Webhook recebido', { payload });

        if (payload.idPrescricao && payload.Documentos) {
            await MevoService.handleEmission(payload);
        } else if (payload.idPrescricao && !payload.Documentos) {
            await MevoService.handleCancel(payload);
        }

        return reply.code(201).send({ ok: true });
    } catch (error) {
        logger.error('Erro no processamento do Webhook Mevo', error);
        return reply.code(500).send({ error: 'Erro interno' });
    }
}
