import { FastifyReply, FastifyRequest } from 'fastify'
import { chatWithOpenAI, transcreverConsulta, resumirTranscricao, diarizarTranscricao, chatWithDoctorAssistant, client } from '../services/openaiService'
import prisma from '../config/database'
import { ChatMessage } from '../services/openaiService'
import logger from '../utils/logger'
import { HistoriaClinicaService } from '../services/historiaClinicaService'

const historiaService = new HistoriaClinicaService()

interface ChatBody {
  message: string
  history?: ChatMessage[]
  tipoConsulta?: string
}

interface ConfirmTriagemBody {
  dadosEstruturados: any
}

/**
 * Normaliza chaves camelCase para snake_case nos dados da IA
 */
function normalizarCamelCaseParaSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj
  if (typeof obj !== 'object') return obj
  const map: Record<string, string> = {
    queixaPrincipal: 'queixa_principal',
    descricaoSintomas: 'descricao_sintomas',
    historicoPessoal: 'historico_pessoal',
    antecedentesFamiliares: 'antecedentes_familiares',
    estiloVida: 'estilo_vida',
    vacinacao: 'vacinacao'
  }
  const out: any = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = map[k] || k
    out[key] = typeof v === 'object' && v !== null && !Array.isArray(v) ? normalizarCamelCaseParaSnake(v) : v
  }
  return out
}

function validarESanitizarDados(dados: any): any {
  if (!dados || typeof dados !== 'object') {
    throw new Error('Dados estruturados inválidos')
  }

  dados = normalizarCamelCaseParaSnake(dados)

  if (dados.historico_pessoal) {
    const hp = dados.historico_pessoal

    if (hp.doencas && !Array.isArray(hp.doencas)) {
      hp.doencas = typeof hp.doencas === 'string' ? [hp.doencas] : []
    } else if (!hp.doencas) {
      hp.doencas = []
    }

    if (hp.medicamentos && !Array.isArray(hp.medicamentos)) {
      hp.medicamentos = typeof hp.medicamentos === 'string' ? [hp.medicamentos] : []
    } else if (!hp.medicamentos) {
      hp.medicamentos = []
    }

    if (hp.alergias && !Array.isArray(hp.alergias)) {
      hp.alergias = typeof hp.alergias === 'string' ? [hp.alergias] : []
    } else if (!hp.alergias) {
      hp.alergias = []
    }

    hp.doencas = hp.doencas.filter((d: any) => d && typeof d === 'string' && d.trim())
    hp.medicamentos = hp.medicamentos.filter((m: any) => m && typeof m === 'string' && m.trim())
    hp.alergias = hp.alergias.filter((a: any) => a && typeof a === 'string' && a.trim())
  } else {
    dados.historico_pessoal = { doencas: [], medicamentos: [], alergias: [] }
  }

  if (!dados.antecedentes_familiares || typeof dados.antecedentes_familiares !== 'object') {
    dados.antecedentes_familiares = {}
  }

  if (!dados.estilo_vida || typeof dados.estilo_vida !== 'object') {
    dados.estilo_vida = {}
  }

  const rawConteudo = dados.conteudo
  if (rawConteudo == null || (typeof rawConteudo !== 'string' && typeof rawConteudo !== 'number') || String(rawConteudo).trim() === '') {
    // Fallback caso a IA esqueça o conteúdo estruturado
    dados.conteudo = `### **TRIAGEM CONCLUÍDA**\n\n**Queixa Principal:** ${dados.queixa_principal || 'Não informada'}\n**Sintomas:** ${dados.descricao_sintomas || 'Não informados'}`
  } else {
    dados.conteudo = String(rawConteudo).trim()
  }

  return dados
}

function formatarContextoHistorico(resumo: string | null): string {
  if (!resumo || resumo.trim() === '') {
    return 'Este é o primeiro atendimento do paciente. Nenhum histórico médico registrado anteriormente.'
  }
  return `IMPORTANTE: O paciente já possui o seguinte histórico médico registrado em atendimentos anteriores:\n\n${resumo}\n\nVocê PODE usar essas informações como referência, mas SEMPRE confirme com o paciente se houve mudanças. NÃO presuma que tudo permanece igual.`
}

/**
 * Endpoint principal de chat com a IA de triagem.
 * Quando a triagem é concluída, retorna os dados estruturados para confirmação
 * do paciente — NÃO salva automaticamente no banco.
 */
