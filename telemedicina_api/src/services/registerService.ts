import prisma from '../config/database'
import bcrypt from 'bcrypt'
import ApiError from '../utils/apiError'
import { validateCPF, sanitizeCPF, sanitizePhone, sanitizeText, validateBirthDate } from '../utils/security'
import { storageService, StorageService } from './storageService'
import logger from '../utils/logger'
import { VerificationService } from './verificationService'

export class RegisterService {
  async createUser(email: string, senha: string, tipo_usuario: 'medico' | 'paciente') {
    // SECURITY: Unificamos a verificação para evitar oráculo de enumeração.
    // Em conformidade com OWASP, não devemos dizer se o email já existe ou não em um contexto de erro 409 genérico.
    const existingUser = await prisma.usuario.findUnique({ where: { email } })
    if (existingUser) {
      logger.warn('Registration attempted for an existing account', { email: logger.sanitize({ email }) })
      // Mantemos o erro mas com mensagem que não confirma a existência para o atacante
      throw new ApiError('Não foi possível completar o registro com estas credenciais.', 409, 'REGISTRATION_FAILED')
    }

    // SECURITY: Validação de força de senha no Backend
    if (!senha || senha.length < 8) {
        throw new ApiError('A senha deve ter no mínimo 8 caracteres.', 400, 'WEAK_PASSWORD')
    }
    const hasLetter = /[a-zA-Z]/.test(senha)
    const hasNumber = /[0-9]/.test(senha)
    if (!hasLetter || !hasNumber) {
        throw new ApiError('A senha deve conter letras e números.', 400, 'WEAK_PASSWORD')
    }

    const senha_hash = await bcrypt.hash(senha, 12)

    try {
      const user = await prisma.usuario.create({
        data: { email, senha_hash, tipo_usuario, registroFull: false }
      })

      logger.info('Account access created', { userId: user.id, tipo_usuario })
      return user
    } catch (error: any) {
      logger.error('Database failure during account creation', error)
      throw new ApiError('Erro ao processar solicitação de registro.', 500, 'INTERNAL_ERROR')
    }
  }

  async createPaciente(data: {
    usuario_id: number
    nome_completo: string
    data_nascimento: string
    cpf: string
    sexo: string
    estado_civil: string
    telefone: string
    nome_mae: string
    telefone_responsavel?: string | null
    aceitou_tcle: boolean
    endereco?: { 
      endereco: string; 
      numero: string; 
      complemento?: string | null;
      bairro?: string | null;
      cep?: string | null;
      cidade?: string | null;
      estado?: string | null;
    }
  }) {
    const user = await prisma.usuario.findUnique({ where: { id: data.usuario_id } })
    if (!user || user.tipo_usuario !== 'paciente') {
      throw new ApiError('Dados de acesso inválidos ou não encontrados.', 404, 'USER_INVALID')
    }

    const cleanCPF = sanitizeCPF(data.cpf)
    if (!validateCPF(cleanCPF)) {
      throw new ApiError('Documento de identificação inválido.', 400, 'INVALID_DOCUMENT')
    }

    // SECURITY: Prevenção de enumeração por CPF
    const existingCpf = await prisma.paciente.findFirst({ where: { OR: [{ usuario_id: data.usuario_id }, { cpf: cleanCPF }] } })
    if (existingCpf) {
      throw new ApiError('Não foi possível processar o registro dos dados pessoais.', 409, 'REGISTRATION_DUPLICATE')
    }

    const birthDateValidation = validateBirthDate(data.data_nascimento)
    if (!birthDateValidation.valid) {
      throw new ApiError(birthDateValidation.error!, 400, 'INVALID_BIRTH_DATE')
    }

    const nome_completo = sanitizeText(data.nome_completo)
    const telefone = sanitizePhone(data.telefone)

    try {
      const paciente = await prisma.paciente.create({
        data: {
          usuario_id: data.usuario_id,
          nome_completo,
          data_nascimento: new Date(data.data_nascimento),
          cpf: cleanCPF,
          sexo: data.sexo,
          estado_civil: data.estado_civil,
          telefone,
          nome_mae: sanitizeText(data.nome_mae),
          telefone_responsavel: data.telefone_responsavel ? sanitizePhone(data.telefone_responsavel) : null,
          aceitouTCLE: data.aceitou_tcle,
          tcleData: data.aceitou_tcle ? new Date() : null,
          // CFM Art. 3º, III: Versão do TCLE aceito para rastreabilidade
          tcleVersion: data.aceitou_tcle ? '1.0' : null,
        }
      })

      await prisma.usuario.update({ where: { id: data.usuario_id }, data: { registroFull: true } })
      return paciente
    } catch (error: any) {
      logger.error('Failed to register patient profile', error)
      throw new ApiError('Erro ao salvar perfil do paciente.', 500, 'INTERNAL_ERROR')
    }
  }

