import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', loading, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  )
})
