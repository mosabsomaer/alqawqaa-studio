import { useEffect, useRef, useState } from 'react'
import CalibrationFields, { isDefaultCalibration } from '../print/CalibrationFields'
import PrinterList, { usePrinterLabel } from '../print/PrinterList'
import type { Calibration, PrintMode } from '../print/formSpec'

interface SettingsMenuProps {
  mode: PrintMode
  printerName: string
  onPrinterChange: (name: string) => void
  calibration: Calibration
  onCalibrationChange: (patch: Partial<Calibration>) => void
  onCalibrationReset: () => void
  onAlignmentTest: () => void
}

function signed(value: number) {
  return `${value >= 0 ? '+' : ''}${value}`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2.5 border-b border-gray-200 last:border-b-0">
      <div className="mb-1.5 text-xs font-bold tracking-wide text-gray-400 uppercase">{title}</div>
      {children}
    </div>
  )
}

/**
 * Everything that is set up once per printer rather than once per patient.
 * The trigger doubles as the readout, so the chosen printer stays visible
 * without four separate controls competing with the print button.
 */
export default function SettingsMenu(props: SettingsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const printerLabel = usePrinterLabel(props.printerName)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const tuned = props.mode === 'preprinted' && !isDefaultCalibration(props.calibration)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        title="الطابعة والمعايرة والاستيراد"
        className={`flex items-center h-8 gap-2 px-2.5 text-sm rounded cursor-pointer transition-colors ${
          open ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
        }`}
      >
        <svg className="size-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="max-w-48 truncate" dir="rtl">{printerLabel || 'الطابعة الافتراضية'}</span>
        {tuned && (
          <span className="px-1.5 py-0.5 text-xs rounded text-amber-800 bg-amber-100">
            {`${signed(props.calibration.offsetX)} / ${signed(props.calibration.offsetY)} mm`}
          </span>
        )}
        <span className="text-gray-400">{open ? '\u25b4' : '\u25be'}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white start-0 border border-gray-300 rounded shadow-xl top-full w-80 max-h-[75vh] overflow-y-auto">
          <Section title="الطابعة">
            <PrinterList printerName={props.printerName} onChange={props.onPrinterChange} />
          </Section>

          {/* Calibration registers ink against pre-printed stock; plain paper
              has nothing to register against. */}
          {props.mode === 'preprinted' && (
            <Section title="معايرة الطباعة">
              <CalibrationFields
                calibration={props.calibration}
                onChange={props.onCalibrationChange}
                onReset={props.onCalibrationReset}
                onAlignmentTest={props.onAlignmentTest}
              />
            </Section>
          )}

        </div>
      )}
    </div>
  )
}
