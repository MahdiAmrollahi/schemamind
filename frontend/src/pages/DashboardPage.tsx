import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { Spinner } from '../components/Toast'

interface ApiKeyView { masked: string | null; has_key: boolean }
interface DatabaseItem { id: number; name: string; created_at: string }

export function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [keyInfo, setKeyInfo] = useState<ApiKeyView | null>(null)
  const [databases, setDatabases] = useState<DatabaseItem[]>([])

  useEffect(() => {
    Promise.allSettled([
      api.get<ApiKeyView>('/api/settings/api-key/masked'),
      api.get<DatabaseItem[]>('/api/databases/'),
    ]).then(([k, d]) => {
      if (k.status === 'fulfilled') setKeyInfo(k.value)
      if (d.status === 'fulfilled') setDatabases(d.value)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader
        title={`سلام ${user?.username} 👋`}
        description="از اینجا به همه بخش‌های SchemaMind دسترسی داری."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="دیتابیس‌های شما"
          value={loading ? '—' : databases.length.toLocaleString('fa-IR')}
          subtitle="فایل‌های SQLite بارگذاری‌شده"
        />
        <StatCard
          title="کلید Gemini"
          value={loading ? '—' : keyInfo?.has_key ? 'متصل' : 'تنظیم نشده'}
          subtitle={keyInfo?.masked || 'برای استفاده از پرس‌وجو، کلید را تنظیم کنید.'}
        />
        <StatCard
          title="مدل‌های Gemini"
          value="چندین مدل"
          subtitle="از فلش لایت تا پرو"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="شروع سریع" description="ساده‌ترین مسیر برای رسیدن به اولین پاسخ.">
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold">۱</span>
              <span>اگر کلید Google AI Studio ندارید، از <Link to="/settings" className="text-brand-600 hover:underline">تنظیمات</Link> آن را وارد کنید.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold">۲</span>
              <span>یک فایل <code className="bg-slate-100 px-1.5 py-0.5 rounded">.db</code> در <Link to="/databases" className="text-brand-600 hover:underline">دیتابیس‌ها</Link> بارگذاری کنید.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold">۳</span>
              <span>در <Link to="/query" className="text-brand-600 hover:underline">پرس‌وجو</Link> سوال خود را به فارسی یا انگلیسی بنویسید.</span>
            </li>
          </ol>
        </Card>

        <Card title="نکات" description="برای گرفتن بهترین نتیجه">
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> سوالات را دقیق و مشخص بنویسید.</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> نام ستون‌ها و جدول‌ها را اگر می‌دانید ذکر کنید.</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> برای نتایج بزرگ، از «top N» یا «گروه‌بندی» استفاده کنید.</li>
            <li className="flex gap-2"><span className="text-amber-500">!</span> فقط کوئری‌های SELECT اجرا می‌شوند.</li>
          </ul>
        </Card>
      </div>

      {loading && (
        <div className="mt-6 flex justify-center"><Spinner /></div>
      )}
    </div>
  )
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
    </div>
  )
}
