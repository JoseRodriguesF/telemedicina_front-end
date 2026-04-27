FROM node:20-alpine AS builder
WORKDIR /app

# Copiar dependências
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Instalar TODAS as deps (precisa de typescript e ts-node para build)
RUN npm ci

# Prisma precisa de DATABASE_URL para gerar o client (não conecta, só gera tipos)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# Copiar código e compilar
COPY . .
RUN npx tsc

# Instalar apenas deps de produção para o runner
RUN rm -rf node_modules && npm ci --omit=dev
RUN npx prisma generate

# --- Estágio de produção (imagem mínima) ---
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.js"]
