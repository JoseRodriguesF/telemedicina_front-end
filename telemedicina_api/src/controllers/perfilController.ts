import { FastifyRequest, FastifyReply } from 'fastify'
import { PerfilService } from '../services/perfilService'
import { AuthenticatedUser } from '../types/shared'
import ApiError from '../utils/apiError'
import logger from '../utils/logger'
import { logAuditoria } from '../utils/auditLogger'

const perfilService = new PerfilService()

export class PerfilController {
    async getMe(request: FastifyRequest, reply: FastifyReply) {
        try {
            const user = request.user as AuthenticatedUser
            if (!user) {
                return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida' } })
            }

            const profile = await perfilService.getFullProfile(user.id)
            if (!profile) {
                return reply.code(404).send({ error: { code: 'USER_NOT_FOUND', message: 'Perfil não encontrado' } })
            }

            // Registro na trilha de auditoria (LGPD/CFM)
            await logAuditoria({
                usuarioId: user.id,
                acao: 'ACCESS_PROFILE',
                recurso: 'USUARIO',
                recursoId: user.id,
                ip: request.ip,
                userAgent: request.headers['user-agent']
            });

            // 1. Antes de qualquer serialização, capturar flags
            const medico = profile.medico as any
            let mFlags: any = null
            if (medico) {
                mFlags = {
                    tem_diploma: !!medico.diploma_url,
                    tem_especializacao: !!medico.especializacao_url,
                    tem_seguro: !!medico.seguro_responsabilidade_url,
                    vidaas_connected: !!medico.vidaas_external_id
                }
            }

            // 2. Mapeamento seguro para o resultado final
            // Usamos desestruturação para evitar problemas com tipos não-serializáveis do Prisma
            const { senha_hash, google_id, senha, registroFull, ...cleanProfile } = profile as any
            
            const result = {
                ...cleanProfile,
                registro_full: registroFull,
                nome: ''
            }

            // 3. Injetar flags e dados específicos por tipo
            if (result.medico && mFlags) {
                result.medico = { ...result.medico, ...mFlags }
                // Remover campos binários legados se existirem
                delete result.medico.diploma_data
                delete result.medico.especializacao_data
                delete result.medico.seguro_responsabilidade_data
                
                result.nome = result.medico.nome_completo
                result.verificacao = result.medico.verificacao
                // Flag para o frontend saber se o médico precisa enviar documentos
                result.documentos_pendentes = result.medico.verificacao === 'pendente_documentos'
            } else if (result.paciente) {
                result.nome = result.paciente.nome_completo
                if (result.paciente.historiaClinicaResumo) {
                    result.paciente.historia_clinica = result.paciente.historiaClinicaResumo
                    // Nota: Não removemos o original aqui para manter consistência se o frontend esperar
                }
            }

            return reply.send(result)
        } catch (error: any) {
            if (error instanceof ApiError) {
                reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } })
            } else {
                logger.error('PerfilController.getMe unexpected error', {
                    error: error.message,
                    stack: error.stack,
                    userId: (request.user as any)?.id
                })
                reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno ao carregar perfil' } })
            }
        }
    }

    async updateMe(request: FastifyRequest, reply: FastifyReply) {
        try {
            const user = request.user as AuthenticatedUser
            if (!user) {
                return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida' } })
            }

            const result = await perfilService.updateProfile(user.id, request.body)

            // Registro na trilha de auditoria (LGPD/CFM)
            await logAuditoria({
                usuarioId: user.id,
                acao: 'UPDATE_PROFILE',
                recurso: 'USUARIO',
                recursoId: user.id,
                detalhes: 'Perfil atualizado pelo próprio usuário.',
                ip: request.ip,
                userAgent: request.headers['user-agent']
            });

            reply.send(result)
        } catch (error: any) {
            if (error instanceof ApiError) {
                reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } })
            } else {
                logger.error('PerfilController.updateMe unexpected error', error)
                reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } })
            }
        }
    }

    async getDocument(request: FastifyRequest, reply: FastifyReply) {
        try {
            const user = request.user as AuthenticatedUser
            const { type } = request.params as { type: string }

            const doc = await perfilService.getDocument(user.id, type)
            if (!doc || !doc.url) {
                return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Documento não encontrado' } })
            }

            // Registro na trilha de auditoria (LGPD/CFM)
            await logAuditoria({
                usuarioId: user.id,
                acao: 'ACCESS_DOCUMENT',
                recurso: 'MEDICO_DOC',
                detalhes: `Acesso ao documento: ${type} via GCS Signed URL`,
                ip: request.ip,
                userAgent: request.headers['user-agent']
            });

            // Redireciona para a Signed URL do Google Cloud Storage
            return reply.redirect(doc.url)
        } catch (error: any) {
            if (error instanceof ApiError) {
                reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } })
            } else {
                logger.error('PerfilController.getDocument unexpected error', error)
                reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } })
            }
        }
    }

    async deleteMe(request: FastifyRequest, reply: FastifyReply) {
        try {
            const user = request.user as AuthenticatedUser
            if (!user) {
                return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida' } })
            }

            await perfilService.deleteMe(user.id)

            // Registro na trilha de auditoria (LGPD/CFM)
            await logAuditoria({
                usuarioId: user.id,
                acao: 'DELETE_ACCOUNT',
                recurso: 'USUARIO',
                recursoId: user.id,
                detalhes: 'Conta e dados excluídos a pedido do usuário.',
                ip: request.ip,
                userAgent: request.headers['user-agent']
            });

            return reply.code(200).send({ success: true, message: 'Conta excluída com sucesso.' })
        } catch (error: any) {
            if (error instanceof ApiError) {
                reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } })
            } else {
                logger.error('PerfilController.deleteMe unexpected error', error)
                reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } })
            }
        }
    }
}
