import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../config/database'
import { AuthenticatedUser } from '../types/shared'
import { logAuditoria } from '../utils/auditLogger'
import logger from '../utils/logger'

export class AdminController {
    /**
     * Retorna estatísticas gerais da plataforma com filtros de período
     */
    async getStats(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { ano, mes, dia, inicio, fim, periodo, range } = request.query as any
            logger.info('Gerando estatísticas admin', { ano, mes, dia, inicio, fim, periodo, range })
            
            // Construção do filtro de data base
            let dateFilter: any = {}
            const now = new Date()
            
            if (inicio && fim) {
                const startDate = new Date(inicio)
                const endDate = new Date(fim)
                endDate.setHours(23, 59, 59, 999)
                dateFilter.data_consulta = { gte: startDate, lte: endDate }
            } else if (range === 'today') {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
                dateFilter.data_consulta = { gte: start, lte: end }
            } else if (range === 'yesterday') {
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
                const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
                const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
                dateFilter.data_consulta = { gte: start, lte: end }
            } else if (range === '7days') {
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                dateFilter.data_consulta = { gte: sevenDaysAgo, lte: now }
            } else if (ano) {
                const year = parseInt(ano)
                if (isNaN(year)) throw new Error('Ano inválido')

                if (mes && periodo !== 'anual') {
                    const month = parseInt(mes) - 1
                    if (isNaN(month) || month < 0 || month > 11) throw new Error('Mês inválido')
                    
                    const startMonth = new Date(Date.UTC(year, month, 1))
                    const endMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59))
                    dateFilter.data_consulta = { gte: startMonth, lte: endMonth }
                } else {
                    const start = new Date(Date.UTC(year, 0, 1))
                    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59))
                    dateFilter.data_consulta = { gte: start, lte: end }
                }
            }

            logger.debug('Filtro de data construído', { dateFilter })

            // 1. Consultas para os gráficos (Apenas finalizadas para métricas de atendimento real)
            const chartsConsultations = await prisma.consulta.findMany({
                where: {
                    ...dateFilter,
                    status: 'finished'
                },
                select: {
                    hora_inicio: true,
                    paciente: { select: { sexo: true } },
                    medico: { select: { especialidade: true } },
                    cid: true
                }
            })

            // 2. Estatísticas Globais e Real-time
            const last24hThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000)
            const onlineThreshold = new Date(Date.now() - 120 * 60 * 1000)
            
            // Heurística de usuários online via auditoria
            const onlineUsersRaw = await prisma.trilhaAuditoria.findMany({
                where: { createdAt: { gte: onlineThreshold } },
                select: { usuarioId: true }
            })
            const uniqueOnlineIds = [...new Set(onlineUsersRaw.map(l => l.usuarioId))]

            const [
                totalPacientes, 
                totalMedicos, 
                totalConsultasFiltradas,
                ongoingConsultations,
                queuePatients,
                finished24h,
                cancelled24h,
                onlineDoctorsCount,
                onlinePatientsCount
            ] = await Promise.all([
                prisma.paciente.count(),
                prisma.medico.count(),
                prisma.consulta.count({ where: dateFilter }),
                prisma.consulta.count({ where: { status: 'in_progress' } }),
                prisma.consulta.count({ where: { status: 'solicitada' } }),
                prisma.consulta.count({ where: { status: 'finished', createdAt: { gte: last24hThreshold } } }),
                prisma.consulta.count({ where: { status: 'cancelled', createdAt: { gte: last24hThreshold } } }),
                prisma.usuario.count({ where: { id: { in: uniqueOnlineIds }, tipo_usuario: 'medico' } }),
                prisma.usuario.count({ where: { id: { in: uniqueOnlineIds }, tipo_usuario: 'paciente' } })
            ])

            // 3. Processamento de Gráficos (Especialidade, CID, Horários)
            const hourlyStats: Record<number, number> = {}
            for (let i = 0; i < 24; i++) hourlyStats[i] = 0

            const specialtyGenderStats: Record<string, Record<string, number>> = {}
            const cidStats: Record<string, number> = {}

            chartsConsultations.forEach(c => {
                if (c.hora_inicio) {
                    const dateObj = new Date(c.hora_inicio)
                    if (!isNaN(dateObj.getTime())) {
                        const hour = dateObj.getHours()
                        hourlyStats[hour] = (hourlyStats[hour] || 0) + 1
                    }
                }

                const gender = c.paciente?.sexo || 'N/A'
                const specialty = c.medico?.especialidade || 'Geral'
                if (!specialtyGenderStats[specialty]) specialtyGenderStats[specialty] = {}
                specialtyGenderStats[specialty][gender] = (specialtyGenderStats[specialty][gender] || 0) + 1

                if (c.cid) {
                    cidStats[c.cid] = (cidStats[c.cid] || 0) + 1
                }
            })

            const formattedHourly = Object.entries(hourlyStats)
                .map(([hour, count]) => ({ hour: parseInt(hour), count }))
                .sort((a, b) => a.hour - b.hour)

            const formattedSpecialty = Object.entries(specialtyGenderStats).map(([specialty, genders]) => ({
                specialty,
                ...genders
            }))

            const formattedCids = Object.entries(cidStats)
                .map(([cid, count]) => ({ cid, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)

            // 4. Distribuição de Logs
            const logWhere: any = { createdAt: dateFilter.data_consulta }
            const { category } = request.query as any
            if (category) {
                logWhere.acao = { contains: category, mode: 'insensitive' }
            }

            const logStatsRaw = await prisma.trilhaAuditoria.findMany({
                where: logWhere,
                select: { acao: true, createdAt: true }
            })

            const logDistribution: Record<string, number> = {}
            const dailyLogDistribution: Record<string, number> = {}

            logStatsRaw.forEach(l => {
                logDistribution[l.acao] = (logDistribution[l.acao] || 0) + 1
                const day = new Date(l.createdAt).toISOString().split('T')[0]
                dailyLogDistribution[day] = (dailyLogDistribution[day] || 0) + 1
            })

            const formattedLogsDist = Object.entries(logDistribution).map(([name, value]) => ({ name, value }))
            const formattedDailyLogs = Object.entries(dailyLogDistribution)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date))

            // 5. Listagens e Crescimento
            const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            const [recentLogs, doctorsList, patientsList, newPatientsThisMonth, newDoctorsThisMonth] = await Promise.all([
                prisma.trilhaAuditoria.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
                prisma.medico.findMany({
                    take: 10,
                    select: { id: true, nome_completo: true, especialidade: true, crm: true, crm_uf: true, verificacao: true, usuario: { select: { email: true } }, _count: { select: { consultas: true } } },
                    orderBy: { consultas: { _count: 'desc' } }
                }),
                prisma.paciente.findMany({
                    take: 10,
                    select: { id: true, nome_completo: true, cpf: true, telefone: true, usuario: { select: { email: true } }, _count: { select: { consultas: true } } },
                    orderBy: { consultas: { _count: 'desc' } }
                }),
                prisma.trilhaAuditoria.count({ where: { acao: { in: ['REGISTER_PACIENTE', 'LOGIN_SUCESSO'] }, createdAt: { gte: firstDayOfMonth } } }),
                prisma.trilhaAuditoria.count({ where: { acao: { in: ['REGISTER_MEDICO', 'LOGIN_SUCESSO'] }, createdAt: { gte: firstDayOfMonth } } })
            ])

            return reply.send({
                hourly: formattedHourly,
                specialtyGender: formattedSpecialty,
                topCids: formattedCids,
                logStats: formattedLogsDist,
                dailyLogs: formattedDailyLogs,
                recentLogs: recentLogs,
                totalConsultations: totalConsultasFiltradas,
                totalPatients: totalPacientes,
                totalDoctors: totalMedicos,
                ongoingConsultations,
                queuePatients,
                finished24h,
                cancelled24h,
                newPatientsMonth: newPatientsThisMonth,
                newDoctorsMonth: newDoctorsThisMonth,
                onlineDoctors: onlineDoctorsCount,
                onlinePatients: onlinePatientsCount,
                finishedConsultationsCount: chartsConsultations.length,
                doctors: doctorsList,
                patients: patientsList
            })
        } catch (error: any) {
            logger.error('AdminController.getStats error', { 
                message: error.message, 
                stack: error.stack,
                query: request.query 
            })
            return reply.code(500).send({ 
                error: 'Erro ao gerar estatísticas',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined 
            })
        }
    }

    /**
     * Lista todos os médicos com filtros
     */
    async listMedicos(request: FastifyRequest, reply: FastifyReply) {
        const { search, status, specialty } = request.query as any
        try {
            const where: any = {}
            if (search) {
                where.OR = [
                    { nome_completo: { contains: search, mode: 'insensitive' } },
                    { crm: { contains: search, mode: 'insensitive' } },
                    { cpf: { contains: search, mode: 'insensitive' } }
                ]
            }
            if (status) where.verificacao = status
            if (specialty) where.especialidade = specialty

            const medicos = await prisma.medico.findMany({
                where,
                select: {
                    id: true,
                    nome_completo: true,
                    crm: true,
                    crm_uf: true,
                    cpf: true,
                    especialidade: true,
                    verificacao: true,
                    usuario: { select: { email: true } },
                    _count: { select: { consultas: true } }
                },
                orderBy: { nome_completo: 'asc' }
            })
            return reply.send(medicos)
        } catch (error) {
            logger.error('AdminController.listMedicos error', error)
            return reply.code(500).send({ error: 'Erro ao listar médicos' })
        }
    }

    /**
     * Lista todos os pacientes com filtros
     */
    async listPacientes(request: FastifyRequest, reply: FastifyReply) {
        const { search } = request.query as any
        try {
            const where: any = {}
            if (search) {
                where.OR = [
                    { nome_completo: { contains: search, mode: 'insensitive' } },
                    { cpf: { contains: search, mode: 'insensitive' } },
                    { telefone: { contains: search, mode: 'insensitive' } }
                ]
            }

            const pacientes = await prisma.paciente.findMany({
                where,
                select: {
                    id: true,
                    nome_completo: true,
                    cpf: true,
                    telefone: true,
                    usuario: { select: { email: true } },
                    _count: { select: { consultas: true } }
                },
                orderBy: { nome_completo: 'asc' }
            })
            return reply.send(pacientes)
        } catch (error) {
            logger.error('AdminController.listPacientes error', error)
            return reply.code(500).send({ error: 'Erro ao listar pacientes' })
        }
    }

    /**
     * Lista médicos aguardando verificação
     */
    async getPendingMedicos(request: FastifyRequest, reply: FastifyReply) {
        try {
            const medicos = await prisma.medico.findMany({
                where: { verificacao: 'analise' },
                select: {
                    id: true,
                    nome_completo: true,
                    crm: true,
                    crm_uf: true,
                    cpf: true,
                    especialidade: true,
                    usuario: { select: { email: true } },
                    verificacao: true
                }
            })
            return reply.send(medicos)
        } catch (error) {
            logger.error('AdminController.getPendingMedicos error', error)
            return reply.code(500).send({ error: 'Erro ao buscar médicos pendentes' })
        }
    }

    /**
     * Verifica ou recusa um médico
     */
    async verifyMedico(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string }
            const { status, observacao } = request.body as { status: 'verificado' | 'recusado', observacao?: string }
            const user = request.user as AuthenticatedUser

            if (!['verificado', 'recusado'].includes(status)) {
                return reply.code(400).send({ error: 'Status inválido' })
            }

            const medico = await prisma.medico.update({
                where: { id: parseInt(id) },
                data: { verificacao: status }
            })

            // Auditoria
            await logAuditoria({
                usuarioId: user.id,
                acao: status === 'verificado' ? 'APPROVE_MEDICO' : 'REJECT_MEDICO',
                recurso: 'medico',
                recursoId: medico.id,
                detalhes: `Médico ${medico.nome_completo} ${status}. Obs: ${observacao || 'Nenhuma'}`,
                ip: request.ip,
                userAgent: request.headers['user-agent']
            })

            return reply.send({ message: `Médico ${status} com sucesso`, medico })
        } catch (error) {
            logger.error('AdminController.verifyMedico error', error)
            return reply.code(500).send({ error: 'Erro ao processar verificação' })
        }
    }

    /**
     * Retorna documento de um médico para verificação
     */
    async getMedicoDocument(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id, type } = request.params as { id: string, type: string }
            const medicoId = parseInt(id)

            const medico = await prisma.medico.findUnique({
                where: { id: medicoId },
                select: {
                    diploma_url: true,
                    especializacao_url: true,
                    assinatura_digital_url: true,
                    seguro_responsabilidade_url: true
                }
            })

            if (!medico) {
                return reply.code(404).send({ error: 'Médico não encontrado' })
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
                    return reply.code(400).send({ error: 'Tipo de documento inválido' })
            }

            if (!gcsPath) {
                return reply.code(404).send({ error: 'Documento não encontrado' })
            }

            // Gera URL assinada via storageService (importar no topo se necessário)
            const { storageService } = await import('../services/storageService')
            const signedUrl = await storageService.getSignedUrl(gcsPath)

            // CFM: Auditoria de acesso a documento sensível por terceiro (Admin)
            await logAuditoria({
                usuarioId: (request.user as any).id,
                acao: 'ACCESS_MEDICO_DOCUMENT_ADMIN',
                recurso: 'MEDICO_DOC',
                recursoId: medicoId,
                detalhes: `Acesso administrativo ao documento: ${type} via GCS`,
                ip: request.ip,
                userAgent: request.headers['user-agent']
            })

            return reply.redirect(signedUrl)
        } catch (error) {
            logger.error('AdminController.getMedicoDocument error', error)
            return reply.code(500).send({ error: 'Erro ao buscar documento' })
        }
    }

    /**
     * Retorna logs de auditoria para o painel de governança
     */
    async getAuditLogs(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { q, inicio, fim, userId, ano, mes, periodo } = request.query as any
            
            const where: any = {}

            // Sincronizar filtros de data com os mesmos usados no Analytics
            if (inicio && fim) {
                where.createdAt = {
                    gte: new Date(inicio),
                    lte: new Date(fim)
                }
            } else if (ano) {
                const year = parseInt(ano)
                if (!isNaN(year)) {
                    if (mes && periodo !== 'anual') {
                        const month = parseInt(mes) - 1
                        const startMonth = new Date(Date.UTC(year, month, 1))
                        const endMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59))
                        where.createdAt = { gte: startMonth, lte: endMonth }
                    } else {
                        const start = new Date(Date.UTC(year, 0, 1))
                        const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59))
                        where.createdAt = { gte: start, lte: end }
                    }
                }
            }

            if (userId) {
                where.usuarioId = parseInt(userId)
            }

            // Se houver busca por 'q', pode ser CPF, ID, Ação ou Recurso
            if (q) {
                const isNumeric = /^\d+$/.test(q)
                if (isNumeric) {
                    if (q.length > 8) {
                        // Provável CPF
                        const user = await prisma.paciente.findUnique({
                            where: { cpf: q },
                            select: { usuario_id: true }
                        })
                        if (user) where.usuarioId = user.usuario_id
                        else {
                            const med = await prisma.medico.findUnique({
                                where: { cpf: q },
                                select: { usuario_id: true }
                            })
                            if (med) where.usuarioId = med.usuario_id
                        }
                    } else {
                        // Provável ID de Usuário ou Recurso
                        where.OR = [
                            { usuarioId: parseInt(q) },
                            { recursoId: parseInt(q) }
                        ]
                    }
                } else {
                    // Busca parcial por ação ou recurso (string)
                    where.OR = [
                        { acao: { contains: q, mode: 'insensitive' } },
                        { recurso: { contains: q, mode: 'insensitive' } },
                        { detalhes: { contains: q, mode: 'insensitive' } }
                    ]
                }
            }

            const logs = await prisma.trilhaAuditoria.findMany({
                where,
                take: 1000, // Aumentado para garantir visibilidade de todos os dados do período
                orderBy: { createdAt: 'desc' }
            })
            return reply.send(logs)
        } catch (error) {
            logger.error('AdminController.getAuditLogs error', error)
            return reply.code(500).send({ error: 'Erro ao buscar logs de auditoria' })
        }
    }
}
