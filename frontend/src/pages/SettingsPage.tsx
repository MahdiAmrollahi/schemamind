import { FormEvent, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { Field, Input } from '../components/Input'
import { Button } from '../components/Button'
import { Spinner } from '../components/Toast'

interface ApiKeyView { masked: string | null; has_key: boolean }

export function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState<ApiKeyView | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setInfo(await api.get<ApiKeyView>('/api/settings/api-key/masked'))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      await api.post('/api/settings/api-key', { api_key: apiKey })
      setApiKey('')
      await load()
      setMessage({ kind: 'success', text: 'کلید API با موفقیت ذخیره شد.' })
    } catch (err: any) {
      setMessage({ kind: 'error', text: err?.message || 'ذخیره ناموفق بود.' })
    } finally { setSaving(false) }
  }

  const onDelete = async () => {
    if (!confirm('کلید API حذف شود؟')) return
    setMessage(null)
    setDeleting(true)
    try {
      await api.del('/api/settings/api-key')
      await load()
      setMessage({ kind: 'success', text: 'کلید API حذف شد.' })
    } catch (err: any) {
      setMessage({ kind: 'error', text: err?.message || 'حذف ناموفق بود.' })
    } finally { setDeleting(false) }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  return (
    <div>
      <PageHeader title="تنظیمات" description="کلید API و تنظیمات حساب کاربری." />

      <Card title="کلید Google AI Studio" description="این کلید برای فراخوانی Gemini استفاده می‌شود. در سرور امن ذخیره می‌شود.">
        <div className="mb-4 flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <div className={`w-2 h-2 rounded-full ${info?.has_key ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <div className="text-sm">
            {info?.has_key ? (
              <>کلید فعال است: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-xs" dir="ltr">{info.masked}</code></>
            ) : (
              <span className="text-slate-500">کلیدی تنظیم نشده است.</span>
            )}
          </div>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <Field label={info?.has_key ? 'کلید جدید' : 'کلید API'} hint="کلید را از Google AI Studio بگیرید. حداقل ۱۰ کاراکتر.">
            <Input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={info?.has_key ? 'برای تغییر، کلید جدید وارد کنید' : 'AIza...'}
              minLength={10}
              maxLength={500}
              required
              dir="ltr"
            />
          </Field>
          {message && (
            <div className={`text-sm rounded-lg px-3 py-2 border ${
              message.kind === 'success'
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-red-600 bg-red-50 border-red-200'
            }`}>
              {message.text}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" loading={saving} disabled={apiKey.length < 10}>
              {info?.has_key ? 'به‌روزرسانی' : 'ذخیره'}
            </Button>
            {info?.has_key && (
              <Button type="button" variant="danger" onClick={onDelete} loading={deleting}>
                حذف کلید
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
