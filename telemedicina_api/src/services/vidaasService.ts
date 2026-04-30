import axios from 'axios'
import prisma from '../config/database'
import ApiError from '../utils/apiError'
import logger from '../utils/logger'

export class VidaasService {
    private static get CLIENT_ID() { return process.env.VIDAAS_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID' }
    private static get CLIENT_SECRET() { return process.env.VIDAAS_CLIENT_SECRET || 'PLACEHOLDER_CLIENT_SECRET' }
    private static get REDIRECT_URI() { return process.env.VIDAAS_REDIRECT_URI || 'http://localhost:3000/api/vidaas/callback' }
    private static get BASE_URL() { return process.env.VIDAAS_BASE_URL || 'https://hml-certificado.vidaas.com.br' }

    /**
     * Gera a URL de autorização para o médico
     */
    static getAuthorizeUrl(medicoId: number) {
        const state = JSON.stringify({ medicoId })
        const encodedState = Buffer.from(state).toString('base64')
        
        return `${this.BASE_URL}/oauth/authorize?response_type=code&client_id=${this.CLIENT_ID}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&state=${encodedState}&scope=signature`
    }

    /**
     * Troca o código pelo token de acesso
     */
    static async handleCallback(code: string, state: string) {
        try {
            const decodedState = JSON.parse(Buffer.from(state, 'base64').toString())
            const { medicoId } = decodedState

            // OAuth2 token endpoints usually expect x-www-form-urlencoded
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', code);
            params.append('client_id', this.CLIENT_ID);
            params.append('client_secret', this.CLIENT_SECRET);
            params.append('redirect_uri', this.REDIRECT_URI);

            const response = await axios.post(`${this.BASE_URL}/oauth/token`, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })

            const { access_token, refresh_token, external_id } = response.data

            await prisma.medico.update({
                where: { id: medicoId },
                data: {
                    vidaas_external_id: external_id,
                    vidaas_refresh_token: refresh_token
                }
            })

            return { access_token, external_id }
        } catch (error: any) {
            logger.error('Vidaas callback error', error.response?.data || error.message)
            throw new ApiError('Falha ao processar autenticação Vidaas', 500, 'VIDAAS_AUTH_FAILED')
        }
    }

    /**
     * Assina um documento (PDF) usando Vidaas
     */
    static async signDocument(medicoId: number, pdfBuffer: Buffer) {
        try {
            const medico = await prisma.medico.findUnique({
                where: { id: medicoId }
            })

            if (!medico || !medico.vidaas_refresh_token) {
                throw new ApiError('Médico não autenticado no Vidaas', 401, 'VIDAAS_NOT_AUTHENTICATED')
            }

            // 1. Refresh token para garantir acesso
            const params = new URLSearchParams();
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', medico.vidaas_refresh_token);
            params.append('client_id', this.CLIENT_ID);
            params.append('client_secret', this.CLIENT_SECRET);

            const tokenResponse = await axios.post(`${this.BASE_URL}/oauth/token`, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })

            const accessToken = tokenResponse.data.access_token
            
            // Atualiza refresh token se um novo for retornado
            if (tokenResponse.data.refresh_token) {
                await prisma.medico.update({
                    where: { id: medicoId },
                    data: { vidaas_refresh_token: tokenResponse.data.refresh_token }
                })
            }

            // 2. Envia documento para assinatura
            // Usando a FormData global do Node 24+
            const formData = new FormData()
            const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' })
            formData.append('file', blob, 'documento.pdf')

            const signResponse = await axios.post(`${this.BASE_URL}/api/signature/v1/sign`, formData, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                    // Axios cuidará do Content-Type multipart se passarmos FormData
                }
            })

            return signResponse.data
        } catch (error: any) {
            logger.error('Vidaas signature error', error.response?.data || error.message)
            throw new ApiError('Falha ao assinar documento digitalmente', 500, 'VIDAAS_SIGN_FAILED')
        }
    }
}
