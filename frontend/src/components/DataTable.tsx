import { ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface Props<T> {
  rows: T[]
  columns: Column<T>[]
  empty?: ReactNode
  onRowClick?: (row: T) => void
}

export function DataTable<T extends Record<string, any>>({ rows, columns, empty, onRowClick }: Props<T>) {
  if (rows.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-500">{empty || 'چیزی برای نمایش نیست.'}</div>
  }
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500 border-b border-slate-200">
            {columns.map(c => (
              <th key={c.key} className={`text-right font-medium px-5 py-2.5 ${c.className || ''}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-slate-100 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
            >
              {columns.map(c => (
                <td key={c.key} className={`px-5 py-3 text-slate-700 ${c.className || ''}`}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
