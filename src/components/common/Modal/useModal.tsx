'use client'

import { useCallback, useState } from 'react'

export type ModalType = 'success' | 'error' | 'warning' | 'info'

export interface ModalConfig {
    type: ModalType
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void | Promise<void>
    showCancel?: boolean
}

export function useModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [config, setConfig] = useState<ModalConfig | null>(null)

    const show = useCallback((modalConfig: ModalConfig) => {
        setConfig(modalConfig)
        setIsOpen(true)
    }, [])

    const close = useCallback(() => {
        setIsOpen(false)
        // Aguardar animação antes de limpar config
        setTimeout(() => setConfig(null), 300)
    }, [])

    const confirm = useCallback(async () => {
        if (config?.onConfirm) {
            await config.onConfirm()
        }
        close()
    }, [config, close])

    const cancel = useCallback(async () => {
        if (config?.onCancel) {
            await config.onCancel()
        }
        close()
    }, [config, close])

    // Helper methods for common modal types
    const success = useCallback((title: string, message: string, onConfirm?: () => void) => {
        show({
            type: 'success',
            title,
            message,
            confirmText: 'Ok',
            onConfirm,
            showCancel: false
        })
    }, [show])

    const error = useCallback((title: string, message: string, onConfirm?: () => void) => {
        show({
            type: 'error',
            title,
            message,
            confirmText: 'Ok',
            onConfirm,
            showCancel: false
        })
    }, [show])

    const warning = useCallback((title: string, message: string, onConfirm?: () => void) => {
        show({
            type: 'warning',
            title,
            message,
            confirmText: 'Ok',
            onConfirm,
            showCancel: false
        })
    }, [show])

    const info = useCallback((title: string, message: string, onConfirm?: () => void) => {
        show({
            type: 'info',
            title,
            message,
            confirmText: 'Ok',
            onConfirm,
            showCancel: false
        })
    }, [show])

    const confirm_prompt = useCallback((
        title: string,
        message: string,
        onConfirm?: () => void | Promise<void>,
        onCancel?: () => void | Promise<void>
    ) => {
        show({
            type: 'warning',
            title,
            message,
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            onConfirm,
            onCancel,
            showCancel: true
        })
    }, [show])

    return {
        isOpen,
        config,
        show,
        close,
        onConfirm: confirm, // Ação interna para o botão do modal
        onCancel: cancel,   // Ação interna para o botão do botão modal
        // Helper methods para abrir modais
        success,
        error,
        warning,
        info,
        confirm: confirm_prompt // Método para CHAMAR um modal de confirmação
    }
}
