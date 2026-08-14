/**
 * SheetValue <-> the prop shapes the original Konva form components expect.
 *
 * Both print modes edit one store (SheetValue). Nothing here changes those
 * components; each conversion is total and lossless in the direction that
 * matters: anything the plain form cannot show is carried through untouched.
 */
import { migrateSymbols, type PlacedSymbol, serializeSymbols } from '../print/panels/AudiogramPanel'
import {
  COMPLIANCE_MAX,
  COMPLIANCE_MIN,
  PRESSURE_MAX,
  PRESSURE_MIN,
  type BezierPoint,
} from '../print/panels/TympanometryPanel'
import { clamp } from '../print/formSpec'
import type { EarMeasurements, MeasurementsValue } from '../print/panels/MeasurementsPanel'
import type { SheetValue, SpeechExtras } from '../print/FormSheet'

/* ------------------------------------------------------------------ *
 * Audiogram
 * ------------------------------------------------------------------ */

/**
 * The original chart plots ten octave/half-octave steps. The yellow paper adds
 * 0.125 and 12 kHz, which have no column here, so those points stay in the store
 * and are simply not drawn in plain mode.
 */
export const PLAIN_FREQUENCIES: ReadonlyArray<number> = [
  0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8,
]

function plottable(symbol: PlacedSymbol): boolean {
  return PLAIN_FREQUENCIES.includes(symbol.freq)
}

/** Store -> chart. Drops only what the chart has no column for. */
export function audiogramToPlain(stored: string): string {
  const visible = migrateSymbols(stored).filter(plottable)
  return serializeSymbols(visible)
}

/**
 * Chart -> store. The chart only ever echoes back symbols it could draw, so the
 * off-chart ones are re-attached from the previous store value rather than lost.
 */
export function audiogramFromPlain(edited: string, previous: string): string {
  const carried = migrateSymbols(previous).filter(s => !plottable(s))
  const visible = migrateSymbols(edited).filter(plottable)
  return serializeSymbols([...carried, ...visible])
}

/* ------------------------------------------------------------------ *
 * Tympanometry
 * ------------------------------------------------------------------ */

/**
 * The store keeps real units (daPa, ml). The original chart works in its own
 * canvas pixels, laid out by these constants, which are its margins and span.
 * The value range is the printed sheet's, not the chart's original -300..+300 /
 * 0..5, so every value the yellow paper can carry stays on stage and inside the
 * bounds the preprinted panel enforces.
 */
export const PLAIN_TYMP_PX = { left: 40, width: 240, top: 15, height: 120 } as const
export const PLAIN_TYMP_AXIS = {
  pressureMin: PRESSURE_MIN,
  pressureMax: PRESSURE_MAX,
  complianceMin: COMPLIANCE_MIN,
  complianceMax: COMPLIANCE_MAX,
} as const

const PRESSURE_SPAN = PRESSURE_MAX - PRESSURE_MIN
const COMPLIANCE_SPAN = COMPLIANCE_MAX - COMPLIANCE_MIN

function toPx(p: { x: number; y: number }): { x: number; y: number } {
  return {
    x: PLAIN_TYMP_PX.left + ((p.x - PRESSURE_MIN) / PRESSURE_SPAN) * PLAIN_TYMP_PX.width,
    y:
      PLAIN_TYMP_PX.top +
      PLAIN_TYMP_PX.height -
      ((p.y - COMPLIANCE_MIN) / COMPLIANCE_SPAN) * PLAIN_TYMP_PX.height,
  }
}

/**
 * Clamped: a value above COMPLIANCE_MAX would read as an old Konva pixel curve
 * on the next load and be re-scaled into a flat line.
 */
function fromPx(p: { x: number; y: number }): { x: number; y: number } {
  const x = ((p.x - PLAIN_TYMP_PX.left) / PLAIN_TYMP_PX.width) * PRESSURE_SPAN + PRESSURE_MIN
  const y =
    ((PLAIN_TYMP_PX.top + PLAIN_TYMP_PX.height - p.y) / PLAIN_TYMP_PX.height) * COMPLIANCE_SPAN +
    COMPLIANCE_MIN
  return {
    x: clamp(x, PRESSURE_MIN, PRESSURE_MAX),
    y: clamp(y, COMPLIANCE_MIN, COMPLIANCE_MAX),
  }
}

function convertCurve(
  points: BezierPoint[],
  f: (p: { x: number; y: number }) => { x: number; y: number },
): BezierPoint[] {
  return points.map(p => ({
    ...f(p),
    handleIn: p.handleIn ? f(p.handleIn) : null,
    handleOut: p.handleOut ? f(p.handleOut) : null,
  }))
}

function parseCurve(raw: string): BezierPoint[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as BezierPoint[]) : []
  } catch {
    return []
  }
}

function serializeCurve(points: BezierPoint[]): string {
  return points.length ? JSON.stringify(points) : ''
}

export function tympanogramToPlain(stored: string): string {
  return serializeCurve(convertCurve(parseCurve(stored), toPx))
}

export function tympanogramFromPlain(edited: string): string {
  return serializeCurve(convertCurve(parseCurve(edited), fromPx))
}

/* ------------------------------------------------------------------ *
 * Speech audiometry
 * ------------------------------------------------------------------ */

export interface PlainSpeechEar {
  srt: string
  level: string
  discrimination: string
  maskingSRT: string
  maskingDS: string
}

export interface PlainSpeechData {
  rightEar: PlainSpeechEar
  leftEar: PlainSpeechEar
}

const EMPTY_EXTRAS: SpeechExtras['right'] = { srt: '', level: '', maskingSRT: '', maskingDS: '' }

function extrasOf(value: SheetValue, ear: 'right' | 'left') {
  return { ...EMPTY_EXTRAS, ...(value.speechExtras?.[ear] ?? {}) }
}

/**
 * Discrimination is the one column both forms print, so it lives in
 * `measurements`. SRT, level and the two masking columns have no box on the
 * yellow paper; they keep their own slot in the store so plain mode neither
 * loses them nor writes them somewhere the printed sheet would show them.
 */
export function speechToPlain(value: SheetValue): PlainSpeechData {
  const build = (ear: 'right' | 'left'): PlainSpeechEar => ({
    ...extrasOf(value, ear),
    discrimination: value.measurements[ear].discrimination,
  })
  return { rightEar: build('right'), leftEar: build('left') }
}

export function speechFromPlain(
  data: PlainSpeechData,
  value: SheetValue,
): Pick<SheetValue, 'measurements' | 'speechExtras'> {
  const measurements: MeasurementsValue = { right: value.measurements.right, left: value.measurements.left }
  const speechExtras: SpeechExtras = { right: { ...EMPTY_EXTRAS }, left: { ...EMPTY_EXTRAS } }

  for (const ear of ['right', 'left'] as const) {
    const next = data[ear === 'right' ? 'rightEar' : 'leftEar']
    const current: EarMeasurements = value.measurements[ear]
    measurements[ear] = { ...current, discrimination: next.discrimination }
    speechExtras[ear] = {
      srt: next.srt,
      level: next.level,
      maskingSRT: next.maskingSRT,
      maskingDS: next.maskingDS,
    }
  }

  return { measurements, speechExtras }
}
