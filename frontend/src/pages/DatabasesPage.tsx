import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Card, EmptyState } from '../components/Card'
import { DataTable } from '../components/DataTable'
import { Button } from '../components/Button'
import { Field, Input } from '../components/Input'
import { Spinner } from '../components/Toast'

interface DatabaseItem {
  id: number
  name: string
  created_at: string
}

export function DatabasesPage() {
  const [items, setItems] = useState<DatabaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      setItems(await api.get<DatabaseItem[]>('/api/databases/'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!file) { setError('یک فایل .db انتخاب کنید.'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('name', name)
      fd.append('file', file)
      await api.post('/api/databases/', fd)
      setName('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setShowForm(false)
      await load()
    } catch (err: any) {
      setError(err?.message || 'بارگذاری ناموفق بود.')
    } finally {
      setUploading(false)
    }
  }

  const onDelete = async (id: number) => {
    if (!confirm('حذف این دیتابیس قطعی است. ادامه می‌دهید؟')) return
    setDeleting(id)
    try {
      await api.del(`/api/databases/${id}`)
      await load()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="دیتابیس‌ها"
        description="فایل‌های SQLite خود را اینجا آپلود کنید. اسکیما به‌طور خودکار استخراج و ایندکس می‌شود."
        actions={
          !showForm && (
            <Button onClick={() => setShowForm(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              آپلود دیتابیس
            </Button>
          )
        }
      />

      {showForm && (
        <Card title="آپلود دیتابیس جدید" className="mb-6">
          <form onSubmit={onUpload} className="space-y-4">
            <Field label="نام نمایشی">
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثلاً: فروشگاه ۱۴۰۳"
                required
                maxLength={100}
              />
            </Field>
            <Field label="فایل SQLite" hint="فقط فایل‌های .db پذیرفته می‌شوند.">
              <input
                ref={fileRef}
                type="file"
                accept=".db"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-700 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                required
              />
            </Field>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
            <div className="flex gap-2">
              <Button type="submit" loading={uploading}>بارگذاری و ایندکس</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setError(null) }}>انصراف</Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="دیتابیس‌های شما" description={loading ? 'در حال بارگذاری…' : `${items.length.toLocaleString('fa-IR')} مورد`}>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            title="هنوز دیتابیسی آپلود نکرده‌اید"
            description="برای شروع پرس‌وجو، اول یک فایل .db آپلود کنید."
            action={<Button onClick={() => setShowForm(true)}>اولین دیتابیس را آپلود کنید</Button>}
          />
        ) : (
          <DataTable
            rows={items}
            columns={[
              { key: 'name', header: 'نام', render: r => <span className="font-medium text-slate-900">{r.name}</span> },
              { key: 'id', header: 'شناسه', render: r => <span className="badge-neutral">#{r.id.toLocaleString('fa-IR')}</span> },
              { key: 'created_at', header: 'تاریخ ایجاد', render: r => formatDate(r.created_at) },
              {
                key: 'actions',
                header: '',
                className: 'text-left w-20',
                render: r => (
                  <Button variant="danger" onClick={() => onDelete(r.id)} loading={deleting === r.id}>
                    حذف
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
  } catch { return iso }
}
