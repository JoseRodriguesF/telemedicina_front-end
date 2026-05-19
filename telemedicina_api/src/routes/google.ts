import { FastifyInstance } from 'fastify';
import { GoogleController, googleSchema } from '../controllers/googleController';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

const googleController = new GoogleController();

export async function googleRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post('/auth/google', {
    schema: {
      body: googleSchema,
      description: 'Autenticação de usuário via Google OAuth'
    }
  }, googleController.auth.bind(googleController));

  server.post('/register/google', {
    schema: {
      body: googleSchema,
      description: 'Registro de usuário via Google OAuth'
    }
  }, googleController.register.bind(googleController));
}
