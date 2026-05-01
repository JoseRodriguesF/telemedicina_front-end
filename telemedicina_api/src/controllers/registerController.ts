import { FastifyRequest, FastifyReply } from 'fastify'
import { RegisterService } from '../services/registerService'
import { z } from 'zod'
import ApiError from '../utils/apiError'
import { generateJWT } from '../utils/security'
import logger from '../utils/logger'
import { logAuditoria } from '../utils/auditLogger'

const registerService = new RegisterService()

// Schemas de validação com Zod
const registerAccessSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres (OWASP Recomendation)'),
  tipo_usuario: z.enum(['medico', 'paciente'])
})

const registerPersonalSchema = z.object({
  usuario_id: z.number().int().positive('ID do usuário deve ser um número positivo'),
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  data_nascimento: z.string().refine((date) => !isNaN(Date.parse(date)), 'Data de nascimento inválida'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos numéricos'),
  sexo: z.string().min(1, 'Sexo é obrigatório'),
  estado_civil: z.string().min(1, 'Estado civil é obrigatório'),
  telefone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
  nome_mae: z.string().min(1, 'Nome da mãe é obrigatório para prescrição digital'),
  telefone_responsavel: z.string().nullish(),
  aceitou_tcle: z.boolean().refine(val => val === true, 'O aceite do TCLE é obrigatório para telemedicina'),
  endereco: z.object({
    endereco: z.string().min(1, 'Endereço é obrigatório'),
    numero: z.union([z.number(), z.string()]).transform(val => String(val)),
    complemento: z.string().nullish(),
    bairro: z.string().nullish(),
    cep: z.string().nullish(),
    cidade: z.string().nullish(),
    estado: z.string().nullish()
  })
})

const registerMedicoSchema = z.object({
  usuario_id: z.number().int().positive('ID do usuário deve ser um número positivo'),
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  data_nascimento: z.string().refine((date) => !isNaN(Date.parse(date)), 'Data de nascimento inválida'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos numéricos'),
  sexo: z.string().min(1, 'Sexo é obrigatório'),
  telefone_celular: z.string().regex(/^\d{10,11}$/, 'Telefone celular deve ter 10 ou 11 dígitos (incluindo DDD)'),
  crm: z.string().min(1, 'CRM é obrigatório'),
  crm_uf: z.string().length(2, 'UF do CRM deve ter 2 caracteres'),
  rqe: z.string().nullish()
})

export class RegisterController {
  async registerAccess(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, senha, tipo_usuario } = registerAccessSchema.parse(request.body)
      const user = await registerService.createUser(email, senha, tipo_usuario)
      
      // LGPD/CFM: Auditoria de criação de conta
      await logAuditoria({
        usuarioId: user.id,
        acao: 'CRIACAO_CONTA',
        recurso: 'usuario',
        detalhes: `Conta do tipo '${tipo_usuario}' criada via registro direto.`,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });

      reply.send({ message: 'Dados de acesso registrados com sucesso', userId: user.id })
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({ error: { code: 'INVALID_INPUT', message: 'Dados inválidos', details: error.issues } })
      } else if (error instanceof ApiError) {
        reply.code(error.statusCode).send({ error: { code: error.code, message: error.message, details: error.details, payload: error.payload } })
      } else {
        logger.error('RegisterController.registerAccess unexpected error', error)
        reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno. Tente novamente mais tarde.' } })
      }
    }
  }

  async registerPersonal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerPersonalSchema.parse(request.body)
      const paciente = await registerService.createPaciente(data)

      // Criar endereço associado ao usuário
      await registerService.createEndereco({
        usuario_id: data.usuario_id,
        endereco: data.endereco.endereco,
        numero: data.endereco.numero,
        complemento: data.endereco.complemento
      })

      // Buscar dados do usuário para gerar JWT
      const usuario = await registerService.getUsuarioById(data.usuario_id)

      // Gerar JWT usando helper seguro
      const token = generateJWT({
        id: usuario.id,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario
      })

      // Auditoria: Perfil de Paciente completo
      await logAuditoria({
        usuarioId: usuario.id,
        acao: 'CADASTRO_PERFIL_PACIENTE',
        recurso: 'paciente',
        recursoId: paciente.id,
        detalhes: 'Perfil completo de paciente registrado com aceite de TCLE.',
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });

      reply.send({
        message: 'Dados pessoais registrados com sucesso. Cadastro completo!',
        pacienteId: paciente.id,
        user: {
          id: usuario.id,
          email: usuario.email,
          tipo_usuario: usuario.tipo_usuario,
          pacienteId: paciente.id,
          nome: data.nome_completo,
          registro_full: true,
          token
        }
      })
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({ error: { code: 'INVALID_INPUT', message: 'Dados inválidos', details: error.issues } })
      } else if (error instanceof ApiError) {
        reply.code(error.statusCode).send({ error: { code: error.code, message: error.message, details: error.details, payload: error.payload } })
      } else {
        logger.error('RegisterController.registerPersonal unexpected error', error)
        reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno. Tente novamente mais tarde.' } })
      }
    }
  }

  async registerMedico(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerMedicoSchema.parse(request.body)
      const medico = await registerService.createMedico(data)

      // Buscar dados do usuário para gerar JWT
      const usuario = await registerService.getUsuarioById(data.usuario_id)

      // Gerar JWT usando helper seguro
      const token = generateJWT({
        id: usuario.id,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario
      })

      // Auditoria: Perfil de Médico completo (CFM/CRM)
      await logAuditoria({
        usuarioId: usuario.id,
        acao: 'CADASTRO_PERFIL_MEDICO',
        recurso: 'medico',
        recursoId: medico.id,
        detalhes: `Registro de médico (CRM ${data.crm}/${data.crm_uf}) — documentos pendentes.`,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });

      reply.send({
        message: 'Cadastro médico realizado com sucesso! Envie seus documentos pelo perfil para liberar todas as funcionalidades.',
        medicoId: medico.id,
        user: {
          id: usuario.id,
          email: usuario.email,
          tipo_usuario: usuario.tipo_usuario,
          medicoId: medico.id,
          nome: data.nome_completo,
          registro_full: true,
          verificacao: 'pendente_documentos',
          token
        }
      })
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({ error: { code: 'INVALID_INPUT', message: 'Dados inválidos', details: error.issues } })
      } else if (error instanceof ApiError) {
        reply.code(error.statusCode).send({ error: { code: error.code, message: error.message, details: error.details, payload: error.payload } })
      } else {
        logger.error('RegisterController.registerMedico unexpected error', error)
        reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno. Tente novamente mais tarde.' } })
      }
    }
  }
}