/**
 * The A4 sheet itself: one chrome layer, one ink layer, six panels.
 *
 * Every panel contributes fragments rather than its own <svg> or wrapper, so
 * both layers share a single viewBox and registration is structural. See
 * ARCHITECTURE.md.
 */
import type { CSSProperties } from 'react'
import type { SymbolType } from '../components/AudiometryToolbar'
import { FRAME, SHEET, type Calibration, type PrintMode } from './formSpec'
import {
  AudiogramChrome,
  AudiogramFields,
  AudiogramInk,
  EMPTY_EUSTACHIAN,
  type EustachianValue,
} from './panels/AudiogramPanel'
import { HeaderChrome, HeaderFields } from './panels/HeaderPanel'
import {
  EMPTY_MEASUREMENTS,
  MeasurementsChrome,
  MeasurementsFields,
  MeasurementsInk,
  type MeasurementsValue,
  type SpeechPoint,
} from './panels/MeasurementsPanel'
import { NotesChrome, NotesFields } from './panels/NotesPanel'
import { SymptomsChrome, SymptomsInk, type SymptomsData } from './panels/SymptomsPanel'
import { TympanometryChrome, TympanometryInk } from './panels/TympanometryPanel'
import './sheet.css'

const VIEW_BOX = `0 0 ${SHEET.w} ${SHEET.h}`

/**
 * Speech-table columns the yellow paper has no box for. The original form
 * prints them, so they are kept here rather than folded into the notes.
 */
export interface SpeechExtras {
  right: { srt: string; level: string; maskingSRT: string; maskingDS: string }
  left: { srt: string; level: string; maskingSRT: string; maskingDS: string }
}

export const EMPTY_SPEECH_EXTRAS: SpeechExtras = {
  right: { srt: '', level: '', maskingSRT: '', maskingDS: '' },
  left: { srt: '', level: '', maskingSRT: '', maskingDS: '' },
}

/** Everything the doctor fills in. Panels own the shape of their own slice. */
export interface SheetValue {
  patientName: string
  age: string
  date: string
  doctor: string
  referredFrom: string
  patientId: string
  /** Serialized PlacedSymbol[], one string per ear. */
  rightAudiogram: string
  leftAudiogram: string
  eustachian: EustachianValue
  /** Serialized BezierPoint[], one string per ear. */
  rightTympanogram: string
  leftTympanogram: string
  measurements: MeasurementsValue
  speechPoints: SpeechPoint[]
  speechExtras: SpeechExtras
  symptoms: SymptomsData
  tympanometryNotes: string
  audiometryNotes: string
}

export const EMPTY_SHEET_VALUE: SheetValue = {
  patientName: '',
  age: '',
  date: '',
  doctor: '',
  referredFrom: '',
  patientId: '',
  rightAudiogram: '',
  leftAudiogram: '',
  eustachian: EMPTY_EUSTACHIAN,
  rightTympanogram: '',
  leftTympanogram: '',
  measurements: EMPTY_MEASUREMENTS,
  speechPoints: [],
  speechExtras: EMPTY_SPEECH_EXTRAS,
  symptoms: {},
  tympanometryNotes: '',
  audiometryNotes: '',
}

export interface FormSheetProps {
  value: SheetValue
  /** Patch merge, so a panel only ever names the keys it owns. */
  onChange: (patch: Partial<SheetValue>) => void
  /** Which audiogram symbol a click on the chart places. */
  selectedSymbol: SymbolType
  mode: PrintMode
  calibration: Calibration
}

/**
 * Calibration corrects how a given printer feeds pre-printed stock, so it only
 * means anything in preprinted mode, and it only ever moves ink. The chrome
 * layer stays put: it is the registration reference the nudge is measured from.
 */
