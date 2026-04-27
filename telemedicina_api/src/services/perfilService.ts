import prisma from '../config/database'
import ApiError from '../utils/apiError'
import { sanitizeText, sanitizePhone, sanitizeCPF } from '../utils/security'
import { storageService, StorageService } from './storageService'
import logger from '../utils/logger'

export class PerfilService {
    async getFullProfile(usuarioId: number) {
        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            include: {
                paciente: true,
                medico: true,
                enderecos: true,
            }
        })

        if (!usuario) {
            throw new ApiError('Usuário não encontrado.', 404, 'USER_NOT_FOUND')
        }

        return usuario
    }

    async updateProfile(usuarioId: number, data: any) {
        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            include: { paciente: true, medico: true }
        })

        if (!usuario) {
            throw new ApiError('Usuário não encontrado.', 404, 'USER_NOT_FOUND')
        }

        // Update business logic based on role
        const isMedico = usuario.tipo_usuario === 'medico'
        const isPaciente = usuario.tipo_usuario === 'paciente'

        try {
            return await prisma.$transaction(async (tx) => {
                // 1. Update Usuario (email)
                if (data.email) {
                    const existing = await tx.usuario.findUnique({ where: { email: data.email } })
                    if (existing && existing.id !== usuarioId) {
                        throw new ApiError('Email já está em uso.', 409, 'EMAIL_ALREADY_EXISTS')
                    }
                    await tx.usuario.update({
                        where: { id: usuarioId },
                        data: { email: data.email }
                    })
                }

                // 2. Update Patient or Doctor data
                if (isPaciente && usuario.paciente) {
                    const updateData: any = {}
                    if (data.nome_completo) updateData.nome_completo = sanitizeText(data.nome_completo)
                    if (data.telefone) updateData.telefone = sanitizePhone(data.telefone)
                    if (data.sexo) updateData.sexo = data.sexo
                    if (data.estado_civil) updateData.estado_civil = data.estado_civil
                    if (data.data_nascimento) updateData.data_nascimento = new Date(data.data_nascimento)
                    if (data.nome_mae) updateData.nome_mae = sanitizeText(data.nome_mae)
                    if (data.peso !== undefined) updateData.peso = data.peso
                    if (data.altura !== undefined) updateData.altura = data.altura
                    if (data.historia_clinica) updateData.historiaClinicaResumo = sanitizeText(data.historia_clinica)

                    if (Object.keys(updateData).length > 0) {
                        await tx.paciente.update({
                            where: { id: usuario.paciente.id },
                            data: updateData
                        })
                    }
                } else if (isMedico && usuario.medico) {
                    const updateData: any = {}
                    if (data.nome_completo) updateData.nome_completo = sanitizeText(data.nome_completo)
                    if (data.sexo) updateData.sexo = data.sexo
                    if (data.data_nascimento) updateData.data_nascimento = new Date(data.data_nascimento)
                    if (data.telefone_celular) updateData.telefone_celular = sanitizePhone(data.telefone_celular)
                    if (data.rqe) updateData.rqe = data.rqe
                    if (data.resumo_profissional) updateData.resumo_profissional = sanitizeText(data.resumo_profissional)

                    // Documentos em Cloud Storage (GCS) com Signed URLs
                    if (data.diploma && data.diploma.data) {
                        const path = StorageService.buildPath(usuarioId, 'diploma', data.diploma.mimetype)
                        await storageService.uploadDocument(Buffer.from(data.diploma.data, 'base64'), path, data.diploma.mimetype)
                        updateData.diploma_url = path
                    }
                    if (data.especializacao && data.especializacao.data) {
                        const path = StorageService.buildPath(usuarioId, 'especializacao', data.especializacao.mimetype)
                        await storageService.uploadDocument(Buffer.from(data.especializacao.data, 'base64'), path, data.especializacao.mimetype)
                        updateData.especializacao_url = path
                    }
                    if (data.assinatura_digital && data.assinatura_digital.data) {
                        const path = StorageService.buildPath(usuarioId, 'assinatura_digital', data.assinatura_digital.mimetype)
                        await storageService.uploadDocument(Buffer.from(data.assinatura_digital.data, 'base64'), path, data.assinatura_digital.mimetype)
                        updateData.assinatura_digital_url = path
                    }
                    if (data.seguro_responsabilidade && data.seguro_responsabilidade.data) {
                        const path = StorageService.buildPath(usuarioId, 'seguro_responsabilidade', data.seguro_responsabilidade.mimetype)
                        await storageService.uploadDocument(Buffer.from(data.seguro_responsabilidade.data, 'base64'), path, data.seguro_responsabilidade.mimetype)
                        updateData.seguro_responsabilidade_url = path
                    }

                    if (Object.keys(updateData).length > 0) {
                        await tx.medico.update({
                            where: { id: usuario.medico.id },
                            data: updateData
                        })
                    }
                }

                // 3. Update Address
                if (data.endereco) {
                    const mainAddress = await tx.endereco.findFirst({
                        where: { usuario_id: usuarioId }
                    })

                    const addrData: any = {
                        endereco: sanitizeText(data.endereco.endereco),
                        numero: String(data.endereco.numero),
                        complemento: data.endereco.complemento ? sanitizeText(data.endereco.complemento) : null,
                        bairro: data.endereco.bairro ? sanitizeText(data.endereco.bairro) : null,
                        cep: data.endereco.cep ? sanitizePhone(data.endereco.cep) : null,
                        cidade: data.endereco.cidade ? sanitizeText(data.endereco.cidade) : null,
                        estado: data.endereco.estado ? data.endereco.estado.toUpperCase().slice(0, 2) : null
                    }

                    if (mainAddress) {
                        await tx.endereco.update({
                            where: { id: mainAddress.id },
                            data: addrData
                        })
                    } else {
                        await tx.endereco.create({
                            data: {
                                usuario_id: usuarioId,
                                ...addrData
                            }
                        })
                    }
                }

                return { success: true }
            })
        } catch (error: any) {
            if (error instanceof ApiError) throw error
            logger.error('Failed to update profile', error, { usuarioId })
            throw new ApiError('Erro ao atualizar perfil.', 500, 'INTERNAL_ERROR')
        }
    }

    async getDocument(usuarioId: number, type: string) {
        const medico = await prisma.medico.findUnique({
            where: { usuario_id: usuarioId }
        })

        if (!medico) {
            throw new ApiError('Perfil médico não encontrado.', 404, 'USER_NOT_FOUND')
        }

        let gcsPath: string | null = null

        switch (type) {
            case 'diploma':
                gcsPath = medico.diploma_url
                break
            case 'especializacao':
                gcsPath = medico.especializacao_url
                break
            case 'assinatura':
                gcsPath = medico.assinatura_digital_url
                break
            case 'seguro':
                gcsPath = medico.seguro_responsabilidade_url
                break
            default:
                throw new ApiError('Tipo de documento inválido.', 400, 'INVALID_TYPE')
        }

        if (!gcsPath) {
            throw new ApiError('Documento não encontrado ou ainda não enviado.', 404, 'NOT_FOUND')
        }

        // Retorna a URL assinada para o controlador redirecionar ou enviar
        const signedUrl = await storageService.getSignedUrl(gcsPath)
        return { url: signedUrl }
    }

    async deleteMe(usuarioId: number) {
        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            include: { paciente: true, medico: true }
        })

        if (!usuario) {
            throw new ApiError('Usuário não encontrado.', 404, 'USER_NOT_FOUND')
        }

        try {
            // Nota: Em um sistema de telemedicina real, os prontuários (Consultas) 
            // devem ser guardados por 20 anos (CFM). Aqui faremos a exclusão 
            // física para atender à solicitação de "exclusão de dados", 
            // mas em produção o ideal seria a anonimização (LGPD).
            
            await prisma.usuario.delete({
                where: { id: usuarioId }
            })

            logger.info('Account deleted', { usuarioId })
            return { success: true }
        } catch (error: any) {
            logger.error('Failed to delete account', error, { usuarioId })
            throw new ApiError('Erro ao excluir conta.', 500, 'INTERNAL_ERROR')
        }
    }
}
