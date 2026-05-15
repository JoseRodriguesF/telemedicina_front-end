import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/database';
import jwt from 'jsonwebtoken';
import ApiError from '../utils/apiError';
import logger from '../utils/logger';
import { generateJWT } from '../utils/security';

export class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  async loginWithGoogle(idToken: string) {
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload) throw new ApiError('Token inválido do Google', 401, 'INVALID_GOOGLE_TOKEN');

      const googleId = payload['sub'];
      const email = payload['email'];
      if (!googleId || !email) throw new ApiError('Dados do Google incompletos', 400, 'MISSING_GOOGLE_DATA');

      // 1. Tentar encontrar por google_id
      let user = await prisma.usuario.findUnique({ where: { google_id: googleId } as any });
      
      // 2. Se não encontrar, tentar por email e vincular (se o email for verificado pelo Google)
      if (!user && payload['email_verified']) {
        user = await prisma.usuario.findUnique({ where: { email } });
        if (user) {
          // Vincular google_id ao usuário existente
          user = await prisma.usuario.update({
            where: { id: user.id },
            data: { google_id: googleId } as any
          });
          logger.info(`User ${user.email} linked to Google account ${googleId}`);
        }
      }

      if (!user) {
        throw new ApiError('Conta não encontrada. Por favor, realize o cadastro primeiro.', 404, 'USER_NOT_FOUND');
      }

      // Carregar perfis vinculados
      let nome: string | undefined;
      let verificacao: string | undefined;
      let pacienteId: number | null = null;
      let medicoId: number | null = null;

      if (user.tipo_usuario === 'medico') {
        const medico = await prisma.medico.findUnique({ where: { usuario_id: user.id } });
        if (medico) {
          nome = medico.nome_completo;
          verificacao = medico.verificacao;
          medicoId = medico.id;
        }
      } else if (user.tipo_usuario === 'paciente') {
        const paciente = await prisma.paciente.findUnique({ where: { usuario_id: user.id } });
        if (paciente) {
          nome = paciente.nome_completo;
          pacienteId = paciente.id;
        }
      }

      const token = generateJWT({
        id: user.id,
        email: user.email,
        tipo_usuario: user.tipo_usuario,
        pacienteId: pacienteId || undefined,
        medicoId: medicoId || undefined
      });

      return {
        id: user.id,
        email: user.email,
        tipo_usuario: user.tipo_usuario,
        registro_full: (user as any).registroFull ?? false,
        pacienteId,
        medicoId,
        token,
        nome,
        verificacao,
        documentos_pendentes: verificacao === 'pendente_documentos'
      };
    } catch (err: any) {
      if (err instanceof ApiError) throw err;

      // Log detalhado para diagnosticar falhas
      try {
        const decoded = jwt.decode(idToken) as any | null;
        logger.error('Google token verification failed in loginWithGoogle', {
          error: err.message,
          stack: err.stack,
          decodedPayload: decoded ? {
            aud: decoded.aud,
            iss: decoded.iss,
            exp: decoded.exp,
            sub: decoded.sub,
            email: decoded.email
          } : null
        });
      } catch (logErr) {
        logger.error('Unable to decode Google token in loginWithGoogle', logErr as Error);
      }

      // Se for erro de banco de dados, retornar 500 em vez de 401
      if (err.message?.includes('prisma') || err.message?.includes('database') || err.message?.includes('column')) {
        throw new ApiError('Erro interno de processamento (Banco de Dados).', 500, 'DATABASE_ERROR', err.message);
      }

      throw new ApiError('Falha ao verificar token do Google', 401, 'INVALID_GOOGLE_TOKEN', err?.message);
    }
  }

  async registerWithGoogle(idToken: string, tipo_usuario: 'medico' | 'paciente') {
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload) throw new ApiError('Token inválido do Google', 401, 'INVALID_GOOGLE_TOKEN');

      const googleId = payload['sub'];
      const email = payload['email'];
      if (!googleId || !email) throw new ApiError('Dados do Google incompletos', 400, 'MISSING_GOOGLE_DATA');

      // Se já existir usuário com google_id ou email, não criar
      const existingByGoogle = await prisma.usuario.findUnique({ where: { google_id: googleId } as any });
      if (existingByGoogle) throw new ApiError('Conta Google já cadastrada. Faça login.', 409, 'GOOGLE_ALREADY_REGISTERED');

      const existingByEmail = await prisma.usuario.findUnique({ where: { email } });
      if (existingByEmail) throw new ApiError('Já existe um usuário com este email. Faça login ou vincule a conta.', 409, 'EMAIL_ALREADY_EXISTS');

      const user = await prisma.usuario.create({
        data: {
          email,
          google_id: googleId,
          tipo_usuario,
          registroFull: false
        }
      });

      // Carregar perfis vinculados
      let nome: string | undefined;
      let pacienteId: number | null = null;
      let medicoId: number | null = null;

      if (user.tipo_usuario === 'medico') {
        const medico = await prisma.medico.findUnique({ where: { usuario_id: user.id } });
        if (medico) {
          nome = medico.nome_completo;
          medicoId = medico.id;
        }
      } else if (user.tipo_usuario === 'paciente') {
        const paciente = await prisma.paciente.findUnique({ where: { usuario_id: user.id } });
        if (paciente) {
          nome = paciente.nome_completo;
          pacienteId = paciente.id;
        }
      }

      const token = generateJWT({
        id: user.id,
        email: user.email,
        tipo_usuario: user.tipo_usuario,
        pacienteId: pacienteId || undefined,
        medicoId: medicoId || undefined
      });

      return {
        id: user.id,
        email: user.email,
        tipo_usuario: user.tipo_usuario,
        registro_full: (user as any).registroFull ?? false,
        pacienteId,
        medicoId,
        token,
        nome
      };
    } catch (err: any) {
      // Log detalhado para diagnosticar falhas de verificação do ID token
      try {
        const decoded = jwt.decode(idToken) as any | null;
        logger.error('Google token verification failed in registerWithGoogle', err, {
          decodedPayload: decoded ? {
            aud: decoded.aud,
            iss: decoded.iss,
            exp: decoded.exp,
            sub: decoded.sub,
            email: decoded.email
          } : null
        });
      } catch (logErr) {
        logger.error('Unable to decode Google token in registerWithGoogle', logErr as Error);
      }
      if (err instanceof ApiError) throw err;
      throw new ApiError('Failed to verify Google token', 401, 'INVALID_GOOGLE_TOKEN', err?.message);
    }
  }
}