function inkTransform(mode: PrintMode, cal: Calibration): CSSProperties {
  if (mode !== 'preprinted') return {}
  return {
    transform: `translate(${cal.offsetX}mm, ${cal.offsetY}mm) scale(${cal.scale})`,
    transformOrigin: '0 0',
  }
}

/**
 * What the alignment test prints: the frame the template already carries, plus a
 * crosshair on each corner. It rides the same transform as the ink, so a re-print
 * after a nudge shows the corrected position rather than the original drift.
 */
function AlignmentTarget(): React.JSX.Element {
  const arm = 6
  const corners = [
    { x: FRAME.left, y: FRAME.top },
    { x: FRAME.right, y: FRAME.top },
    { x: FRAME.left, y: FRAME.bottom },
    { x: FRAME.right, y: FRAME.bottom },
  ]
  return (
    <svg className="sheet-layer alignment-target" viewBox={VIEW_BOX} aria-hidden="true">
      <rect
        x={FRAME.left}
        y={FRAME.top}
        width={FRAME.right - FRAME.left}
        height={FRAME.bottom - FRAME.top}
        fill="none"
        stroke="#d81b60"
        strokeWidth={0.2}
      />
      {corners.map(c => (
        <g key={`${c.x}-${c.y}`} stroke="#d81b60" strokeWidth={0.2}>
          <line x1={c.x - arm} x2={c.x + arm} y1={c.y} y2={c.y} />
          <line x1={c.x} x2={c.x} y1={c.y - arm} y2={c.y + arm} />
        </g>
      ))}
    </svg>
  )
}

export default function FormSheet({
  value,
  onChange,
  selectedSymbol,
  mode,
  calibration,
}: FormSheetProps) {
  return (
    <div className="sheet">
      <svg className="sheet-layer template-chrome" viewBox={VIEW_BOX} aria-hidden="true">
        <HeaderChrome />
        <AudiogramChrome />
        <TympanometryChrome />
        <MeasurementsChrome />
        <SymptomsChrome />
        <NotesChrome />
      </svg>

      <div className="sheet-layer alignment-layer" style={inkTransform('preprinted', calibration)}>
        <AlignmentTarget />
      </div>

      <div className="sheet-layer template-ink" style={inkTransform(mode, calibration)}>
        <svg className="sheet-layer" viewBox={VIEW_BOX}>
          <AudiogramInk
            right={value.rightAudiogram}
            left={value.leftAudiogram}
            onRightChange={data => onChange({ rightAudiogram: data })}
            onLeftChange={data => onChange({ leftAudiogram: data })}
            eustachian={value.eustachian}
            onEustachianChange={eustachian => onChange({ eustachian })}
            selectedSymbol={selectedSymbol}
            mode={mode}
          />
          <TympanometryInk
            right={value.rightTympanogram}
            left={value.leftTympanogram}
            onRightChange={data => onChange({ rightTympanogram: data })}
            onLeftChange={data => onChange({ leftTympanogram: data })}
            mode="edit"
          />
          <MeasurementsInk
            speechPoints={value.speechPoints}
            onSpeechPointsChange={speechPoints => onChange({ speechPoints })}
            mode={mode}
          />
          <SymptomsInk
            data={value.symptoms}
            onChange={symptoms => onChange({ symptoms })}
            mode={mode}
          />
        </svg>

        <HeaderFields
          value={value}
          onChange={(field, text) => onChange({ [field]: text })}
          mode={mode}
        />
        <AudiogramFields
          onRightChange={data => onChange({ rightAudiogram: data })}
          onLeftChange={data => onChange({ leftAudiogram: data })}
        />
        <MeasurementsFields
          measurements={value.measurements}
          onMeasurementsChange={measurements => onChange({ measurements })}
          mode={mode}
        />
        <NotesFields
          tympanometryNotes={value.tympanometryNotes}
          audiometryNotes={value.audiometryNotes}
          onChange={(field, text) => onChange({ [field]: text })}
          mode={mode}
        />
      </div>
    </div>
  )
}
