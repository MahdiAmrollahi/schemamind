import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Button'
import { Field, Input } from '../components/Input'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('تکرار رمز عبور با رمز عبور یکسان نیست.')
      return
    }
    setLoading(true)
    try {
      await register(username, password)
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'ثبت‌نام ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-lg">S</div>
          <span className="text-xl font-bold text-slate-900">SchemaMind</span>
        </div>

        <div className="card p-7">
          <h1 className="text-xl font-bold text-slate-900 mb-1">ثبت‌نام</h1>
          <p className="text-sm text-slate-500 mb-6">یک حساب جدید بسازید.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="نام کاربری" hint="حداقل ۳ کاراکتر">
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                required
                minLength={3}
                maxLength={50}
              />
            </Field>
            <Field label="رمز عبور" hint="حداقل ۶ کاراکتر">
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                maxLength={100}
              />
            </Field>
            <Field label="تکرار رمز عبور">
              <Input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                maxLength={100}
              />
            </Field>

            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

            <Button type="submit" loading={loading} className="w-full">
              ساخت حساب
            </Button>
          </form>

          <p className="text-sm text-slate-600 text-center mt-5">
            حساب دارید؟{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">ورود</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
