import { ReactNode } from 'react'

interface Props {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function Card({ title, description, actions, children, className = '' }: Props) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200/70">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
