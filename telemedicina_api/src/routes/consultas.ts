import { FastifyInstance } from 'fastify'
import { createOrGetRoom, endConsulta, listParticipants, joinRoom, createRoomSimple, listConsultasAgendadas, listMedicos, agendarConsulta, confirmarConsulta, cancelarConsulta, getConsultaDetails, avaliarConsulta, updatePacienteNotas } from '../controllers/consultasController'
import { salvarAnexos, listarAnexos, getAnexoConteudo } from '../controllers/anexosController'
import { authenticateJWT } from '../middlewares/auth'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const agendarSchema = z.object({
  medico_id: z.number().optional().nullable(),
  paciente_id: z.number(),
  data_consulta: z.string().optional(),
  hora_inicio: z.string().optional(),
  hora_fim: z.string().optional(),
  historiaClinicaId: z.number().optional()
})

export default async function consultasRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>()

  fastify.get('/consultas/:id', { preHandler: authenticateJWT }, getConsultaDetails as any)
  fastify.post('/consultas/:id/room', { preHandler: authenticateJWT }, createOrGetRoom as any)
  fastify.post('/rooms', { preHandler: authenticateJWT }, createRoomSimple as any)

  // Agendamentos
  fastify.post('/consultas/agendar', { 
    preHandler: authenticateJWT,
    schema: {
      body: agendarSchema,
      description: 'Agenda uma nova teleconsulta'
    }
  }, agendarConsulta as any)
  
  fastify.get('/consultas/agendadas', { preHandler: authenticateJWT }, listConsultasAgendadas as any)
  fastify.patch('/consultas/:id/confirmar', { preHandler: authenticateJWT }, confirmarConsulta as any)
  fastify.delete('/consultas/:id', { preHandler: authenticateJWT }, cancelarConsulta as any)

  fastify.get('/medicos', { preHandler: authenticateJWT }, listMedicos as any)
  fastify.post('/consultas/:id/join', { preHandler: authenticateJWT }, joinRoom as any)
  fastify.get('/consultas/:id/participants', { preHandler: authenticateJWT }, listParticipants as any)
  fastify.post('/consultas/:id/end', { preHandler: authenticateJWT }, endConsulta as any)
  fastify.post('/consultas/:id/avaliacao', { preHandler: authenticateJWT }, avaliarConsulta as any)
  fastify.patch('/consultas/:id/paciente/notas', { preHandler: authenticateJWT }, updatePacienteNotas as any)

  // Anexos (arquivos do paciente)
  fastify.post('/consultas/:id/anexos', { 
    preHandler: authenticateJWT,
    bodyLimit: 15 * 1024 * 1024 // 15MB para permitir múltiplos anexos/imagens
  }, salvarAnexos as any)
  fastify.get('/consultas/:id/anexos', { preHandler: authenticateJWT }, listarAnexos as any)
  fastify.get('/consultas/anexos/:id/arquivo', { preHandler: authenticateJWT }, getAnexoConteudo as any)
}


