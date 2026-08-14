import type { PrintMode } from './formSpec'

interface PrintModeSwitchProps {
  mode: PrintMode
  onChange: (mode: PrintMode) => void
}

function PlainPaperIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
      <rect x="4.5" y="2.5" width="15" height="19" rx="1.5" fill="#ffffff" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function TemplatePaperIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
      <rect x="4.5" y="2.5" width="15" height="19" rx="1.5" fill="#fbf3a6" stroke="currentColor" strokeWidth="1.4" />
      <g stroke="#9a8b3a" strokeWidth="0.7">
        <rect x="6.8" y="6.4" width="4.4" height="5.2" fill="none" />
        <rect x="12.8" y="6.4" width="4.4" height="5.2" fill="none" />
        <path d="M9 6.4v5.2M15 6.4v5.2M6.8 9h4.4M12.8 9h4.4" />
        <path d="M6.8 14.2h10.4M6.8 16.4h10.4M6.8 18.6h6.6" />
      </g>
    </svg>
  )
}

const OPTIONS: Array<{ value: PrintMode; label: string; hint: string; Icon: () => React.ReactElement }> = [
  {
    value: 'plain',
    label: 'ورق أبيض',
    hint: 'Plain paper: print the whole form, template and results',
    Icon: PlainPaperIcon,
  },
  {
    value: 'preprinted',
    label: 'ورق النموذج',
    hint: 'Pre-printed yellow sheet: print only the results onto the clinic template',
    Icon: TemplatePaperIcon,
  },
]

export default function PrintModeSwitch({ mode, onChange }: PrintModeSwitchProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-white border border-gray-300 rounded shadow-sm no-print" role="group">
      {OPTIONS.map(({ value, label, hint, Icon }) => {
        const active = mode === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            title={hint}
            aria-pressed={active}
            className={`
              relative group flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-sm transition-all
              ${active ? 'bg-blue-50 text-blue-800 ring-2 ring-blue-500' : 'text-gray-600 hover:bg-gray-50'}
            `}
          >
            <Icon />
            <span className="font-bold" dir="rtl">{label}</span>
            <span className="absolute px-2 py-1 mb-2 text-xs text-white transition-opacity transform -translate-x-1/2 bg-gray-800 rounded opacity-0 pointer-events-none bottom-full left-1/2 whitespace-nowrap group-hover:opacity-100">
              {hint}
            </span>
          </button>
        )
      })}
    </div>
  )
}
