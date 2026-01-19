'use client'

import { useEffect, useRef } from 'react'
import { ModalConfig } from './useModal'
import './Modal.css'

interface ModalProps {
    isOpen: boolean
    config: ModalConfig | null
    onConfirm: () => void | Promise\u003cvoid\u003e
onCancel: () => void | Promise\u003cvoid\u003e
}

export function Modal({ isOpen, config, onConfirm, onCancel }: ModalProps) {
    const modalRef = useRef\u003cHTMLDivElement\u003e(null)

    // Handle ESC key
    useEffect(() =\u003e {
        if(!isOpen) return

    const handleEsc = (e: KeyboardEvent) =\u003e {
        if(e.key === 'Escape') {
        onCancel()
    }
}

document.addEventListener('keydown', handleEsc)
return () =\u003e document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onCancel])

// Handle click outside
const handleBackdropClick = (e: React.MouseEvent\u003cHTMLDivElement\u003e) =\u003e {
    if (e.target === modalRef.current) {
    onCancel()
}
  }

// Prevent body scroll when modal is open
useEffect(() =\u003e {
    if(isOpen) {
        document.body.style.overflow = 'hidden'
    } else {
        document.body.style.overflow = ''
    }
    return() =\u003e {
    document.body.style.overflow = ''
}
  }, [isOpen])

if (!isOpen || !config) return null

const getIcon = () =\u003e {
    switch (config.type) {
      case 'success':
    return (
    \u003csvg className = "modal-icon" viewBox = "0 0 24 24" fill = "none" xmlns = "http://www.w3.org/2000/svg"\u003e
    \u003ccircle cx = "12" cy = "12" r = "10" fill = "currentColor" fillOpacity = "0.1" /\u003e
    \u003cpath d = "M7 13l3 3 7-7" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round" /\u003e
    \u003c / svg\u003e
        )
      case 'error':
    return (
    \u003csvg className = "modal-icon" viewBox = "0 0 24 24" fill = "none" xmlns = "http://www.w3.org/2000/svg"\u003e
    \u003ccircle cx = "12" cy = "12" r = "10" fill = "currentColor" fillOpacity = "0.1" /\u003e
    \u003cpath d = "M15 9l-6 6M9 9l6 6" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" /\u003e
    \u003c / svg\u003e
        )
      case 'warning':
    return (
    \u003csvg className = "modal-icon" viewBox = "0 0 24 24" fill = "none" xmlns = "http://www.w3.org/2000/svg"\u003e
    \u003cpath d = "M12 2L2 20h20L12 2z" fill = "currentColor" fillOpacity = "0.1" /\u003e
    \u003cpath d = "M12 9v4M12 17h.01" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" /\u003e
    \u003c / svg\u003e
        )
      case 'info':
      default:
    return (
    \u003csvg className = "modal-icon" viewBox = "0 0 24 24" fill = "none" xmlns = "http://www.w3.org/2000/svg"\u003e
    \u003ccircle cx = "12" cy = "12" r = "10" fill = "currentColor" fillOpacity = "0.1" /\u003e
    \u003cpath d = "M12 16v-4M12 8h.01" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" /\u003e
    \u003c / svg\u003e
        )
}
  }

return (
\u003cdiv
ref = { modalRef }
className = {`modal-backdrop ${isOpen ? 'modal-open' : ''}`}
onClick = { handleBackdropClick }
role = "dialog"
aria - modal="true"
aria - labelledby="modal-title"
aria - describedby="modal-description"
\u003e
\u003cdiv className = {`modal-container modal-${config.type}`}\u003e
\u003cdiv className = "modal-header"\u003e
\u003cdiv className = "modal-icon-wrapper"\u003e
{ getIcon() }
\u003c / div\u003e
\u003ch3 id = "modal-title" className = "modal-title"\u003e{ config.title } \u003c / h3\u003e
\u003c / div\u003e

\u003cdiv className = "modal-body"\u003e
\u003cp id = "modal-description" className = "modal-message"\u003e{ config.message } \u003c / p\u003e
\u003c / div\u003e

\u003cdiv className = "modal-footer"\u003e
{
    config.showCancel && (
    \u003cbutton
    className = "modal-button modal-button-secondary"
    onClick = { onCancel }
    type = "button"
    \u003e
    { config.cancelText || 'Cancelar' }
    \u003c / button\u003e
          )
}
\u003cbutton
className = {`modal-button modal-button-primary modal-button-${config.type}`}
onClick = { onConfirm }
type = "button"
\u003e
{ config.confirmText || 'Ok' }
\u003c / button\u003e
\u003c / div\u003e
\u003c / div\u003e
\u003c / div\u003e
  )
}
