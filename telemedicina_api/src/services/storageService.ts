import { Storage } from '@google-cloud/storage'
import logger from '../utils/logger'

/**
 * LGPD/CFM: Serviço de armazenamento de documentos médicos sensíveis.
 * Utiliza o Google Cloud Storage com bucket privado e Signed URLs temporárias.
 * A autenticação é feita via Workload Identity (Cloud Run) — sem credenciais hardcoded.
 */

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'matriarca-documentos-medicos'
const SIGNED_URL_EXPIRATION_MINUTES = 15

// Em Cloud Run: autenticação automática via Workload Identity Federation
// Em desenvolvimento local: usa GOOGLE_APPLICATION_CREDENTIALS ou gcloud auth
const storage = new Storage()

export class StorageService {
    private bucket = storage.bucket(BUCKET_NAME)

    /**
     * Faz upload de um documento médico para o GCS.
     * @param fileBuffer  Conteúdo do arquivo em Buffer
     * @param gcsPath     Caminho no bucket (ex: medicos/42/diploma.pdf)
     * @param mimetype    MIME type do arquivo (ex: application/pdf)
     * @returns           O caminho GCS do arquivo salvo (gcsPath)
     */
    async uploadDocument(fileBuffer: Buffer, gcsPath: string, mimetype: string): Promise<string> {
        try {
            const file = this.bucket.file(gcsPath)

            await file.save(fileBuffer, {
                metadata: {
                    contentType: mimetype,
                    // CFM: marcar documentos médicos com metadados de conformidade
                    metadata: {
                        'compliance': 'CFM-2314-2022',
                        'lgpd-classification': 'dado-sensivel',
                        'uploaded-at': new Date().toISOString()
                    }
                },
                // Garantir que o arquivo é privado (sem acesso público)
                predefinedAcl: 'private'
            })

            logger.info('GCS: Document uploaded successfully', { path: gcsPath, mimetype })
            return gcsPath
        } catch (error) {
            logger.error('GCS: Failed to upload document', error, { gcsPath })
            throw new Error(`Falha ao armazenar documento: ${gcsPath}`)
        }
    }

    /**
     * Gera uma Signed URL temporária e privada para acesso seguro ao documento.
     * LGPD: URLs expiram após o tempo configurado (padrão: 15 minutos).
     * @param gcsPath               Caminho do arquivo no bucket
     * @param expiresInMinutes      Tempo de validade da URL (padrão: 15 min)
     */
    async getSignedUrl(gcsPath: string, expiresInMinutes = SIGNED_URL_EXPIRATION_MINUTES): Promise<string> {
        try {
            const file = this.bucket.file(gcsPath)

            const [url] = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + expiresInMinutes * 60 * 1000
            })

            return url
        } catch (error) {
            logger.error('GCS: Failed to generate signed URL', error, { gcsPath })
            throw new Error(`Falha ao gerar URL de acesso para o documento.`)
        }
    }

    /**
     * Verifica se um arquivo existe no bucket.
     */
    async fileExists(gcsPath: string): Promise<boolean> {
        try {
            const [exists] = await this.bucket.file(gcsPath).exists()
            return exists
        } catch {
            return false
        }
    }

    /**
     * Remove um arquivo do bucket (ex: ao substituir documento).
     * LGPD: Log de deleção para auditoria.
     */
    async deleteDocument(gcsPath: string): Promise<void> {
        try {
            await this.bucket.file(gcsPath).delete({ ignoreNotFound: true })
            logger.info('GCS: Document deleted', { path: gcsPath })
        } catch (error) {
            // Não lançar erro em deleção — dado pode já ter sido removido
            logger.warn('GCS: Could not delete document (may not exist)', { gcsPath })
        }
    }

    /**
     * Retorna o caminho padronizado de um documento médico no bucket.
     * Formato: medicos/{usuarioId}/{tipo}.{extensao}
     */
    static buildPath(usuarioId: number, tipo: string, mimetype: string): string {
        const ext = StorageService.mimetypeToExtension(mimetype)
        return `medicos/${usuarioId}/${tipo}${ext}`
    }

    /**
     * Retorna o caminho para anexos de consulta.
     * Formato: consultas/{consultaId}/anexos/{timestamp}_{nome}
     */
    static buildAnexoPath(consultaId: number, filename: string): string {
        const timestamp = Date.now()
        const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
        return `consultas/${consultaId}/anexos/${timestamp}_${sanitized}`
    }

    /**
     * Retorna o caminho para PDFs de prescrição.
     * Formato: consultas/{consultaId}/prescricoes/{filename}.pdf
     */
    static buildPrescricaoPath(consultaId: number, filename: string): string {
        const timestamp = Date.now()
        const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
        return `consultas/${consultaId}/prescricoes/${timestamp}_${sanitized}.pdf`
    }

    private static mimetypeToExtension(mimetype: string): string {
        const map: Record<string, string> = {
            'application/pdf': '.pdf',
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
            'image/tiff': '.tif'
        }
        return map[mimetype] || ''
    }
}

export const storageService = new StorageService()
