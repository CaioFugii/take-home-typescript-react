import { useEffect, useRef } from 'react'

type ConfirmDialogProps = {
  title: string
  description: string
  confirmLabel: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, description, confirmLabel, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel
  const busyRef = useRef(busy)
  busyRef.current = busy

  useEffect(() => {
    cancelRef.current?.focus()
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && !busyRef.current) {
        onCancelRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#1c1915]/40 px-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-3xl bg-paper p-6 shadow-card"
      >
        <h3 id="confirm-title" className="font-display text-3xl">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[#5c5146]">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full border border-ink px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Excluindo...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
