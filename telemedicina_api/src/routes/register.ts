import { FastifyInstance } from 'fastify';
import { RegisterController, registerAccessSchema, registerPersonalSchema, registerMedicoSchema } from '../controllers/registerController';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

const registerController = new RegisterController();

export async function registerRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post('/register/acesso', {
    schema: {
      body: registerAccessSchema,
      description: 'Registra o acesso inicial de um novo usuário'
    }
  }, registerController.registerAccess.bind(registerController));

  server.post('/register/pessoais', {
    schema: {
      body: registerPersonalSchema,
      description: 'Registra os dados pessoais e cria o perfil de paciente'
    }
  }, registerController.registerPersonal.bind(registerController));

  server.post('/register/medicos', {
    schema: {
      body: registerMedicoSchema,
      description: 'Registra os dados profissionais e cria o perfil de médico'
    }
  }, registerController.registerMedico.bind(registerController));
}