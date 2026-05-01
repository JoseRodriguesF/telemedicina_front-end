-- AlterEnum: Add 'pendente_documentos' to StatusVerificacao
ALTER TYPE "status_verificacao_enum" ADD VALUE IF NOT EXISTS 'pendente_documentos' BEFORE 'analise';
