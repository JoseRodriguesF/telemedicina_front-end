-- Sincronização de campos faltantes em Medicos
ALTER TABLE "medicos" ADD COLUMN IF NOT EXISTS "telefone_celular" VARCHAR(15);
ALTER TABLE "medicos" ADD COLUMN IF NOT EXISTS "crm_uf" VARCHAR(2) DEFAULT 'SP';

-- Sincronização de campos faltantes em Prescricoes
ALTER TABLE "prescricoes" ADD COLUMN IF NOT EXISTS "mevo_id" VARCHAR(255);
ALTER TABLE "prescricoes" ADD COLUMN IF NOT EXISTS "mevo_status" VARCHAR(50);
ALTER TABLE "prescricoes" ADD COLUMN IF NOT EXISTS "assinatura_hash" TEXT;

-- Sincronização de campos faltantes em Historia Clinica
ALTER TABLE "historiaClinica" ADD COLUMN IF NOT EXISTS "antecedentes_familiares" JSONB;
ALTER TABLE "historiaClinica" ADD COLUMN IF NOT EXISTS "descricao_sintomas" TEXT;
ALTER TABLE "historiaClinica" ADD COLUMN IF NOT EXISTS "estilo_vida" JSONB;
ALTER TABLE "historiaClinica" ADD COLUMN IF NOT EXISTS "historico_pessoal" JSONB;
ALTER TABLE "historiaClinica" ADD COLUMN IF NOT EXISTS "queixa_principal" TEXT;

-- Sincronização de campos faltantes em Consultas
ALTER TABLE "consultas" ADD COLUMN IF NOT EXISTS "observacao_tecnica" TEXT;
ALTER TABLE "consultas" ADD COLUMN IF NOT EXISTS "especialidade_seguimento" VARCHAR(100);
