import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando limpeza do banco de dados...');
  
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "enderecos", "consulta_anexos", "eventos_tecnicos", "trilha_auditoria", "prescricoes", "historiaClinica", "consultas", "medicos", "pacientes", "usuarios" CASCADE;`);
    console.log('Banco de dados limpo com sucesso.');
  } catch (error) {
    console.error('Erro ao limpar o banco:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
