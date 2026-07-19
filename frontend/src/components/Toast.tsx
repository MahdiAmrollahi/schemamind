import { ReactNode } from 'react'

export function Toast({ kind = 'info', children }: { kind?: 'info' | 'success' | 'error'; children: ReactNode }) {
  const styles =
    kind === 'success'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : kind === 'error'
      ? 'bg-red-50 text-red-800 border-red-200'
      : 'bg-slate-900 text-white border-slate-900'
  return (
    <div className={`px-4 py-2.5 rounded-lg border text-sm shadow-lg ${styles}`} role="status">
      {children}
    </div>
  )
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'
  return (
    <svg className={`${s} animate-spin text-slate-400`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
