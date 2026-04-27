import Fastify from 'fastify'
import prisma from './config/database'
import dotenv from 'dotenv'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { appRoutes } from './routes/index'
import { initSignalServer } from './server-signal'
import logger from './utils/logger'
import { errorHandler } from './middlewares/errorHandler'

dotenv.config()

// Garantir que o servidor utilize o fuso horário local de Brasília para sincronização
process.env.TZ = 'America/Sao_Paulo';

const server = Fastify({ 
  logger: false,
  trustProxy: true // Essencial para rate limiting atrás de um balanceador/proxy
})

// Hardening 1: Helmet para proteção contra Clickjacking, XSS e Sniffing
server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "wss:", "https://api.openai.com"]
    }
  }
})

// Hardening 2: CORS restrito
server.register(cors, {
  origin: (origin, cb) => {
    if (!process.env.ALLOWED_ORIGINS) {
      return cb(null, process.env.NODE_ENV === 'production' ? false : true);
    }
    
    const origins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, ''));
    if (!origin || origins.includes(origin.replace(/\/$/, ''))) {
      cb(null, true);
    } else {
      logger.warn('CORS bloqueado', { origin });
      const error = new Error('CORS fail') as any;
      error.statusCode = 403;
      error.code = 'CORS_ERROR';
      cb(error, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
})

// Hardening 3: Rate Limit para proteção contra Brute Force e DoS
server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    error: 'too_many_requests',
    message: 'Limite de requisições excedido. Tente novamente em alguns instantes.'
  })
})

// Registrar middleware de erro
server.setErrorHandler(errorHandler)

const start = async () => {
  try {
    // Sincronizar banco de dados em produção
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('10.11.0.2')) {
      logger.info('Iniciando migrações do banco de dados...')
      try {
        const { execSync } = require('child_process')
        execSync('npx prisma migrate deploy', { stdio: 'inherit' })
        logger.info('Migrações aplicadas com sucesso')
      } catch (migrateErr) {
        logger.error('Erro ao aplicar migrações. O servidor tentará continuar...', migrateErr as Error)
      }
    }

    // Registrar todas as rotas centralizadas
    await server.register(appRoutes)

    // Inicializar servidor HTTP
    await server.listen({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
      host: '0.0.0.0'
    })

    // Inicializar WebSocket de sinalização
    const httpServer = server.server
    initSignalServer(httpServer)

    // Conectar ao banco de dados
    await prisma.$connect()

    logger.info('Server started successfully', {
      port: process.env.PORT || 3000,
      host: '0.0.0.0'
    })
    logger.info('Database connected')
  } catch (err) {
    logger.error('Failed to start server', err as Error)
    process.exit(1)
  }
}

// Graceful shutdown para Cloud Run — fecha conexões ao receber SIGTERM/SIGINT
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`)
  try {
    await server.close()       // Fecha o Fastify (HTTP + WebSocket)
    await prisma.$disconnect() // Desconecta do banco
    logger.info('Shutdown complete')
    process.exit(0)
  } catch (err) {
    logger.error('Error during shutdown', err as Error)
    process.exit(1)
  }
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

start()
