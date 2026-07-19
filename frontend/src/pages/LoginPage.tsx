import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Button'
import { Field, Input } from '../components/Input'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'ورود ناموفق بود.')
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
          <h1 className="text-xl font-bold text-slate-900 mb-1">ورود</h1>
          <p className="text-sm text-slate-500 mb-6">به حساب کاربری خود وارد شوید.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="نام کاربری">
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
            <Field label="رمز عبور">
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                minLength={6}
              />
            </Field>

            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

            <Button type="submit" loading={loading} className="w-full">
              ورود
            </Button>
          </form>

          <p className="text-sm text-slate-600 text-center mt-5">
            حساب ندارید؟{' '}
            <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">ثبت‌نام</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
