import { FastifyInstance } from 'fastify';
import { LoginController } from '../controllers/loginController';

const loginController = new LoginController();

export async function loginRoutes(app: FastifyInstance) {
  app.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    }
  }, loginController.login.bind(loginController));
}