import { FormEvent, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Card, EmptyState } from '../components/Card'
import { Field, Select, Textarea } from '../components/Input'
import { Button } from '../components/Button'
import { Spinner } from '../components/Toast'
import { DataTable } from '../components/DataTable'

interface DatabaseItem { id: number; name: string }
interface ModelItem { id: string; name: string }
interface QueryResult { columns: string[]; rows: any[][]; row_count: number }
interface QueryResponse {
  sql: string
  valid: boolean
  message: string
  results: QueryResult | null
}

const DEFAULT_MODELS: ModelItem[] = [
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite (Latest)' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash (Latest)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
]

export function QueryPage() {
  const [databases, setDatabases] = useState<DatabaseItem[]>([])
  const [models, setModels] = useState<ModelItem[]>(DEFAULT_MODELS)
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [databaseId, setDatabaseId] = useState<string>('')
  const [model, setModel] = useState<string>(DEFAULT_MODELS[0].id)
  const [question, setQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<QueryResponse | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const [dbs, key] = await Promise.all([
          api.get<DatabaseItem[]>('/api/databases/'),
          api.get<{ has_key: boolean }>('/api/settings/api-key'),
        ])
        setDatabases(dbs)
        setHasKey(key.has_key)
        if (dbs.length > 0) setDatabaseId(String(dbs[0].id))
        if (key.has_key) {
          try {
            const ms = await api.get<ModelItem[]>('/api/models/')
            if (ms.length) setModels(ms)
          } catch { /* keep defaults */ }
        }
      } catch { /* errors shown inline */ }
      finally { setLoading(false) }
    })()
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!databaseId) { setError('ابتدا یک دیتابیس انتخاب کنید.'); return }
    if (!question.trim()) { setError('سوال را بنویسید.'); return }
    setError(null)
    setResponse(null)
    setSubmitting(true)
    try {
      const res = await api.post<QueryResponse>('/api/query/', {
        database_id: Number(databaseId),
        question: question.trim(),
        model,
      })
      setResponse(res)
    } catch (err: any) {
      setError(err?.message || 'پرس‌وجو ناموفق بود.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  if (!hasKey) {
    return (
      <div>
        <PageHeader title="پرس‌وجو" description="از دیتابیس‌های خود به زبان طبیعی سوال بپرسید." />
        <Card>
          <EmptyState
            title="کلید Gemini تنظیم نشده است"
            description="برای استفاده از پرس‌وجو، ابتدا کلید Google AI Studio را در تنظیمات وارد کنید."
            action={<a href="/settings" className="btn-primary">رفتن به تنظیمات</a>}
          />
        </Card>
      </div>
    )
  }

  if (databases.length === 0) {
    return (
      <div>
        <PageHeader title="پرس‌وجو" description="از دیتابیس‌های خود به زبان طبیعی سوال بپرسید." />
        <Card>
          <EmptyState
            title="هنوز دیتابیسی آپلود نکرده‌اید"
            description="برای شروع، یک فایل .db بارگذاری کنید."
            action={<a href="/databases" className="btn-primary">مدیریت دیتابیس‌ها</a>}
          />
        </Card>
      </div>
    )
  }

  const columns = response?.results?.columns.map(c => ({
    key: c,
    header: c,
    render: (row: any[]) => {
      const v = row[response.results!.columns.indexOf(c)]
      if (v === null || v === undefined) return <span className="text-slate-400">—</span>
      return <span className="font-mono text-xs">{String(v)}</span>
    },
  })) || []

  return (
    <div>
      <PageHeader title="پرس‌وجو" description="سوال خود را به فارسی یا انگلیسی بنویسید. SQL تولیدشده و نتایج واقعی نمایش داده می‌شود." />

      <Card title="سوال جدید" className="mb-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="دیتابیس">
              <Select value={databaseId} onChange={e => setDatabaseId(e.target.value)} required>
                {databases.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="مدل Gemini">
              <Select value={model} onChange={e => setModel(e.target.value)}>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="سوال" hint="مثال: ۵ مشتری برتر از نظر مجموع خرید را نشان بده.">
            <Textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="سوال خود را اینجا بنویسید…"
              rows={3}
              maxLength={1000}
            />
          </Field>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end">
            <Button type="submit" loading={submitting} disabled={!question.trim() || !databaseId}>
              ارسال
            </Button>
          </div>
        </form>
      </Card>

      {response && (
        <Card
          title="نتیجه"
          description={response.message}
          actions={
            <span className={response.valid && response.results ? 'badge-ok' : response.valid ? 'badge-warn' : 'badge-err'}>
              {response.valid && response.results ? 'اجرا شد' : response.valid ? 'تولید شد' : 'رد شد'}
            </span>
          }
          className="mb-6"
        >
          <div className="mb-4">
            <div className="text-xs font-medium text-slate-500 mb-1.5">SQL تولیدشده</div>
            <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto" dir="ltr">{response.sql || '—'}</pre>
          </div>

          {response.results && response.results.columns.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-slate-500">ردیف‌ها</div>
                <div className="text-xs text-slate-500">
                  {response.results.row_count.toLocaleString('fa-IR')} ردیف (حداکثر ۱۰۰)
                </div>
              </div>
              <DataTable rows={response.results.rows} columns={columns} />
            </div>
          ) : (
            <div className="text-sm text-slate-500">بدون ردیف.</div>
          )}
        </Card>
      )}
    </div>
  )
}
