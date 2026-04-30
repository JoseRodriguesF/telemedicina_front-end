import { FastifyInstance } from 'fastify'
import { VidaasController } from '../controllers/vidaasController'
import { authenticateJWT } from '../middlewares/auth'

export async function vidaasRoutes(fastify: FastifyInstance) {
    const controller = new VidaasController()

    // Rotas autenticadas
    fastify.register(async (instance) => {
        instance.addHook('preHandler', authenticateJWT)
        
        instance.get('/api/vidaas/authenticate', controller.authenticate.bind(controller))
        instance.get('/api/vidaas/status', controller.checkStatus.bind(controller))
    })

    // Rota pública para callback (OAuth2)
    fastify.get('/api/vidaas/callback', controller.callback.bind(controller))
}
