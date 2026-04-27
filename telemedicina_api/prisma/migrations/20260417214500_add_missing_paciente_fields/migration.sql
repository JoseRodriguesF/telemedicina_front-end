-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "nome_mae" VARCHAR(255);
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "telefone_responsavel" VARCHAR(20);
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "peso" DECIMAL(5,2);
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "altura" INTEGER;
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "aceitou_tcle" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "tcle_data" TIMESTAMP(3);

-- Medicos
ALTER TABLE "medicos" ADD COLUMN IF NOT EXISTS "telefone_celular" VARCHAR(15);

-- Prescricoes
ALTER TABLE "prescricoes" ADD COLUMN IF NOT EXISTS "mevo_id" VARCHAR(255);
ALTER TABLE "prescricoes" ADD COLUMN IF NOT EXISTS "mevo_status" VARCHAR(50);
ALTER TABLE "prescricoes" ADD COLUMN IF NOT EXISTS "assinatura_hash" TEXT;

-- Historia Clinica
ALTER TABLE "historiaClinica" ADD COLUMN IF NOT EXISTS "antecedentes_familiares" JSONB;
ALTER TABLE "historiaClinica" ADD COLUMN IF NOT EXISTS "descricao_sintomas" TEXT;
ALTER TABLE "historiaClinica" ADD COLUMN IF NOT EXISTS "estilo_vida" JSONB;
ALTER TABLE "historiaClinica" ADD COLUMN IF NOT EXISTS "historico_pessoal" JSONB;
ALTER TABLE "historiaClinica" ADD COLUMN IF NOT EXISTS "queixa_principal" TEXT;


