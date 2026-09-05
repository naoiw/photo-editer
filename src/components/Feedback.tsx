import { IconAlertCircle as AlertCircle, IconCircleCheck as CheckCircle2, IconLoader2 as LoaderCircle } from '@tabler/icons-react'

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-56 items-center justify-center gap-3 rounded-lg border border-line bg-panel text-sm text-muted">
      <LoaderCircle className="animate-spin text-accent" size={20} />
      {label}
    </div>
  )
}

export function Notice({ children, kind = 'error' }: { children: string; kind?: 'error' | 'success' }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${kind === 'success' ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {kind === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
      {children}
    </div>
  )
}
