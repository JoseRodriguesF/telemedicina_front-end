-- Migration: Migrate to GCS and Cleanup BYTEA columns
-- This migration removes the binary data columns from the 'medicos' table
-- and ensures the 'especialidade' column is present.

-- 1. Ensure 'especialidade' column exists (it might have been missing in some environments)
ALTER TABLE "medicos" ADD COLUMN IF NOT EXISTS "especialidade" VARCHAR(100);

-- 2. Drop the deprecated BYTEA and mimetype columns
ALTER TABLE "medicos" DROP COLUMN IF EXISTS "assinatura_digital_data";
ALTER TABLE "medicos" DROP COLUMN IF EXISTS "assinatura_digital_mimetype";
ALTER TABLE "medicos" DROP COLUMN IF EXISTS "diploma_data";
ALTER TABLE "medicos" DROP COLUMN IF EXISTS "diploma_mimetype";
ALTER TABLE "medicos" DROP COLUMN IF EXISTS "especializacao_data";
ALTER TABLE "medicos" DROP COLUMN IF EXISTS "especializacao_mimetype";
ALTER TABLE "medicos" DROP COLUMN IF EXISTS "seguro_responsabilidade_data";
ALTER TABLE "medicos" DROP COLUMN IF EXISTS "seguro_responsabilidade_mimetype";
