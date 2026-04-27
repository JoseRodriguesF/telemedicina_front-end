import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed de médicos pendentes...')

  const doctors = [
    {
      email: 'dr.roberto@example.com',
      nome: 'Dr. Roberto Santos',
      crm: '123456',
      uf: 'SP',
      especialidade: 'Cardiologia',
      cpf: '11122233344'
    },
    {
      email: 'dra.julia@example.com',
      nome: 'Dra. Julia Mendes',
      crm: '654321',
      uf: 'RJ',
      especialidade: 'Pediatria',
      cpf: '55566677788'
    },
    {
      email: 'dr.marcos@example.com',
      nome: 'Dr. Marcos Oliveira',
      crm: '987654',
      uf: 'MG',
      especialidade: 'Dermatologia',
      cpf: '99900011122'
    }
  ]

  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'admin123', 10)

  for (const doc of doctors) {
    // Verificar se usuário já existe
    const existing = await prisma.usuario.findUnique({ where: { email: doc.email } })
    if (existing) {
      console.log(`Médico ${doc.email} já existe, pulando...`)
      continue
    }

    // Criar usuário
    const user = await prisma.usuario.create({
      data: {
        email: doc.email,
        senha_hash: passwordHash,
        tipo_usuario: 'medico',
        registroFull: true,
        medico: {
          create: {
            nome_completo: doc.nome,
            crm: doc.crm,
            crm_uf: doc.uf,
            especialidade: doc.especialidade,
            cpf: doc.cpf,
            data_nascimento: new Date(1980, 5, 15),
            verificacao: 'analise', // Estado pendente
            diploma_url: 'docs/diploma_dummy.pdf',
            especializacao_url: 'docs/espec_dummy.pdf'
          }
        }
      }
    })

    console.log(`Médico criado: ${doc.nome} (${doc.email})`)
  }

  console.log('Seed de médicos pendentes finalizado!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
