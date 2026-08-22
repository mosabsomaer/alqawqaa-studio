import { useEffect, useRef, useState } from 'react'

interface SplitButtonProps {
  label: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
  menu: Array<{ label: string; onSelect: () => void }>
  variant?: 'primary' | 'default'
  title?: string
}

/**
 * Main action + attached caret opening a small menu of alternate actions, so
 * the primary path stays one click without a second full-size button next to it.
 */
const LOOK = {
  primary: {
    main: 'text-white bg-blue-600 border-blue-700 hover:bg-blue-700',
    caret: 'text-blue-100 bg-blue-600 border-blue-700 hover:bg-blue-700',
  },
  default: {
    main: 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50',
    caret: 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50',
  },
}

export default function SplitButton({ label, icon, onClick, menu, variant = 'default', title }: SplitButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const look = LOOK[variant]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative flex">
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`flex items-center h-10 gap-2 ps-4 pe-3 text-sm font-bold transition-all border rounded-s shadow-sm cursor-pointer hover:shadow ${look.main}`}
      >
        {icon}
        {label}
      </button>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="More print options"
        aria-expanded={open}
        className={`flex items-center h-10 px-1.5 transition-all border border-s-0 rounded-e shadow-sm cursor-pointer hover:shadow ${look.caret}`}
      >
        <svg className="size-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul className="absolute end-0 z-50 py-1 mt-1 bg-white border border-gray-300 rounded shadow-lg top-full w-60">
          {menu.map(item => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className="w-full px-3 py-2 text-sm text-right text-gray-700 cursor-pointer hover:bg-gray-50"
                dir="rtl"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
