'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ModalConfig } from './useModal'
import './Modal.css'

interface ModalProps {
  isOpen: boolean
  config: ModalConfig | null
  onConfirm: () => void | Promise<void>
  onCancel: () => void | Promise<void>
  children?: React.ReactNode
}

export function Modal({ isOpen, config, onConfirm, onCancel, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const onCancelRef = useRef(onCancel)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Manter ref atualizada
  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancelRef.current()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === modalRef.current) {
      onCancel()
    }
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !config || !mounted) return null

  const getIcon = () => {
    switch (config.type) {
      case 'success':
        return (
          <svg className="modal-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1" />
            <path d="M7 13l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      case 'error':
        return (
          <svg className="modal-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1" />
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="modal-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 20h20L12 2z" fill="currentColor" fillOpacity="0.1" />
            <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )
      case 'info':
      default:
        return (
          <svg className="modal-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1" />
            <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )
    }
  }

  const modalContent = (
    <div
      ref={modalRef}
      className={`modal-backdrop ${isOpen ? 'modal-open' : ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div className={`modal-container modal-${config.type}`}>
        <div className="modal-header">
          <div className="modal-icon-wrapper">
            {getIcon()}
          </div>
          <h3 id="modal-title" className="modal-title">{config.title}</h3>
        </div>

        <div className="modal-body">
          <p id="modal-description" className="modal-message">{config.message}</p>
          {children}
        </div>

        <div className="modal-footer">
          {config.showCancel && (
            <button
              className="modal-button modal-button-secondary"
              onClick={onCancel}
              type="button"
            >
              {config.cancelText || 'Cancelar'}
            </button>
          )}
          <button
            className={`modal-button modal-button-primary modal-button-${config.type}`}
            onClick={onConfirm}
            type="button"
          >
            {config.confirmText || 'Ok'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

