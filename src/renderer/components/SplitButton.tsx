import { useEffect, useRef, useState } from 'react'

interface SplitButtonProps {
  label: string
  icon: React.ReactNode
  onClick: () => void
  menu: Array<{ label: string; onSelect: () => void }>
}

/**
 * Main action + attached caret opening a small menu of alternate actions, so
 * the primary path stays one click without a second full-size button next to it.
 */
export default function SplitButton({ label, icon, onClick, menu }: SplitButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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
        className="flex items-center gap-2 py-2 pl-5 pr-3 text-gray-700 transition-all bg-white border border-gray-300 rounded-l shadow-sm cursor-pointer hover:bg-gray-50 hover:shadow"
      >
        {icon}
        {label}
      </button>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="More print options"
        aria-expanded={open}
        className="flex items-center px-1.5 text-gray-500 transition-all bg-white border border-l-0 border-gray-300 rounded-r shadow-sm cursor-pointer hover:bg-gray-50 hover:shadow"
      >
        <svg className="size-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul className="absolute left-0 z-50 py-1 mt-1 bg-white border border-gray-300 rounded shadow-lg top-full w-56">
          {menu.map(item => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 cursor-pointer hover:bg-gray-50"
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
