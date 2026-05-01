-- Update default value for verificacao column to use the new enum value
ALTER TABLE "medicos" ALTER COLUMN "verificacao" SET DEFAULT 'pendente_documentos'::"status_verificacao_enum";