export async function openaiChatController(req: FastifyRequest<{ Body: ChatBody }>, reply: FastifyReply) {
  try {
    const { message, history = [] } = req.body

    if (!message || typeof message !== 'string') {
      return reply.code(400).send({ error: 'message é obrigatório e deve ser string' })
    }

    if (history && (!Array.isArray(history) || !history.every(m => m.role && m.content))) {
      return reply.code(400).send({ error: 'history deve ser um array de mensagens com role e content' })
    }

    const user = req.user
    if (!user || !user.id) {
      return reply.code(401).send({ error: 'usuário_não_autenticado' })
    }

    let nomePaciente: string | null = null
    let contextoHistorico: string = ''

    if (user.tipo_usuario === 'paciente') {
      const paciente = await prisma.paciente.findUnique({
        where: { usuario_id: user.id },
        select: {
          id: true,
          nome_completo: true,
          historiaClinicaResumo: true
        }
      })

      if (paciente) {
        nomePaciente = paciente.nome_completo
        contextoHistorico = formatarContextoHistorico(paciente.historiaClinicaResumo)
      }
    }

    // Lógica de pulo de pergunta e detecção de conclusão forçada
    let finalMessage = message
    if (message === '[PULAR_PERGUNTA]') {
      let skipCount = 1
      // Conta quantos pulos consecutivos o usuário deu no histórico
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === 'user') {
          if (history[i].content === '[PULAR_PERGUNTA]') {
            skipCount++
          } else {
            // Qualquer outra mensagem do usuário quebra a sequência
            break
          }
        }
      }

      if (skipCount >= 3) {
        logger.info(`Usuário pulou 3 perguntas consecutivas. Forçando conclusão da triagem.`, { userId: user.id })
        finalMessage = '[FORCAR_CONCLUSAO] O usuário pulou 3 perguntas consecutivas. Conclua a triagem agora.'
      }
    }

    // LGPD/CFM: Anonimização de PII (Personally Identifiable Information) ao enviar para IA generativa.
    // Usamos um identificador genérico em vez do nome real do paciente para mitigar riscos de privacidade.
    const { answer, completed, dadosEstruturados } = await chatWithOpenAI(
      finalMessage,
      'Paciente', // Anonimizado conforme LGPD
      history || [],
      contextoHistorico
    )

    // Triagem concluída: retornar dados para confirmação do paciente.
    // O salvamento só ocorre após confirmação via POST /chat-ia/confirmar
    let finalDados = dadosEstruturados
    
    if (completed && !finalDados) {
      logger.warn('[FALLBACK] Triagem concluída sem JSON estruturado. Criando dados básicos a partir da resposta.', { userId: user.id })
      
      // Tenta extrair uma queixa principal básica do início da resposta se for curta, 
      // ou usa um prefixo padrão mais amigável.
      const queixaFallback = answer.length < 100 ? answer : 'Dados coletados pela IA durante a triagem';
      
      finalDados = {
        queixa_principal: queixaFallback,
        conteudo: answer,
        historico_pessoal: { doencas: [], medicamentos: [], alergias: [] },
        antecedentes_familiares: {},
        estilo_vida: {}
      }
    }

    if (completed && finalDados) {
      try {
        const dadosValidados = validarESanitizarDados(finalDados)
        return reply.send({
          answer,
          completed,
          dadosEstruturados: dadosValidados,
          historiaClinicaSalva: false,
          aguardandoConfirmacao: true
        })
      } catch (err) {
        logger.error('Erro ao validar dados estruturados da triagem', err as Error, { userId: user.id })
        return reply.send({
          answer,
          completed,
          historiaClinicaSalva: false,
          erro: 'Erro ao processar dados da triagem'
        })
      }
    }

    return reply.send({ answer, completed })
  } catch (err: any) {
    logger.error('Failed to call OpenAI API', err, {
      userId: (req as any).user?.id,
      messageLength: req.body.message?.length
    })
    return reply.code(500).send({ error: 'erro_ao_chamar_openai' })
  }
}

/**
 * Confirma a triagem e salva a história clínica no banco de dados.
 * Chamado pelo frontend APÓS o paciente revisar e aprovar o relatório gerado.
 */
