import { useEffect, useRef, useState } from 'react'

interface PrinterInfo {
  name: string
  displayName: string
  isDefault: boolean
}

interface PrinterSelectProps {
  /** Empty string means "system default printer". */
  printerName: string
  onChange: (name: string) => void
}

export default function PrinterSelect({ printerName, onChange }: PrinterSelectProps) {
  const [open, setOpen] = useState(false)
  const [printers, setPrinters] = useState<PrinterInfo[] | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    window.electronAPI?.getPrinters().then(list => {
      if (alive) setPrinters(list)
    })

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      alive = false
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const selectedLabel = printerName
    ? (printers?.find(p => p.name === printerName)?.displayName ?? printerName)
    : 'الطابعة الافتراضية'

  return (
    <div ref={rootRef} className="relative no-print">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={`Printer: ${selectedLabel}`}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded shadow-sm cursor-pointer hover:bg-gray-50"
      >
        <svg className="size-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="max-w-40 truncate">{selectedLabel}</span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 bg-white border border-gray-300 rounded shadow-lg top-full w-72">
          <div className="px-3 py-2 text-xs font-bold text-gray-500 border-b border-gray-200" dir="rtl">
            اختر الطابعة
          </div>
          {printers === null ? (
            <div className="px-3 py-3 text-sm text-gray-500">Loading printers…</div>
          ) : (
            <ul className="py-1 overflow-y-auto max-h-64">
              <PrinterRow
                label="الطابعة الافتراضية"
                sublabel="System default"
                active={printerName === ''}
                onSelect={() => {
                  onChange('')
                  setOpen(false)
                }}
              />
              {printers.map(p => (
                <PrinterRow
                  key={p.name}
                  label={p.displayName || p.name}
                  sublabel={p.isDefault ? 'Default' : undefined}
                  active={printerName === p.name}
                  onSelect={() => {
                    onChange(p.name)
                    setOpen(false)
                  }}
                />
              ))}
              {printers.length === 0 && (
                <li className="px-3 py-3 text-sm text-gray-500">No printers found</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function PrinterRow({
  label,
  sublabel,
  active,
  onSelect,
}: {
  label: string
  sublabel?: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex items-center w-full gap-2 px-3 py-2 text-sm text-left cursor-pointer ${
          active ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className={`size-2 rounded-full shrink-0 ${active ? 'bg-blue-600' : 'bg-gray-300'}`} />
        <span className="truncate">{label}</span>
        {sublabel && <span className="ml-auto text-xs text-gray-400 shrink-0">{sublabel}</span>}
      </button>
    </li>
  )
}
