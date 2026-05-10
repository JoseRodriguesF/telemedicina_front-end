import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../config/database';
import { AuthenticatedUser } from '../types/shared';
import logger from '../utils/logger';

interface LogEventoBody {
    consultaId: number;
    tipo: string;
    status_info?: any;
    observacao?: string;
}

/**
 * Registra um evento técnico (monitoramento WebRTC, quedas, qualidade)
 * Exigência CFM Resolução 2.314/2022 Art. 10
 */
export async function logEventoTecnico(
    req: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const user = req.user as AuthenticatedUser;
        const { consultaId, tipo, status_info, observacao } = req.body as LogEventoBody;

        if (!consultaId || !tipo) {
            return reply.code(400).send({ error: 'consultaId e tipo são obrigatórios' });
        }

        const numId = Number(consultaId);
        if (isNaN(numId)) {
            return reply.code(400).send({ error: 'consultaId deve ser um número válido' });
        }

        const evento = await prisma.eventoTecnico.create({
            data: {
                consultaId: numId,
                usuarioId: user.id,
                tipo,
                status_info: status_info || {},
                observacao: observacao || null
            }
        });

        // Se for uma falha de conexão, registra também no registro principal da consulta
        if (tipo === 'FAIL_CONNECTION' || tipo === 'ABNORMAL_DISCONNECT') {
            const timestamp = new Date().toLocaleTimeString('pt-BR');
            const userType = user.tipo_usuario;
            const newObservation = `[${timestamp}] Falha detectada (${userType}): ${observacao || 'Queda de conexão WebRTC'}`;

            const consulta = await prisma.consulta.findUnique({
                where: { id: numId },
                select: { observacaoTecnica: true }
            });

            if (consulta) {
                await prisma.consulta.update({
                    where: { id: numId },
                    data: {
                        observacaoTecnica: consulta.observacaoTecnica 
                            ? `${consulta.observacaoTecnica}\n${newObservation}` 
                            : newObservation
                    }
                });
            }
        }

        return reply.code(201).send(evento);
    } catch (error) {
        logger.error('Erro ao registrar evento técnico', error as Error);
        return reply.code(500).send({ error: 'Erro ao registrar auditoria técnica' });
    }
}

/**
 * Registra um "batimento" de atividade para manter o usuário como Online no Admin
 */
export async function logHeartbeat(req: FastifyRequest, reply: FastifyReply) {
    try {
        const user = req.user as AuthenticatedUser;
        
        // O perfil de admin nunca deve contar como online/ativo no painel
        if (user.tipo_usuario === 'admin') {
            return reply.code(200).send({ status: 'ignored_admin' });
        }

        const { logAuditoria } = await import('../utils/auditLogger');
        
        await logAuditoria({
            usuarioId: user.id,
            acao: 'HEARTBEAT',
            recurso: 'SESSION',
            detalhes: 'Sessão ativa (heartbeat)',
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return reply.code(200).send({ status: 'ok' });
    } catch (error) {
        // Ignoramos erros aqui para não quebrar a UI
        return reply.code(200).send({ status: 'ignored' });
    }
}