export async function confirmTriagemController(req: FastifyRequest<{ Body: ConfirmTriagemBody }>, reply: FastifyReply) {
  try {
    const user = req.user
    if (!user || !user.id) {
      return reply.code(401).send({ error: 'usuário_não_autenticado' })
    }

    if (user.tipo_usuario !== 'paciente') {
      return reply.code(403).send({ error: 'apenas_pacientes_podem_confirmar_triagem' })
    }

    const { dadosEstruturados } = req.body
    if (!dadosEstruturados) {
      return reply.code(400).send({ error: 'dadosEstruturados é obrigatório' })
    }

    const paciente = await prisma.paciente.findUnique({
      where: { usuario_id: user.id },
      select: { id: true }
    })

    if (!paciente) {
      return reply.code(404).send({ error: 'paciente_nao_encontrado' })
    }

    const dadosValidados = validarESanitizarDados(dadosEstruturados)
    const historiaClinica = await historiaService.criarHistoriaClinica(paciente.id, dadosValidados)

    logger.info('História clínica salva após confirmação do paciente', {
      historiaClinicaId: historiaClinica.id,
      pacienteId: paciente.id,
      usuarioId: user.id
    })

    return reply.send({
      ok: true,
      historiaClinicaSalva: true,
      historiaClinicaId: historiaClinica.id
    })
  } catch (err: any) {
    logger.error('Erro ao confirmar triagem', err, { userId: (req as any).user?.id })
    return reply.code(500).send({ error: 'erro_ao_confirmar_triagem' })
  }
}

/**
 * Recebe o áudio da consulta, transcreve integralmente e identifica falantes
 */
export async function transcreverConsultaController(
  req: FastifyRequest<{ Body: { audio: string; filename?: string } }>,
  reply: FastifyReply
) {
  try {
    const user = req.user
    if (!user || user.tipo_usuario !== 'medico') {
      return reply.code(403).send({ error: 'apenas_medicos_podem_transcrever_consultas' })
    }

    const { audio, filename } = req.body
    if (!audio) {
      return reply.code(400).send({ error: 'audio_obrigatorio_base64' })
    }

    logger.info(`Iniciando transcrição integral de áudio via OpenAI para médico ${user.id}`)
    
    const audioBuffer = Buffer.from(audio, 'base64')
    const bruta = await transcreverConsulta(audioBuffer, filename || 'consulta.webm')
    
    logger.info(`Transcrição bruta concluída. Identificando falantes...`)
    const transcricao = await diarizarTranscricao(bruta)

    return reply.send({
      ok: true,
      transcricao,
      bruta // Opcional, mantido para debug
    })
  } catch (err: any) {
    logger.error('Erro ao transcrever consulta com identificação de falantes', err, { userId: (req as any).user?.id })
    return reply.code(500).send({ error: 'erro_no_processamento_de_audio' })
  }
}

/**
 * Pega uma transcrição completa e gera um resumo clínico rústico
 */
export async function resumirTranscricaoController(
  req: FastifyRequest<{ Body: { transcricao: string } }>,
  reply: FastifyReply
) {
  try {
    const user = req.user
    if (!user || user.tipo_usuario !== 'medico') {
      return reply.code(403).send({ error: 'apenas_medicos_podem_resumir_consultas' })
    }

    const { transcricao } = req.body
    if (!transcricao) {
      return reply.code(400).send({ error: 'transcricao_obrigatoria_para_resumo' })
    }

    logger.info(`Gerando resumo final de consulta para médico ${user.id}`)
    
    const resumo = await resumirTranscricao(transcricao)

    return reply.send({
      ok: true,
      resumo
    })
  } catch (err: any) {
    logger.error('Erro ao gerar resumo da consulta', err, { userId: (req as any).user?.id })
    return reply.code(500).send({ error: 'erro_ao_gerar_resumo' })
  }
}
interface AssistantBody {
  message: string
  history?: ChatMessage[]
  context?: any
}

/**
 * Controller do Assistente Digital para Médicos
 */
