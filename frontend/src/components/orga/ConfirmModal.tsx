import { useEffect, type ReactNode } from 'react'

export type ConfirmOptions = {
  title: string
  message: ReactNode
  confirmLabel: string
  /* Bouton de confirmation en rouge (refus, suppression). */
  danger?: boolean
}

/* Fenêtre de confirmation du backoffice (même allure que celles des labels). */
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  /* Échap annule. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md border border-black bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-title" className="text-[16px] font-semibold text-forest">{title}</h3>
        <div className="mt-2 text-[13px] text-ink/60">{message}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="orga-btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button
            type="button"
            autoFocus
            className={`orga-btn ${danger ? 'bg-red-700 hover:bg-red-800' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
