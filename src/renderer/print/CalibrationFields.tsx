import { DEFAULT_CALIBRATION, type Calibration } from './formSpec'

interface CalibrationFieldsProps {
  calibration: Calibration
  onChange: (patch: Partial<Calibration>) => void
  onReset: () => void
  onAlignmentTest: () => void
}

const NUDGE = 0.25

export function isDefaultCalibration(c: Calibration) {
  return (
    c.offsetX === DEFAULT_CALIBRATION.offsetX &&
    c.offsetY === DEFAULT_CALIBRATION.offsetY &&
    c.scale === DEFAULT_CALIBRATION.scale
  )
}

function Nudge({ label, value, unit, step, onChange }: {
  label: string
  value: number
  unit: string
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="flex-1 text-xs text-gray-600">{label}</span>
      <button
        type="button"
        onClick={() => onChange(+(value - step).toFixed(3))}
        className="grid text-gray-700 bg-white border border-gray-300 rounded cursor-pointer size-6 place-items-center hover:bg-gray-100"
      >
        &minus;
      </button>
      <input
        type="number"
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-16 px-1 py-0.5 text-xs text-center border border-gray-300 rounded"
      />
      <button
        type="button"
        onClick={() => onChange(+(value + step).toFixed(3))}
        className="grid text-gray-700 bg-white border border-gray-300 rounded cursor-pointer size-6 place-items-center hover:bg-gray-100"
      >
        +
      </button>
      <span className="w-6 text-xs text-gray-400">{unit}</span>
    </div>
  )
}

export default function CalibrationFields({
  calibration,
  onChange,
  onReset,
  onAlignmentTest,
}: CalibrationFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs leading-snug text-gray-500">
        اطبع اختبار المحاذاة على ورقة صفراء: يطبع الإطار وعلامات الزوايا الأربع فقط.
        حرّك القيم بمقدار انحراف العلامات عن زوايا النموذج، في الاتجاه المعاكس، ثم أعد
        طباعة الاختبار للتأكد.
      </p>
      <Nudge label="يمين / يسار" value={calibration.offsetX} unit="mm" step={NUDGE} onChange={v => onChange({ offsetX: v })} />
      <Nudge label="أسفل / أعلى" value={calibration.offsetY} unit="mm" step={NUDGE} onChange={v => onChange({ offsetY: v })} />
      <Nudge label="المقياس" value={calibration.scale} unit="&times;" step={0.002} onChange={v => onChange({ scale: v })} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAlignmentTest}
          className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded cursor-pointer hover:bg-blue-700"
          dir="rtl"
        >
          طباعة اختبار المحاذاة
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={isDefaultCalibration(calibration)}
          className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default"
          dir="rtl"
        >
          إعادة الضبط
        </button>
      </div>
    </div>
  )
}