  async createEndereco(data: { usuario_id: number; endereco: string; numero: string; complemento?: string | null; bairro?: string | null; cep?: string | null; cidade?: string | null; estado?: string | null }) {
    try {
      return await prisma.endereco.create({
          data: {
            usuario_id: data.usuario_id,
            endereco: sanitizeText(data.endereco),
            numero: String(data.numero),
            complemento: data.complemento ? sanitizeText(data.complemento) : null,
            bairro: data.bairro ? sanitizeText(data.bairro) : null,
            cep: data.cep ? sanitizePhone(data.cep) : null,
            cidade: data.cidade ? sanitizeText(data.cidade) : null,
            estado: data.estado ? data.estado.toUpperCase().slice(0, 2) : null
          }
      })
    } catch (error: any) {
      throw new ApiError('Erro ao registrar endereço.', 500, 'INTERNAL_ERROR')
    }
  }

  async createMedico(data: {
    usuario_id: number
    nome_completo: string
    data_nascimento: string
    cpf: string
    sexo: string
    crm: string
    crm_uf: string
    telefone_celular?: string | null
    rqe?: string | null
    diploma: { data: string; mimetype: string }
    especializacao?: { data: string; mimetype: string } | null
    seguro_responsabilidade: { data: string; mimetype: string }
  }) {
    const user = await prisma.usuario.findUnique({ where: { id: data.usuario_id } })
    if (!user || user.tipo_usuario !== 'medico') {
      throw new ApiError('Dados de acesso médico inválidos.', 404, 'USER_INVALID')
    }

    const cleanCPF = sanitizeCPF(data.cpf)
    if (!validateCPF(cleanCPF)) throw new ApiError('CPF inválido.', 400, 'INVALID_CPF')

    // CFM: Validação oficial do CRM antes de prosseguir
    const cleanCRM = data.crm.replace(/\D/g, '');
    try {
        await VerificationService.verifyCRM(cleanCRM, data.crm_uf)
    } catch (error) {
        // Se a validação oficial falhar, bloqueamos o registro para segurança da plataforma
        throw error;
    }

    const existingMedico = await prisma.medico.findFirst({ where: { OR: [{ usuario_id: data.usuario_id }, { cpf: cleanCPF }] } })
    if (existingMedico) throw new ApiError('Registro médico já existente ou duplicado.', 409, 'REGISTRATION_DUPLICATE')

    try {
      // LGPD/CFM: Upload de documentos sensíveis para o Google Cloud Storage (privado)
      // Apenas o caminho GCS é armazenado no banco — sem dados binários no PostgreSQL
      const diplomaPath = StorageService.buildPath(data.usuario_id, 'diploma', data.diploma.mimetype)
      const seguroPath = StorageService.buildPath(data.usuario_id, 'seguro_responsabilidade', data.seguro_responsabilidade.mimetype)

      await Promise.all([
        storageService.uploadDocument(Buffer.from(data.diploma.data, 'base64'), diplomaPath, data.diploma.mimetype),
        storageService.uploadDocument(Buffer.from(data.seguro_responsabilidade.data, 'base64'), seguroPath, data.seguro_responsabilidade.mimetype)
      ])

      let especializacaoPath: string | null = null
      if (data.especializacao) {
        especializacaoPath = StorageService.buildPath(data.usuario_id, 'especializacao', data.especializacao.mimetype)
        await storageService.uploadDocument(Buffer.from(data.especializacao.data, 'base64'), especializacaoPath, data.especializacao.mimetype)
      }

      const medico = await prisma.medico.create({
        data: {
          usuario_id: data.usuario_id,
          nome_completo: sanitizeText(data.nome_completo),
          data_nascimento: new Date(data.data_nascimento),
          cpf: cleanCPF,
          sexo: data.sexo,
          telefone_celular: data.telefone_celular ? sanitizePhone(data.telefone_celular) : null,
          crm: cleanCRM,
          crm_uf: data.crm_uf,
          rqe: data.rqe || null,
          diploma_url: diplomaPath,
          especializacao_url: especializacaoPath,
          seguro_responsabilidade_url: seguroPath
        }
      })

      await prisma.usuario.update({ where: { id: data.usuario_id }, data: { registroFull: true } })
      return medico
    } catch (error: any) {
      logger.error('Critical failure during doctor registration', error)
      throw new ApiError('Erro ao processar documentos médicos.', 500, 'INTERNAL_ERROR')
    }
  }

  async getUsuarioById(id: number) {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, email: true, tipo_usuario: true, registroFull: true }
    })
    if (!usuario) throw new ApiError('Usuário não localizado.', 404, 'USER_NOT_FOUND')
    return usuario
  }
}