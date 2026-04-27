-- CFM 2.314/2022 Art. 3º, III - Rastreabilidade da versão do TCLE aceito pelo paciente
-- Campo nullable: pacientes existentes terão NULL (aceite anterior ao versionamento)
-- Novos cadastros recebem a versão "1.0" automaticamente via registerService.ts

ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "tcle_version" VARCHAR(10) DEFAULT '1.0';
