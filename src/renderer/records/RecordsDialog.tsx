import { useEffect, useRef, useState } from 'react'
import type { TestSummary } from '../../shared/tests'
import { formatIsoDate, formatStamp } from '../dates'
import { testsClient } from './client'

interface RecordsDialogProps {
  open: boolean
  onClose: () => void
  /** Highlighted in the list so the doctor can see which record is on screen. */
  currentId: string | null
  onOpenRecord: (id: string) => void
}

export default function RecordsDialog({ open, onClose, currentId, onOpenRecord }: RecordsDialogProps) {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<TestSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const load = async (q: string) => {
    const result = await testsClient.list(q)
    if (result.ok) {
      setRows(result.data)
      setError(null)
    } else {
      setError(result.error)
    }
  }

  // Typing filters server-side; the debounce keeps a fast typist from firing a
  // query per keystroke.
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => void load(query), 150)
    return () => clearTimeout(id)
  }, [open, query])

  // Opening resets the row-level confirm and takes focus. Kept apart from the
  // Escape listener so a new onClose identity does not re-steal focus mid-typing.
  useEffect(() => {
    if (!open) return
    setConfirmDelete(null)
    searchRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleDelete = async (id: string) => {
    const result = await testsClient.remove(id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setConfirmDelete(null)
    void load(query)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 no-print"
      onPointerDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        dir="rtl"
        className="flex flex-col w-full max-w-4xl bg-white rounded-lg shadow-2xl max-h-[80vh]"
      >
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">الفحوصات المحفوظة</h2>
          <span className="text-sm text-gray-400">{rows ? `${rows.length} سجل` : ''}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="px-2 mr-auto text-xl font-bold text-gray-400 cursor-pointer hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-200">
          <div className="relative">
            <svg
              className="absolute -translate-y-1/2 right-3 top-1/2 size-5 text-gray-400"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث باسم المريض، رقم الملف، الطبيب أو التاريخ…"
              className="w-full py-2 pr-10 pl-3 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <div className="px-5 py-3 text-sm text-red-700 bg-red-50">{error}</div>}
          {rows === null ? (
            <div className="px-5 py-10 text-sm text-center text-gray-500">جارٍ التحميل…</div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-10 text-sm text-center text-gray-500">
              {query ? 'لا توجد نتائج مطابقة' : 'لا توجد فحوصات محفوظة بعد'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="px-4 py-2 font-bold text-right">اسم المريض</th>
                  <th className="px-3 py-2 font-bold text-right w-16">العمر</th>
                  <th className="px-3 py-2 font-bold text-right w-28">رقم الملف</th>
                  <th className="px-3 py-2 font-bold text-right w-28">تاريخ الفحص</th>
                  <th className="px-3 py-2 font-bold text-right w-40">الطبيب</th>
                  <th className="px-3 py-2 font-bold text-right w-32">آخر تعديل</th>
                  <th className="px-3 py-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    key={row.id}
                    onDoubleClick={() => onOpenRecord(row.id)}
                    className={`border-b border-gray-100 ${
                      row.id === currentId ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-2 font-medium text-gray-800 truncate max-w-52">
                      {row.patientName || <span className="text-gray-400">بدون اسم</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.age}</td>
                    <td className="px-3 py-2 text-gray-600 truncate">{row.patientId}</td>
                    <td className="px-3 py-2 text-gray-600" dir="ltr">
                      {formatIsoDate(row.testDate)}
                    </td>
                    <td className="px-3 py-2 text-gray-600 truncate">{row.doctor}</td>
                    <td className="px-3 py-2 text-xs text-gray-400" dir="ltr">
                      {formatStamp(row.updatedAt)}
                    </td>
                    <td className="px-3 py-2">
                      {confirmDelete === row.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDelete(row.id)}
                            className="px-2 py-1 text-xs text-white bg-red-600 rounded cursor-pointer hover:bg-red-700"
                          >
                            حذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 text-xs text-gray-600 cursor-pointer hover:text-gray-900"
                          >
                            تراجع
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenRecord(row.id)}
                            className="px-2 py-1 text-xs text-blue-700 border border-blue-200 rounded cursor-pointer hover:bg-blue-50"
                          >
                            فتح
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(row.id)}
                            aria-label="حذف"
                            className="px-2 py-1 text-xs text-gray-400 cursor-pointer hover:text-red-600"
                          >
                            🗑
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
