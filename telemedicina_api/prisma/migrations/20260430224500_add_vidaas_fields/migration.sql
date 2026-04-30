-- AlterTable
ALTER TABLE "medicos" ADD COLUMN IF NOT EXISTS "vidaas_external_id" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "vidaas_refresh_token" TEXT;
