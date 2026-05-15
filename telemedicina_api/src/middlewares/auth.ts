import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../config/database'
import { AuthenticatedUser } from '../types/shared'
import { verifyJWT } from '../utils/security'
import logger from '../utils/logger'

interface JWTPayload {
  id: number
  email: string
  tipo_usuario: string
  pacienteId?: number
  medicoId?: number
}

export const authenticateJWT = async (request: FastifyRequest, reply: FastifyReply) => {
  let token: string | null = null
  const authHeader = request.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  }

  if (!token) {
    reply.code(401).send({ error: 'unauthorized', message: 'Token de acesso necessário no cabeçalho Authorization' })
    return
  }

  try {
    const decoded = verifyJWT(token) as JWTPayload

    // Otimização Extrema (Evitando DB Query no Middleware)
    // Se o token já tiver os IDs cacheados, confiamos nele e pulamos o DB.
    // Só fazemos a query no banco se for um token legado (backward compatibility) ou falhar no cache.
    let resolvedPacienteId = decoded.pacienteId || null;
    let resolvedMedicoId = decoded.medicoId || null;

    if (decoded.pacienteId === undefined && decoded.medicoId === undefined) {
      // Token antigo sem cache: realiza a query pesada
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.id },
        include: {
          paciente: { select: { id: true } },
          medico: { select: { id: true } }
        }
      });

      if (!usuario) {
        logger.warn('JWT valid but user not found (legacy token)', { userId: decoded.id });
        reply.code(401).send({ error: 'unauthorized', message: 'Usuário não encontrado' });
        return;
      }
      
      resolvedPacienteId = usuario.paciente?.id || null;
      resolvedMedicoId = usuario.medico?.id || null;
    }

    // Anexa o usuário ao request com tipo correto e IDs de perfil resolvidos instantaneamente
    request.user = {
      id: decoded.id,
      email: decoded.email,
      tipo_usuario: decoded.tipo_usuario as any,
      pacienteId: resolvedPacienteId,
      medicoId: resolvedMedicoId
    }
  } catch (error: any) {
    logger.debug('JWT verification failed', { error: error.message })
    reply.code(401).send({ error: 'unauthorized', message: 'Token inválido ou expirado' })
  }
}