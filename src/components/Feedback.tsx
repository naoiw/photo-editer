import { IconAlertCircle as AlertCircle, IconCircleCheck as CheckCircle2 } from '@tabler/icons-react'

export function Notice({ children, kind = 'error' }: { children: string; kind?: 'error' | 'success' }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${kind === 'success' ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {kind === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
      {children}
    </div>
  )
}
