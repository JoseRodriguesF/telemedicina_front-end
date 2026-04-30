import { FastifyRequest, FastifyReply } from 'fastify'
import { VidaasService } from '../services/vidaasService'
import { AuthenticatedUser } from '../types/shared'
import prisma from '../config/database'
import logger from '../utils/logger'

export class VidaasController {
    /**
     * Inicia o fluxo de autenticação Vidaas
     */
    async authenticate(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as AuthenticatedUser
        if (!user) {
            return reply.code(401).send({ error: 'Usuário não autenticado' })
        }
        
        const medico = await prisma.medico.findUnique({
            where: { usuario_id: user.id }
        })

        if (!medico) {
            return reply.code(404).send({ error: 'Perfil médico não encontrado' })
        }

        const url = VidaasService.getAuthorizeUrl(medico.id)
        return reply.send({ url })
    }

    /**
     * Callback do OAuth2 do Vidaas
     */
    async callback(request: FastifyRequest, reply: FastifyReply) {
        const { code, state } = request.query as { code: string; state: string }

        if (!code || !state) {
            return reply.code(400).send({ error: 'Código ou estado ausente' })
        }

        try {
            await VidaasService.handleCallback(code, state)
            // Redireciona de volta para o frontend
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            return reply.redirect(`${frontendUrl}/perfil?vidaas=success`)
        } catch (error) {
            logger.error('Vidaas callback controller error', error)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            return reply.redirect(`${frontendUrl}/perfil?vidaas=error`)
        }
    }

    /**
     * Verifica se o médico está conectado ao Vidaas
     */
    async checkStatus(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as AuthenticatedUser
        if (!user) {
            return reply.code(401).send({ error: 'Usuário não autenticado' })
        }
        
        const medico = await prisma.medico.findUnique({
            where: { usuario_id: user.id },
            select: { vidaas_external_id: true }
        })

        return reply.send({
            connected: !!medico?.vidaas_external_id
        })
    }
}
