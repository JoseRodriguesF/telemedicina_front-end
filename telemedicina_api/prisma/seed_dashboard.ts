import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando povoamento massivo para o Painel Admin...')

  // 1. Limpeza opcional (comentada por segurança, mas recomendada se quiser dados limpos)
  // await prisma.trilhaAuditoria.deleteMany({})
  // await prisma.consulta.deleteMany({})

  // 2. Criar Admins Adicionais
  const adminEmails = ['suporte@matriarca.com.br', 'diretoria@matriarca.com.br']
  for (const email of adminEmails) {
    await prisma.usuario.upsert({
      where: { email },
      update: {},
      create: {
        email,
        senha_hash: '$2b$12$HCPObsbLC6/jVspGSfKyhuxbqu5jHBNz6dBZYzDSFPxEBTbpj2Yla', // admin123
        tipo_usuario: 'admin',
        registroFull: true
      }
    })
  }

  // 3. Criar Médicos com especialidades variadas
  const especialidades = ['Cardiologia', 'Pediatria', 'Clínica Geral', 'Ortopedia', 'Ginecologia', 'Dermatologia']
  const medicosData = [
    { nome: 'Dr. Arthur Antunes', crm: '11111', uf: 'SP', esp: 'Cardiologia' },
    { nome: 'Dra. Beatriz Barbosa', crm: '22222', uf: 'RJ', esp: 'Pediatria' },
    { nome: 'Dr. Caio Castro', crm: '33333', uf: 'MG', esp: 'Clínica Geral' },
    { nome: 'Dra. Daniela Duarte', crm: '44444', uf: 'PR', esp: 'Ortopedia' },
    { nome: 'Dr. Eduardo Estrela', crm: '55555', uf: 'SC', esp: 'Ginecologia' },
    { nome: 'Dra. Fernanda Freitas', crm: '66666', uf: 'BA', esp: 'Dermatologia' },
    { nome: 'Dr. Gabriel Gouveia', crm: '77777', uf: 'DF', esp: 'Cardiologia' },
    { nome: 'Dra. Helena Hipólito', crm: '88888', uf: 'ES', esp: 'Clínica Geral' }
  ]

  const medicos = []
  for (const m of medicosData) {
    const medico = await prisma.medico.upsert({
      where: { cpf: `CPF_${m.crm}` },
      update: { verificacao: 'verificado' },
      create: {
        nome_completo: m.nome,
        cpf: `CPF_${m.crm}`,
        crm: m.crm,
        crm_uf: m.uf,
        especialidade: m.esp,
        data_nascimento: new Date(1975 + Math.floor(Math.random() * 20), 0, 1),
        verificacao: 'verificado',
        usuario: {
          create: {
            email: `${m.nome.toLowerCase().replace(' ', '.')}@medico.com`,
            tipo_usuario: 'medico',
            registroFull: true
          }
        }
      }
    })
    medicos.push(medico)
  }

  // 4. Criar Médicos Pendentes (para o painel de verificação)
  await prisma.medico.upsert({
    where: { cpf: 'CPF_PENDENTE_1' },
    update: {},
    create: {
      nome_completo: 'Dr. Candidato Novo',
      cpf: 'CPF_PENDENTE_1',
      crm: '99901',
      crm_uf: 'SP',
      especialidade: 'Neurologia',
      data_nascimento: new Date(1985, 5, 10),
      verificacao: 'analise',
      usuario: {
        create: {
          email: 'candidato@medico.com',
          tipo_usuario: 'medico'
        }
      }
    }
  })

  // 5. Criar Pacientes variados
  const generos = ['Masculino', 'Feminino', 'Outro']
  const pacientes = []
  for (let i = 1; i <= 20; i++) {
    const paciente = await prisma.paciente.upsert({
      where: { cpf: `CPF_PAC_${i}` },
      update: {},
      create: {
        nome_completo: `Paciente Exemplo ${i}`,
        cpf: `CPF_PAC_${i}`,
        sexo: generos[i % 3],
        estado_civil: 'Solteiro',
        telefone: `1199999${i.toString().padStart(4, '0')}`,
        data_nascimento: new Date(1970 + i, i % 12, i % 28),
        usuario: {
          create: {
            email: `paciente${i}@teste.com`,
            tipo_usuario: 'paciente',
            registroFull: true
          }
        }
      }
    })
    pacientes.push(paciente)
  }

  // 6. Criar Consultas (Distribuição estatística)
  console.log('📅 Gerando histórico de consultas...')
  const cids = ['I10', 'J00', 'E11', 'M54', 'Z00', 'B34', 'R05', 'N39']
  const statuses = ['finished', 'finished', 'finished', 'cancelled', 'scheduled']
  
  const consultas = []
  const hoje = new Date()

  for (let i = 0; i < 150; i++) {
    const diasAtras = Math.floor(Math.random() * 30)
    const hora = 8 + Math.floor(Math.random() * 12) // Entre 08h e 20h
    
    const dataConsulta = new Date(hoje)
    dataConsulta.setDate(hoje.getDate() - diasAtras)
    
    const horaInicio = new Date(dataConsulta)
    horaInicio.setUTCHours(hora, 0, 0, 0)

    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    consultas.push({
      pacienteId: pacientes[Math.floor(Math.random() * pacientes.length)].id,
      medicoId: medicos[Math.floor(Math.random() * medicos.length)].id,
      status: status as any,
      data_consulta: dataConsulta,
      hora_inicio: horaInicio,
      cid: status === 'finished' ? cids[Math.floor(Math.random() * cids.length)] : null,
      diagnostico: status === 'finished' ? 'Diagnóstico de exemplo gerado via seed' : null
    })
  }

  await prisma.consulta.createMany({ data: consultas })

  // 7. Criar Trilha de Auditoria
  console.log('🔐 Gerando logs de auditoria...')
  const acoes = ['LOGIN', 'APPROVE_MEDICO', 'ACCESS_STATS', 'DOWNLOAD_DOCUMENT', 'UPDATE_CONFIG']
  const logs = []
  for (let i = 0; i < 50; i++) {
    logs.push({
      usuarioId: 1, // Admin principal
      acao: acoes[Math.floor(Math.random() * acoes.length)],
      recurso: 'SISTEMA',
      detalhes: `Ação automática gerada para teste de painel #${i}`,
      ip: `192.168.1.${10 + i}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AdminDashboard/1.0'
    })
  }
  await prisma.trilhaAuditoria.createMany({ data: logs })

  console.log(`✅ Sucesso! Dados gerados:
    - 2 Novos Admins
    - 8 Médicos Verificados
    - 1 Médico em Análise
    - 20 Pacientes
    - 150 Consultas distribuídas nos últimos 30 dias
    - 50 Logs de auditoria
  `)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
