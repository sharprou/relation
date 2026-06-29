interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  open,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-[1.5rem] bg-white p-5 shadow-soft ring-1 ring-violet/10">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink/70">{message}</p>
        <div className="mt-5 flex gap-3">
          <button className="flex-1 rounded-2xl bg-paper px-4 py-3 text-sm font-medium text-ink ring-1 ring-violet/10" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="flex-1 rounded-2xl bg-violet px-4 py-3 text-sm font-medium text-white" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
