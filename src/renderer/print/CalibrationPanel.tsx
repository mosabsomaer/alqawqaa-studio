import { useState } from 'react'
import type { Calibration } from './formSpec'

interface CalibrationPanelProps {
  calibration: Calibration
  onChange: (patch: Partial<Calibration>) => void
  onReset: () => void
  onAlignmentTest: () => void
}

const NUDGE = 0.25

function Nudge({ label, value, unit, step, onChange }: {
  label: string
  value: number
  unit: string
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-20 text-xs font-bold text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(+(value - step).toFixed(3))}
        className="w-6 h-6 text-gray-700 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-100"
      >
        &minus;
      </button>
      <input
        type="number"
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-20 px-1 py-0.5 text-xs text-center border border-gray-300 rounded"
      />
      <button
        type="button"
        onClick={() => onChange(+(value + step).toFixed(3))}
        className="w-6 h-6 text-gray-700 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-100"
      >
        +
      </button>
      <span className="w-8 text-xs text-gray-500">{unit}</span>
    </div>
  )
}

export default function CalibrationPanel({ calibration, onChange, onReset, onAlignmentTest }: CalibrationPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="text-left bg-white border border-gray-300 rounded shadow-sm no-print">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18M3 12h18M7 7l10 10M17 7L7 17" />
        </svg>
        معايرة الطباعة
        <span className="text-xs text-gray-400">
          {calibration.offsetX === 0 && calibration.offsetY === 0 && calibration.scale === 1
            ? 'default'
            : `${calibration.offsetX >= 0 ? '+' : ''}${calibration.offsetX} / ${calibration.offsetY >= 0 ? '+' : ''}${calibration.offsetY} mm`}
        </span>
        <span className="text-gray-400">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-2 px-3 py-3 border-t border-gray-200">
          <p className="max-w-xs text-xs leading-snug text-gray-500">
            Print the alignment test onto a yellow sheet: it prints the frame and four corner
            crosshairs only, with the current calibration applied. Nudge by however far the
            crosshairs sit from the template's own corners, in the opposite direction, then
            print it again to check.
          </p>
          <Nudge label="Right / left" value={calibration.offsetX} unit="mm" step={NUDGE} onChange={v => onChange({ offsetX: v })} />
          <Nudge label="Down / up" value={calibration.offsetY} unit="mm" step={NUDGE} onChange={v => onChange({ offsetY: v })} />
          <Nudge label="Scale" value={calibration.scale} unit="&times;" step={0.002} onChange={v => onChange({ scale: v })} />

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onAlignmentTest}
              className="px-3 py-1 text-xs text-white bg-blue-600 rounded cursor-pointer hover:bg-blue-700"
            >
              طباعة اختبار المحاذاة
            </button>
            <button
              type="button"
              onClick={onReset}
              className="px-3 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
