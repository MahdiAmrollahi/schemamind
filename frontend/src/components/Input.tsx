import { InputHTMLAttributes, forwardRef, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement>
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className = '', ...rest }, ref) {
  return <input ref={ref} className={`input ${className}`} {...rest} />
})

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className = '', rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={`input resize-y ${className}`} {...rest} />
})

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className = '', children, ...rest }, ref) {
  return (
    <select ref={ref} className={`input bg-white ${className}`} {...rest}>
      {children}
    </select>
  )
})
