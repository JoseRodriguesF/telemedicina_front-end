'use client'

import { useCallback, useState, useRef } from 'react'

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
    const configRef = useRef<ModalConfig | null>(null)
    const isOpeningRef = useRef(false)

    const show = useCallback((modalConfig: ModalConfig) => {
        if (isOpeningRef.current) return;
        isOpeningRef.current = true;

        configRef.current = modalConfig
        setConfig(modalConfig)
        setIsOpen(true)

        // Reset flag after animation
        setTimeout(() => {
            isOpeningRef.current = false;
        }, 400);
    }, [])

    const close = useCallback(() => {
        setIsOpen(false)
        // Aguardar animação antes de limpar config
        setTimeout(() => {
            setConfig(null)
            configRef.current = null
        }, 300)
    }, [])

    const confirm = useCallback(async () => {
        if (configRef.current?.onConfirm) {
            await configRef.current.onConfirm()
        }
        close()
    }, [close])

    const cancel = useCallback(async () => {
        if (configRef.current?.onCancel) {
            await configRef.current.onCancel()
        }
        close()
    }, [close])

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
