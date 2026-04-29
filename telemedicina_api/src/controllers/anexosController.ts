import { FastifyReply, FastifyRequest } from 'fastify'
import prisma from '../config/database'
import logger from '../utils/logger'
import { validateNumericId } from '../utils/controllerHelpers'
import { AuthenticatedUser } from '../types/shared'
import { getConsultaById } from '../services/consultasService'
import { logAuditoria } from '../utils/auditLogger'
import { storageService, StorageService } from '../services/storageService'

/**
 * Validação de Magic Bytes (Assinatura de arquivo)
 * Previne upload de executáveis disfarçados de PDF/IMG.
 */
function isValidMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'application/pdf') {
    return buffer.slice(0, 4).toString() === '%PDF'
  }
  if (mimeType.startsWith('image/')) {
    // JPEG: FF D8 FF
    if (mimeType === 'image/jpeg') return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
    // PNG: 89 50 4E 47
    if (mimeType === 'image/png') return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
  }
  return true // Outros tipos sob risco controlado
}

/**
 * Salva uma lista de anexos (arquivos do paciente) vinculados a uma consulta
 */
export async function salvarAnexos(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const validation = validateNumericId(req.params.id, 'consulta_id')
  if (!validation.valid) return reply.code(400).send(validation.error!)

  const consultaId = validation.numericId!
  const consulta = await getConsultaById(consultaId)
  if (!consulta) return reply.code(404).send({ error: 'consulta_not_found' })

  const user = req.user as AuthenticatedUser

  if (user.tipo_usuario !== 'paciente' || user.pacienteId !== consulta.pacienteId) {
    return reply.code(403).send({ error: 'forbidden', message: 'Apenas o paciente da consulta pode enviar arquivos.' })
  }

  const body = (req.body as any) || {}
  const anexos: Array<{ data: string; nome?: string; tipo_mime: string }> = Array.isArray(body.anexos) ? body.anexos : []

  if (anexos.length === 0) {
    return reply.code(400).send({ error: 'no_anexos', message: 'Nenhum arquivo foi enviado.' })
  }

  try {
    const uploadPromises = anexos.map(async a => {
      const base64Clean = a.data.includes('base64,') ? a.data.split('base64,')[1] : a.data;
      const buffer = Buffer.from(base64Clean, 'base64')
      
      // OWASP: Validação de integridade do arquivo
      if (!isValidMagicBytes(buffer, a.tipo_mime)) {
        throw new Error(`Arquivo inválido detectado: ${a.nome}`)
      }

      // GCS: Upload do arquivo para o bucket
      const gcsPath = StorageService.buildAnexoPath(consultaId, a.nome || 'anexo')
      await storageService.uploadDocument(buffer, gcsPath, a.tipo_mime)

      return {
        consultaId,
        arquivo_url: gcsPath,
        tipo_mime: a.tipo_mime,
        nome: a.nome || 'anexo'
      }
    });

    const attachmentsToSave = await Promise.all(uploadPromises)

    const created = await prisma.consultaAnexo.createMany({
      data: attachmentsToSave
    })

    logger.info('Anexos salvos no GCS com sucesso', { consultaId, count: created.count })
    return reply.send({ ok: true, count: created.count })
  } catch (err: any) {
    logger.error('Erro ao salvar anexos no GCS', err)
    return reply.code(400).send({ 
      error: 'upload_failed', 
      code: err.message.includes('inválido') ? 'INVALID_FILE_TYPE' : 'INTERNAL_ERROR',
      message: err.message 
    })
  }
}

/**
 * Lista todos os anexos de uma consulta (Metadados apenas)
 */
export async function listarAnexos(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const validation = validateNumericId(req.params.id, 'consulta_id')
  if (!validation.valid) return reply.code(400).send(validation.error!)

  const consultaId = validation.numericId!
  const consulta = await getConsultaById(consultaId)
  if (!consulta) return reply.code(404).send({ error: 'consulta_not_found' })

  const user = req.user as AuthenticatedUser
  const isAuthorized = (user.tipo_usuario === 'medico' && user.medicoId === consulta.medicoId) ||
                       (user.tipo_usuario === 'paciente' && user.pacienteId === consulta.pacienteId) ||
                       (user.tipo_usuario === 'admin')

  if (!isAuthorized) return reply.code(403).send({ error: 'forbidden' })

  await logAuditoria({
    usuarioId: user.id,
    acao: 'LIST_ANEXOS',
    recurso: 'CONSULTA',
    recursoId: consultaId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  })

  // Retorna metadados. O arquivo real é obtido via getAnexoConteudo (Signed URL)
  const anexos = await prisma.consultaAnexo.findMany({
    where: { consultaId },
    select: { id: true, consultaId: true, nome: true, tipo_mime: true, createdAt: true }
  })

  return reply.send(anexos)
}

/**
 * Obtém uma URL assinada para visualização do anexo (GCS)
 */
export async function getAnexoConteudo(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const validation = validateNumericId(req.params.id, 'anexo_id')
  if (!validation.valid) return reply.code(400).send(validation.error!)

  const anexoId = validation.numericId!

  try {
    const anexo = await prisma.consultaAnexo.findUnique({
      where: { id: anexoId },
      include: { consulta: true }
    })

    if (!anexo) return reply.code(404).send({ error: 'file_not_found' })

    const user = req.user as AuthenticatedUser
    const isAuthorized = (user.tipo_usuario === 'medico' && user.medicoId === anexo.consulta.medicoId) ||
                         (user.tipo_usuario === 'paciente' && user.pacienteId === anexo.consulta.pacienteId) ||
                         (user.tipo_usuario === 'admin')

    if (!isAuthorized) return reply.code(403).send({ error: 'forbidden' })

    if (!anexo.arquivo_url) {
      return reply.code(404).send({ error: 'file_content_missing', message: 'Este documento não possui um caminho GCS válido.' })
    }

    // GCS: Gera URL assinada temporária
    const signedUrl = await storageService.getSignedUrl(anexo.arquivo_url)

    await logAuditoria({
      usuarioId: user.id,
      acao: 'DOWNLOAD_ANEXO_GCS',
      recurso: 'CONSULTA_ANEXO',
      recursoId: anexoId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })

    // Redireciona o cliente para o bucket privado via URL assinada
    return reply.redirect(signedUrl)
  } catch (err: any) {
    logger.error('Erro ao obter Signed URL para anexo', err)
    return reply.code(500).send({ error: 'signed_url_generation_failed' })
  }
}

