'use client'

import { useCallback, useState } from 'react'

export type ModalType = 'success' | 'error' | 'warning' | 'info'

export interface ModalConfig {
    type: ModalType
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm?: () => void | Promise\u003cvoid\u003e
onCancel ?: () => void | Promise\u003cvoid\u003e
showCancel ?: boolean
}

export function useModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [config, setConfig] = useState\u003cModalConfig | null\u003e(null)

    const show = useCallback((modalConfig: ModalConfig) =\u003e {
        setConfig(modalConfig)
    setIsOpen(true)
    }, [])

    const close = useCallback(() =\u003e {
        setIsOpen(false)
    // Aguardar animação antes de limpar config
    setTimeout(() =\u003e setConfig(null), 300)
}, [])

const confirm = useCallback(async() =\u003e {
    if(config?.onConfirm) {
        await config.onConfirm()
    }
    close()
}, [config, close])

const cancel = useCallback(async() =\u003e {
    if(config?.onCancel) {
        await config.onCancel()
    }
    close()
}, [config, close])

// Helper methods for common modal types
const success = useCallback((title: string, message: string, onConfirm?: () => void) =\u003e {
    show({
        type: 'success',
        title,
        message,
        confirmText: 'Ok',
        onConfirm,
        showCancel: false
    })
}, [show])

const error = useCallback((title: string, message: string, onConfirm?: () => void) =\u003e {
    show({
        type: 'error',
        title,
        message,
        confirmText: 'Ok',
        onConfirm,
        showCancel: false
    })
}, [show])

const warning = useCallback((title: string, message: string, onConfirm?: () => void) =\u003e {
    show({
        type: 'warning',
        title,
        message,
        confirmText: 'Ok',
        onConfirm,
        showCancel: false
    })
}, [show])

const info = useCallback((title: string, message: string, onConfirm?: () => void) =\u003e {
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
    onConfirm?: () => void | Promise\u003cvoid\u003e,
    onCancel?: () => void | Promise\u003cvoid\u003e
) =\u003e {
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
    confirm,
    cancel,
    // Helper methods
    success,
    error,
    warning,
    info,
    confirm: confirm_prompt
}
}
