import { FastifyRequest, FastifyReply } from 'fastify'
import { AuthenticatedUser } from '../types/shared'
import prisma from '../config/database'
import logger from '../utils/logger'


/**
 * Middleware para verificar se o usuário é admin
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as AuthenticatedUser
    if (!user) {
        return reply.code(401).send({ error: 'unauthorized', message: 'Autenticação necessária' })
    }

    if (user.tipo_usuario !== 'admin') {
        return reply.code(403).send({
            error: 'forbidden_admin_only',
            message: 'Apenas administradores podem acessar este recurso'
        })
    }
}
