import { useEffect, useState } from 'react'

interface PrinterInfo {
  name: string
  displayName: string
  isDefault: boolean
}

interface PrinterListProps {
  /** Empty string means "system default printer". */
  printerName: string
  onChange: (name: string) => void
}

/** Resolves the stored printer id to something readable, falling back to the
    raw id while the list is still loading or the printer has gone away. */
export function usePrinterLabel(printerName: string) {
  const [label, setLabel] = useState(printerName)

  useEffect(() => {
    if (!printerName) {
      setLabel('')
      return
    }
    let alive = true
    window.electronAPI?.getPrinters().then(list => {
      if (!alive) return
      setLabel(list.find(p => p.name === printerName)?.displayName || printerName)
    })
    return () => {
      alive = false
    }
  }, [printerName])

  return label
}

export default function PrinterList({ printerName, onChange }: PrinterListProps) {
  const [printers, setPrinters] = useState<PrinterInfo[] | null>(null)

  useEffect(() => {
    let alive = true
    window.electronAPI?.getPrinters().then(list => {
      if (alive) setPrinters(list)
    })
    return () => {
      alive = false
    }
  }, [])

  if (printers === null) {
    return <div className="px-2 py-2 text-sm text-gray-500">جارٍ تحميل الطابعات…</div>
  }

  return (
    <ul className="overflow-y-auto max-h-44">
      <PrinterRow
        label="الطابعة الافتراضية"
        sublabel="النظام"
        active={printerName === ''}
        onSelect={() => onChange('')}
      />
      {printers.map(p => (
        <PrinterRow
          key={p.name}
          label={p.displayName || p.name}
          sublabel={p.isDefault ? 'افتراضية' : undefined}
          active={printerName === p.name}
          onSelect={() => onChange(p.name)}
        />
      ))}
      {printers.length === 0 && <li className="px-2 py-2 text-sm text-gray-500">لا توجد طابعات</li>}
    </ul>
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
        className={`flex items-center w-full gap-2 px-2 py-1.5 text-sm text-start rounded cursor-pointer ${
          active ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <span className={`size-2 rounded-full shrink-0 ${active ? 'bg-blue-600' : 'bg-gray-300'}`} />
        <span className="truncate">{label}</span>
        {sublabel && <span className="ml-auto text-xs text-gray-400 shrink-0">{sublabel}</span>}
      </button>
    </li>
  )
}
