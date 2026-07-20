import { useEffect, useState } from 'react'

interface Props {
  columns: string[]
  rows: any[][]
  totalRowCount: number
  maxRows: number
}

const PAGE_SIZE_OPTIONS = [10, 20, 30]

export function ResultTable({ columns, rows, totalRowCount, maxRows }: Props) {
  const [pageSize, setPageSize] = useState(20)
  const [visibleCount, setVisibleCount] = useState(20)

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [rows, pageSize])

  if (rows.length === 0) {
    return <div className="text-sm text-slate-500">بدون ردیف.</div>
  }

  const visible = rows.slice(0, visibleCount)
  const hasMore = visibleCount < rows.length
  const remaining = rows.length - visibleCount
  const nextChunk = Math.min(pageSize, remaining)

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <div className="text-xs font-medium text-slate-500">ردیف‌ها</div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            نمایش {visibleCount.toLocaleString('fa-IR')} از {totalRowCount.toLocaleString('fa-IR')} ردیف (حداکثر {maxRows.toLocaleString('fa-IR')})
          </span>
          <label className="flex items-center gap-1.5">
            <span>تعداد در صفحه:</span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="px-2 py-1 rounded border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {PAGE_SIZE_OPTIONS.map(n => (
                <option key={n} value={n}>{n.toLocaleString('fa-IR')}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 border-b border-slate-200">
              <th className="text-right font-medium px-3 py-2.5 w-12">#</th>
              {columns.map(c => (
                <th key={c} className="text-right font-medium px-5 py-2.5">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-3 text-slate-400 text-xs tabular-nums">{i + 1}</td>
                {columns.map((c, j) => {
                  const v = row[j]
                  if (v === null || v === undefined) {
                    return <td key={c} className="px-5 py-3 text-slate-400">—</td>
                  }
                  return <td key={c} className="px-5 py-3 text-slate-700 font-mono text-xs">{String(v)}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="flex justify-center mt-3">
          <button
            type="button"
            onClick={() => setVisibleCount(c => Math.min(c + pageSize, rows.length))}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition"
          >
            بارگذاری {nextChunk.toLocaleString('fa-IR')} ردیف بعدی
          </button>
        </div>
      )}
    </div>
  )
}
