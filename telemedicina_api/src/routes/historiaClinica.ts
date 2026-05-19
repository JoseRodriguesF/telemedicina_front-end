import { FastifyInstance } from 'fastify'
import { HistoriaClinicaController, criarHistoriaSchema } from '../controllers/historiaClinicaController'
import { authenticateJWT } from '../middlewares/auth'
import { ZodTypeProvider } from 'fastify-type-provider-zod'

const controller = new HistoriaClinicaController()

export async function historiaClinicaRoutes(app: FastifyInstance) {
    const fastify = app.withTypeProvider<ZodTypeProvider>()

    // Criar história clínica
    fastify.route({
        method: 'POST',
        url: '/historia-clinica',
        preHandler: authenticateJWT,
        schema: {
            body: criarHistoriaSchema,
            description: 'Cria uma nova história clínica para um paciente'
        },
        handler: (req, reply) => controller.criar(req, reply)
    })

    // Buscar todas as histórias clínicas de um paciente
    fastify.route({
        method: 'GET',
        url: '/historia-clinica/paciente/:pacienteId',
        preHandler: authenticateJWT,
        handler: (req, reply) => controller.buscarPorPaciente(req, reply)
    })

    // Buscar última história clínica de um paciente
    fastify.route({
        method: 'GET',
        url: '/historia-clinica/paciente/:pacienteId/ultima',
        preHandler: authenticateJWT,
        handler: (req, reply) => controller.buscarUltima(req, reply)
    })

    // Buscar história clínica por ID
    fastify.route({
        method: 'GET',
        url: '/historia-clinica/:id',
        preHandler: authenticateJWT,
        handler: (req, reply) => controller.buscarPorId(req, reply)
    })
}
