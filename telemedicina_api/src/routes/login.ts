import { FastifyInstance } from 'fastify';
import { LoginController, loginSchema } from '../controllers/loginController';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

const loginController = new LoginController();

export async function loginRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/login', {
    schema: {
      body: loginSchema,
      description: 'Realiza a autenticação do usuário retornando um token JWT'
    },
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    }
  }, loginController.login.bind(loginController));
}