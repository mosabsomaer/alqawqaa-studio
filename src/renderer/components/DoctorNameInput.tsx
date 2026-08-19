import { useRef, useState } from 'react'

interface DoctorNameInputProps {
  value: string
  onChange: (value: string) => void
  recents: string[]
  onRemoveRecent: (name: string) => void
}

export default function DoctorNameInput({ value, onChange, recents, onRemoveRecent }: DoctorNameInputProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={rootRef} className="relative">
      <input
        id="doctor-name"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={e => {
          // Keep the list open while a click lands inside it.
          if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false)
        }}
        className="w-64 px-3 py-1 text-right border border-gray-300 rounded"
        placeholder="د. "
        autoComplete="off"
      />
      {open && recents.length > 0 && (
        <ul className="absolute left-0 right-0 z-50 mt-1 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg top-full max-h-56">
          {recents.map(name => (
            <li key={name} className="flex items-center group">
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  onChange(name)
                  setOpen(false)
                }}
                className="flex-1 px-3 py-2 text-sm text-right text-gray-700 cursor-pointer hover:bg-gray-50"
                dir="rtl"
              >
                {name}
              </button>
              <button
                type="button"
                title="Remove from recent doctors"
                onMouseDown={e => e.preventDefault()}
                onClick={() => onRemoveRecent(name)}
                className="px-2 text-gray-300 transition-opacity opacity-0 cursor-pointer group-hover:opacity-100 hover:text-red-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