export async function doctorAssistantController(req: FastifyRequest<{ Body: AssistantBody }>, reply: FastifyReply) {
  try {
    const user = req.user
    if (!user || user.tipo_usuario !== 'medico') {
      return reply.code(403).send({ error: 'acesso_restrito_a_medicos' })
    }

    const { message, history = [], context = {} } = req.body
    if (!message) return reply.code(400).send({ error: 'mensagem_obrigatoria' })

    const medico = await prisma.medico.findUnique({ where: { usuario_id: user.id } })
    if (!medico) return reply.code(404).send({ error: 'medico_nao_encontrado' })

    let result = await chatWithDoctorAssistant(message, history, context)

    // Resolver tool calls (Loop para até 3 iterações para evitar loops infinitos)
    let iterations = 0
    while (result.tool_calls && iterations < 3) {
      iterations++
      const toolOutputs: any[] = []

      for (const toolCall of (result.tool_calls as any[])) {
        if (toolCall.type !== 'function') continue

        const functionName = toolCall.function.name
        const args = JSON.parse(toolCall.function.arguments)
        let output = ''

        if (functionName === 'get_doctor_patients') {
          const consultas = await prisma.consulta.findMany({
            where: { medicoId: medico.id },
            select: {
              paciente: {
                select: {
                  id: true,
                  nome_completo: true
                }
              }
            },
            distinct: ['pacienteId'],
            take: 20,
            orderBy: { createdAt: 'desc' }
          })
          
          if (consultas.length === 0) {
            output = 'Você ainda não atendeu nenhum paciente.'
          } else {
            output = 'Lista de pacientes recentes:\n' + consultas.map((c: any) => `- ID: ${c.paciente.id}, Nome: ${c.paciente.nome_completo}`).join('\n')
          }
        } else {
          // Segurança: Verificar se o médico tem acesso ao paciente
          const pacienteId = Number(args.pacienteId)
          if (isNaN(pacienteId)) {
            output = "ERRO: pacienteId inválido."
          } else {
            const temAcesso = await prisma.consulta.findFirst({
              where: {
                pacienteId,
                medicoId: medico.id
              }
            })

            if (!temAcesso) {
              output = `ERRO DE PRIVACIDADE: O médico logado não possui registros de atendimento com o paciente ID ${pacienteId} e não tem permissão para acessar seus dados.`
            } else {
              if (functionName === 'get_patient_stats') {
                const stats = await prisma.consulta.groupBy({
                  by: ['status'],
                  where: { pacienteId },
                  _count: true
                })
                const total = await prisma.consulta.count({ where: { pacienteId } })
                output = `O paciente ID ${pacienteId} possui ${total} consultas no total. Distribuição por status: ${JSON.stringify(stats)}`
              } 
              else if (functionName === 'get_patient_history') {
                const paciente = await prisma.paciente.findUnique({
                  where: { id: pacienteId },
                  select: { historiaClinicaResumo: true, nome_completo: true }
                })
                output = paciente 
                  ? `Histórico de ${paciente.nome_completo}: ${paciente.historiaClinicaResumo || 'Sem resumo cadastrado.'}`
                  : 'Paciente não encontrado.'
              }
              else if (functionName === 'get_patient_consultations') {
                const historico = await prisma.consulta.findMany({
                  where: { pacienteId, medicoId: medico.id },
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                  select: {
                    id: true,
                    data_consulta: true,
                    status: true,
                    diagnostico: true,
                    evolucao: true,
                    plano_terapeutico: true,
                    resumo: true
                  }
                })
                
                if (historico.length === 0) {
                  output = "Nenhuma consulta encontrada com este paciente."
                } else {
                  output = "Consultas recentes com o paciente:\n" + historico.map((c: any) => {
                    return `Consulta ID: ${c.id} | Status: ${c.status}\nData: ${c.data_consulta}\nDiagnóstico: ${c.diagnostico || 'N/A'}\nEvolução: ${c.evolucao || 'N/A'}\nPlano Terapêutico: ${c.plano_terapeutico || 'N/A'}\nResumo: ${c.resumo || 'N/A'}\n---`
                  }).join('\n')
                }
              }
            }
          }
        }

        toolOutputs.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: output
        })
      }

      // Envia de volta para a OpenAI com os resultados das ferramentas
      const nextMessages: any[] = [
        { 
          role: 'system', 
          content: 'Você é o Assistente Digital da Matriarca Telemedicina. Respeite as regras de privacidade: não fale sobre dados que retornaram erro de acesso. Responda em Português do Brasil usando Markdown.' 
        },
        ...history.map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
        { role: 'assistant', content: result.answer, tool_calls: result.tool_calls },
        ...toolOutputs
      ]

      const nextResponse = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: nextMessages
      })

      const nextMsg = nextResponse.choices[0].message
      result = {
        answer: nextMsg.content || '',
        tool_calls: nextMsg.tool_calls,
        role: 'assistant'
      }
    }

    return reply.send({ ok: true, answer: result.answer })
  } catch (err: any) {
    logger.error('Erro no Assistente do Médico', err)
    return reply.code(500).send({ error: 'erro_interno_assistente' })
  }
}
