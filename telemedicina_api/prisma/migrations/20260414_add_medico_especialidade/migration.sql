-- Migration: Add 'especialidade' column to medicos table
-- This column was added directly to the Aiven database without a formal Prisma migration.
-- This migration ensures the Cloud SQL (GCP) database schema is in sync.

ALTER TABLE "medicos"
  ADD COLUMN IF NOT EXISTS "especialidade" VARCHAR(100);
