import * as React from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"
import { useFocusTrap } from "../../lib/hooks/useFocusTrap"
import { useReducedMotion } from "../../lib/animations/useReducedMotion"

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  useFocusTrap(isOpen, cardRef)

  React.useEffect(() => {
    if (!isOpen) return
    const card = cardRef.current
    if (!card) return

    if (reduced) {
      card.style.opacity = '1'
      card.style.transform = 'none'
      return
    }

    card.style.opacity = '0'
    card.style.transform = 'scale(0.88) translateY(20px)'
    const raf = requestAnimationFrame(() => {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      card.style.opacity = '1'
      card.style.transform = 'scale(1) translateY(0)'
    })

    return () => {
      cancelAnimationFrame(raf)
      card.style.transition = ''
    }
  }, [isOpen, reduced])

  React.useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={cn(
          "w-full rounded-2xl border border-border/50 bg-surface p-6 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto",
          sizeClasses[size],
          className
        )}
      >
        {(title || showCloseButton) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-lg font-bold text-text truncate">{title}</h2>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-sm text-text-secondary">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-full p-2 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
