import nodemailer from 'nodemailer'
import logger from '../utils/logger'

/**
 * Serviço de Email para notificações automáticas da plataforma.
 * 
 * Variáveis de ambiente necessárias:
 * - SMTP_HOST (ex: smtp.gmail.com)
 * - SMTP_PORT (ex: 587)
 * - SMTP_USER (ex: noreply@seudominio.com)
 * - SMTP_PASS (senha do email ou App Password)
 * - SMTP_FROM (ex: "Matriarca Telemedicina <noreply@seudominio.com>")
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
})

const FROM = process.env.SMTP_FROM || '"Matriarca Telemedicina" <noreply@matriarca.com>'

export class EmailService {
  /**
   * Envia email informando que os documentos foram recebidos e estão em análise.
   */
  static async sendDocumentsUnderReview(email: string, nomeCompleto: string): Promise<void> {
    const firstName = nomeCompleto.split(' ')[0] || nomeCompleto

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Documentos Recebidos</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Plataforma Matriarca Telemedicina</p>
        </div>
        
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; color: #1f2937; margin: 0 0 16px;">
            Olá, <strong>Dr(a). ${firstName}</strong>!
          </p>
          
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 16px;">
            Seus documentos profissionais foram recebidos com sucesso e agora estão <strong>em análise</strong> pela nossa equipe administrativa.
          </p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #166534; font-size: 14px; margin: 0; font-weight: 500;">
              📋 O que acontece agora?
            </p>
            <ul style="color: #166534; font-size: 14px; margin: 8px 0 0; padding-left: 20px; line-height: 1.8;">
              <li>Nossa equipe irá verificar seus documentos</li>
              <li>O prazo médio de análise é de <strong>até 48 horas úteis</strong></li>
              <li>Você receberá um email com o resultado da análise</li>
              <li>Enquanto isso, você pode navegar pela plataforma normalmente</li>
            </ul>
          </div>

          <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 16px 0 0;">
            Caso tenha alguma dúvida, entre em contato com nosso suporte.
          </p>
        </div>

        <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">
            Este é um email automático. Por favor, não responda diretamente.
          </p>
        </div>
      </div>
    `

    try {
      await transporter.sendMail({
        from: FROM,
        to: email,
        subject: '📋 Documentos em Análise — Matriarca Telemedicina',
        html,
      })
      logger.info('Email de documentos em análise enviado', { email })
    } catch (error: any) {
      logger.error('Falha ao enviar email de documentos em análise', error, { email })
      // Não lançamos erro para não bloquear o fluxo principal
    }
  }

  /**
   * Envia email informando o resultado da análise dos documentos (aprovado ou recusado).
   */
  static async sendVerificationResult(
    email: string,
    nomeCompleto: string,
    status: 'verificado' | 'recusado',
    observacao?: string
  ): Promise<void> {
    const firstName = nomeCompleto.split(' ')[0] || nomeCompleto
    const isApproved = status === 'verificado'

    const statusBadge = isApproved
      ? '<span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 14px;">✅ Aprovado</span>'
      : '<span style="background: #fef2f2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 14px;">❌ Recusado</span>'

    const mainMessage = isApproved
      ? `Parabéns! Seus documentos foram <strong>aprovados</strong> pela nossa equipe. Agora você pode utilizar todas as funcionalidades da plataforma, incluindo atender consultas, emitir prescrições e utilizar a assinatura digital.`
      : `Infelizmente, seus documentos foram <strong>recusados</strong> pela nossa equipe. ${observacao ? `<br/><br/><strong>Motivo:</strong> ${observacao}` : ''}<br/><br/>Você pode enviar novos documentos através da página de Perfil na plataforma.`

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, ${isApproved ? '#059669, #10b981' : '#dc2626, #ef4444'}); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
            ${isApproved ? 'Documentos Aprovados!' : 'Resultado da Análise'}
          </h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Plataforma Matriarca Telemedicina</p>
        </div>
        
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; color: #1f2937; margin: 0 0 16px;">
            Olá, <strong>Dr(a). ${firstName}</strong>!
          </p>

          <div style="text-align: center; margin: 20px 0;">
            ${statusBadge}
          </div>
          
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 16px 0;">
            ${mainMessage}
          </p>

          ${isApproved ? `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #166534; font-size: 14px; margin: 0; font-weight: 500;">
              🎉 Agora você pode:
            </p>
            <ul style="color: #166534; font-size: 14px; margin: 8px 0 0; padding-left: 20px; line-height: 1.8;">
              <li>Atender pacientes via teleconsulta</li>
              <li>Emitir prescrições digitais</li>
              <li>Assinar documentos com certificado digital</li>
              <li>Acessar todas as funcionalidades da plataforma</li>
            </ul>
          </div>
          ` : `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #991b1b; font-size: 14px; margin: 0; font-weight: 500;">
              📌 Próximos passos:
            </p>
            <ul style="color: #991b1b; font-size: 14px; margin: 8px 0 0; padding-left: 20px; line-height: 1.8;">
              <li>Revise os documentos enviados</li>
              <li>Acesse seu Perfil na plataforma</li>
              <li>Envie novos documentos corrigidos</li>
              <li>Aguarde uma nova análise</li>
            </ul>
          </div>
          `}

          <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 16px 0 0;">
            Caso tenha alguma dúvida, entre em contato com nosso suporte.
          </p>
        </div>

        <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">
            Este é um email automático. Por favor, não responda diretamente.
          </p>
        </div>
      </div>
    `

    try {
      await transporter.sendMail({
        from: FROM,
        to: email,
        subject: isApproved
          ? '✅ Documentos Aprovados — Matriarca Telemedicina'
          : '📋 Resultado da Análise — Matriarca Telemedicina',
        html,
      })
      logger.info('Email de resultado da análise enviado', { email, status })
    } catch (error: any) {
      logger.error('Falha ao enviar email de resultado da análise', error, { email, status })
    }
  }
}
