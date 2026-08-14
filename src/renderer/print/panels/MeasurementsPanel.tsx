import { useEffect, useRef, useState } from 'react'
import { clamp, type PrintMode } from '../formSpec'
import SymbolShape, { SYMBOL_COLORS } from './AudiogramSymbols'

/**
 * Bottom-left block of the sheet: the tone-decay / recruitment / discrimination /
 * stapedial-reflex table, and the relative speech level grid beneath it.
 *
 * Every millimetre is measured off the de-skewed 300dpi scan. The printed headers
 * carry the plate's own spelling mistakes ("RECRUTTMENT", "diserimination",
 * "scre"); they are reproduced verbatim because the doctors read them off paper.
 */

const CHROME = '#4a4a3f'
const FONT = 'Arial, Helvetica, sans-serif'
const STROKE = { rule: 0.25, heavy: 0.5 }

/* ------------------------------------------------------------------ *
 * Geometry
 * ------------------------------------------------------------------ */

/**
 * Column rules of the measurements table. `toneSplit` (the 500Hz / 1000Hz
 * divider) starts at the sub-header rule, not at the top of the table.
 */
export const MEASUREMENTS_TABLE = {
  left: 22.69,
  right: 117.2,
  top: 188.55,
  /** Rule under "Tone decay", spanning the tone-decay columns only. */
  subHeaderY: 194.01,
  /** Rule under the whole header row. */
  headerBottomY: 199.22,
  /** Rule between the Right and Left rows. */
  rowSplitY: 204.64,
  bottom: 209.89,
  columns: {
    earLabel: 22.69,
    toneDecay: 33.15,
    toneSplit: 44.05,
    ldl: 55.16,
    discrimination: 77.55,
    stapedial: 100.54,
    end: 117.2,
  },
} as const

const T = MEASUREMENTS_TABLE
const C = T.columns

export const MEASUREMENT_ROWS = [
  { ear: 'right' as const, label: 'Right', top: T.headerBottomY, bottom: T.rowSplitY, unitBaseline: 202.78, labelBaseline: 202.69 },
  { ear: 'left' as const, label: 'Left', top: T.rowSplitY, bottom: T.bottom, unitBaseline: 207.69, labelBaseline: 208.03 },
]

/**
 * Speech grid. The rules are not perfectly evenly spaced on the plate, so both
 * axes keep their measured positions rather than a computed pitch.
 */
export const SPEECH_GRID = {
  left: 22.69,
  right: 117.43,
  top: 211.84,
  bottom: 244.43,
  /** 14 verticals, one per 10dB step from -10 to 120. */
  columnX: [
    22.69, 30.06, 37.38, 44.37, 51.82, 59.39, 66.84, 73.58, 80.64, 88.27, 95.72,
    103.21, 110.32, 117.43,
  ],
  /** 6 horizontals. The plate prints no y-axis labels; we read them as 100% down to 0%. */
  rowY: [211.84, 218.69, 225.13, 230.97, 237.74, 244.43],
  axisBaseline: 248.33,
  axisFontSize: 2.8,
  captionBaseline: 256.46,
  captionCentre: 68.54,
  captionFontSize: 2.7,
  legend: { textX: 24.0, markX: 33.6, rightBaseline: 214.88, leftBaseline: 218.1, fontSize: 2.7 },
} as const

const S = SPEECH_GRID

/** Relative speech level in dB, one per grid vertical. */
export const SPEECH_LEVELS: ReadonlyArray<number> = S.columnX.map((_, i) => -10 + i * 10)

/** Discrimination score per grid horizontal, top rule first. */
export const SPEECH_SCORES: ReadonlyArray<number> = S.rowY.map((_, i) => 100 - i * 20)

export const SPEECH_LEVEL_MIN = SPEECH_LEVELS[0]
export const SPEECH_LEVEL_MAX = SPEECH_LEVELS[SPEECH_LEVELS.length - 1]

export function speechX(level: number): number {
  const i = SPEECH_LEVELS.indexOf(level)
  return S.columnX[i < 0 ? 0 : i]
}

export function speechY(score: number): number {
  const i = SPEECH_SCORES.indexOf(score)
  return S.rowY[i < 0 ? 0 : i]
}

/** Nearest printed vertical to a sheet x, as a dB level. */
export function nearestSpeechLevel(x: number): number {
  let best = 0
  for (let i = 1; i < S.columnX.length; i++) {
    if (Math.abs(S.columnX[i] - x) < Math.abs(S.columnX[best] - x)) best = i
  }
  return SPEECH_LEVELS[best]
}

/** Nearest printed horizontal to a sheet y, as a percentage score. */
export function nearestSpeechScore(y: number): number {
  let best = 0
  for (let i = 1; i < S.rowY.length; i++) {
    if (Math.abs(S.rowY[i] - y) < Math.abs(S.rowY[best] - y)) best = i
  }
  return SPEECH_SCORES[best]
}

/* ------------------------------------------------------------------ *
 * Data
 * ------------------------------------------------------------------ */

export type Ear = 'right' | 'left'

export interface EarMeasurements {
  toneDecay500: string
  toneDecay1000: string
  /** Loudness discomfort level, printed on the plate as RECRUTTMENT ( LDL ). */
  ldl: string
  discrimination: string
  stapedialReflex: string
}

export interface MeasurementsValue {
  right: EarMeasurements
  left: EarMeasurements
}

export type MeasurementField = keyof EarMeasurements

const EMPTY_EAR: EarMeasurements = {
  toneDecay500: '',
  toneDecay1000: '',
  ldl: '',
  discrimination: '',
  stapedialReflex: '',
}

export const EMPTY_MEASUREMENTS: MeasurementsValue = { right: EMPTY_EAR, left: EMPTY_EAR }

export interface SpeechPoint {
  id: string
  ear: Ear
  /** Relative speech level in dB, snapped to a printed vertical. */
  level: number
  /** Discrimination score in percent, snapped to a printed horizontal. */
  score: number
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Tolerant reader for the persisted string form. Anything off-grid is snapped or dropped. */
export function parseSpeechPoints(raw: string): SpeechPoint[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const out: SpeechPoint[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const level = Number(rec.level)
    const score = Number(rec.score)
    if (!Number.isFinite(level) || !Number.isFinite(score)) continue
    if (rec.ear !== 'right' && rec.ear !== 'left') continue
    out.push({
      id: typeof rec.id === 'string' ? rec.id : newId(),
      ear: rec.ear,
      level: snapLevel(level),
      score: snapScore(score),
    })
  }
  return out
}

export function serializeSpeechPoints(points: SpeechPoint[]): string {
  return points.length ? JSON.stringify(points) : ''
}

function snapLevel(level: number): number {
  const v = clamp(Math.round(level / 10) * 10, SPEECH_LEVEL_MIN, SPEECH_LEVEL_MAX)
  return SPEECH_LEVELS.includes(v) ? v : SPEECH_LEVEL_MIN
}

function snapScore(score: number): number {
  return clamp(Math.round(score / 20) * 20, 0, 100)
}

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

interface HeaderLine {
  text: string
  centre: number
  baseline: number
  fontSize: number
}

/** Printed verbatim, typos included: the doctors match these against the paper. */
const HEADER_LINES: ReadonlyArray<HeaderLine> = [
  { text: 'Tone decay', centre: 43.35, baseline: 192.79, fontSize: 2.85 },
  { text: '500Hz', centre: 38.4, baseline: 197.27, fontSize: 1.8 },
  { text: '1000Hz', centre: 49.32, baseline: 197.27, fontSize: 1.8 },
  { text: 'RECRUTTMENT', centre: 66.12, baseline: 192.79, fontSize: 2.85 },
  { text: '( LDL )', centre: 66.04, baseline: 196.51, fontSize: 2.85 },
  { text: 'world', centre: 89.28, baseline: 191.52, fontSize: 2.7 },
  { text: 'diserimination', centre: 89.2, baseline: 194.65, fontSize: 2.7 },
  { text: 'scre', centre: 89.24, baseline: 197.95, fontSize: 2.7 },
  { text: 'stapedial', centre: 108.67, baseline: 193.72, fontSize: 2.7 },
  { text: 'reflex', centre: 108.67, baseline: 196.43, fontSize: 2.7 },
]

/** Units the plate already prints inside the answer cells, right-aligned. */
export const CELL_UNITS: ReadonlyArray<{ field: MeasurementField; text: string; rightX: number }> = [
  { field: 'ldl', text: 'dB SPL', rightX: 76.12 },
  { field: 'discrimination', text: '%', rightX: 98.81 },
  { field: 'stapedialReflex', text: 'dB SPL', rightX: 115.91 },
]

const UNIT_FONT_SIZE = 1.9

function TableChrome() {
  const verticals = [C.earLabel, C.toneDecay, C.ldl, C.discrimination, C.stapedial, C.end]

  return (
    <g>
      <line x1={T.left} y1={T.top} x2={T.right} y2={T.top} strokeWidth={STROKE.heavy} />
      <line x1={T.left} y1={T.bottom} x2={T.right} y2={T.bottom} strokeWidth={STROKE.heavy} />
      <line
        x1={T.left}
        y1={T.headerBottomY}
        x2={T.right}
        y2={T.headerBottomY}
        strokeWidth={STROKE.rule}
      />
      <line
        x1={T.left}
        y1={T.rowSplitY}
        x2={T.right}
        y2={T.rowSplitY}
        strokeWidth={STROKE.rule}
      />
      <line
        x1={C.toneDecay}
        y1={T.subHeaderY}
        x2={C.ldl}
        y2={T.subHeaderY}
        strokeWidth={STROKE.rule}
      />

      {verticals.map(x => (
        <line
          key={`tv${x}`}
          x1={x}
          y1={T.top}
          x2={x}
          y2={T.bottom}
          strokeWidth={x === C.earLabel || x === C.end ? STROKE.heavy : STROKE.rule}
        />
      ))}
      <line
        x1={C.toneSplit}
        y1={T.subHeaderY}
        x2={C.toneSplit}
        y2={T.bottom}
        strokeWidth={STROKE.rule}
      />

      {HEADER_LINES.map(l => (
        <text
          key={l.text}
          x={l.centre}
          y={l.baseline}
          fontSize={l.fontSize}
          fontWeight="bold"
          textAnchor="middle"
          stroke="none"
          fill="currentColor"
        >
          {l.text}
        </text>
      ))}

      {MEASUREMENT_ROWS.map(row => (
        <text
          key={row.ear}
          x={(C.earLabel + C.toneDecay) / 2}
          y={row.labelBaseline}
          fontSize={2.6}
          fontWeight="bold"
          textAnchor="middle"
          stroke="none"
          fill="currentColor"
        >
          {row.label}
        </text>
      ))}

      {MEASUREMENT_ROWS.map(row =>
        CELL_UNITS.map(unit => (
          <text
            key={`${row.ear}-${unit.field}`}
            x={unit.rightX}
            y={row.unitBaseline}
            fontSize={UNIT_FONT_SIZE}
            fontWeight="bold"
            textAnchor="end"
            stroke="none"
            fill="currentColor"
          >
            {unit.text}
          </text>
        ))
      )}
    </g>
  )
}

function SpeechChrome() {
  return (
    <g>
      {S.rowY.map((y, i) => (
        <line
          key={`sh${y}`}
          x1={S.left}
          y1={y}
          x2={S.right}
          y2={y}
          strokeWidth={i === 0 || i === S.rowY.length - 1 ? STROKE.heavy : STROKE.rule}
        />
      ))}
      {S.columnX.map((x, i) => (
        <line
          key={`sv${x}`}
          // The legend block occupies the first two cells of the top row, so the
          // divider between them is not printed there.
          y1={i === 1 ? S.rowY[1] : S.top}
          x1={x}
          x2={x}
          y2={S.bottom}
          strokeWidth={i === 0 || i === S.columnX.length - 1 ? STROKE.heavy : STROKE.rule}
        />
      ))}

      <text
        x={S.legend.textX}
        y={S.legend.rightBaseline}
        fontSize={S.legend.fontSize}
        fontWeight="bold"
        stroke="none"
        fill="currentColor"
      >
        Right
      </text>
      <text
        x={S.legend.markX}
        y={S.legend.rightBaseline}
        fontSize={S.legend.fontSize}
        fontWeight="bold"
        textAnchor="middle"
        stroke="none"
        fill="currentColor"
      >
        O
      </text>
      <text
        x={S.legend.textX}
        y={S.legend.leftBaseline}
        fontSize={S.legend.fontSize}
        fontWeight="bold"
        stroke="none"
        fill="currentColor"
      >
        Left
      </text>
      <text
        x={S.legend.markX}
        y={S.legend.leftBaseline}
        fontSize={S.legend.fontSize}
        fontWeight="bold"
        textAnchor="middle"
        stroke="none"
        fill="currentColor"
      >
        X
      </text>
      {SPEECH_LEVELS.map((level, i) => (
        <text
          key={level}
          x={S.columnX[i]}
          y={S.axisBaseline}
          fontSize={S.axisFontSize}
          fontWeight="bold"
          textAnchor="middle"
          stroke="none"
          fill="currentColor"
        >
          {level}
        </text>
      ))}

      <text
        x={S.captionCentre}
        y={S.captionBaseline}
        fontSize={S.captionFontSize}
        fontWeight="bold"
        textAnchor="middle"
        stroke="none"
        fill="currentColor"
      >
        RELATIVE SPEECH LEVEL (dB)
      </text>
    </g>
  )
}

export function MeasurementsChrome() {
  return (
    <g
      color={CHROME}
      stroke="currentColor"
      fill="currentColor"
      strokeLinecap="square"
      fontFamily={FONT}
    >
      <g fill="none">
        <TableChrome />
        <SpeechChrome />
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Ink
 * ------------------------------------------------------------------ */

interface CellBox {
  field: MeasurementField
  label: string
  left: number
  right: number
}

/** Answer boxes, stopping short of whatever unit the plate already prints in the cell. */
export const MEASUREMENT_CELLS: ReadonlyArray<CellBox> = [
  { field: 'toneDecay500', label: 'Tone decay 500Hz', left: C.toneDecay, right: C.toneSplit },
  { field: 'toneDecay1000', label: 'Tone decay 1000Hz', left: C.toneSplit, right: C.ldl },
  { field: 'ldl', label: 'Recruitment LDL', left: C.ldl, right: 69.6 },
  { field: 'discrimination', label: 'Word discrimination score', left: C.discrimination, right: 96.6 },
  { field: 'stapedialReflex', label: 'Stapedial reflex', left: C.stapedial, right: 109.3 },
]

const CELL_PAD = 0.8
const CELL_INSET_Y = 0.5
const INK_FONT_SIZE = 3

export interface MeasurementsFieldsProps {
  measurements: MeasurementsValue
  onMeasurementsChange: (value: MeasurementsValue) => void
  mode: PrintMode
}

/** The measurements table's answers: HTML inputs positioned in page millimetres. */
export function MeasurementsFields({
  measurements,
  onMeasurementsChange,
  mode,
}: MeasurementsFieldsProps) {
  const setField = (target: Ear, field: MeasurementField, value: string) => {
    onMeasurementsChange({ ...measurements, [target]: { ...measurements[target], [field]: value } })
  }

  return (
    <>
      {MEASUREMENT_ROWS.map(row =>
        MEASUREMENT_CELLS.map(cell => (
          <input
            key={`${row.ear}-${cell.field}`}
            data-ink
            type="text"
            aria-label={`${row.label} ${cell.label}`}
            value={measurements[row.ear][cell.field]}
            onChange={ev => setField(row.ear, cell.field, ev.target.value)}
            className={mode === 'plain' ? 'ink-underline' : undefined}
            style={{
              position: 'absolute',
              left: `${cell.left + CELL_PAD}mm`,
              top: `${row.top + CELL_INSET_Y}mm`,
              width: `${Math.max(cell.right - cell.left - CELL_PAD * 2, 1)}mm`,
              height: `${row.bottom - row.top - CELL_INSET_Y * 2}mm`,
              fontSize: `${INK_FONT_SIZE}mm`,
              textAlign: 'right',
              boxSizing: 'border-box',
            }}
          />
        ))
      )}
    </>
  )
}

export interface MeasurementsInkProps {
  speechPoints: SpeechPoint[]
  onSpeechPointsChange: (points: SpeechPoint[]) => void
  mode: PrintMode
}

/** The speech grid's plotted marks and curves. */
export function MeasurementsInk({
  speechPoints,
  onSpeechPointsChange,
  mode,
}: MeasurementsInkProps) {
  const [ear, setEar] = useState<Ear>('right')
  const [selected, setSelected] = useState<string | null>(null)
  const [hover, setHover] = useState<{ level: number; score: number } | null>(null)
  const dragging = useRef<string | null>(null)

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      const point = speechPoints.find(p => p.id === selected)
      if (!point) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onSpeechPointsChange(speechPoints.filter(p => p.id !== selected))
        setSelected(null)
        return
      }

      let { level, score } = point
      if (e.key === 'ArrowRight') level = snapLevel(level + 10)
      else if (e.key === 'ArrowLeft') level = snapLevel(level - 10)
      else if (e.key === 'ArrowUp') score = snapScore(score + 20)
      else if (e.key === 'ArrowDown') score = snapScore(score - 20)
      else return

      e.preventDefault()
      if (level === point.level && score === point.score) return
      onSpeechPointsChange(move(speechPoints, selected, level, score))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, speechPoints, onSpeechPointsChange])

  const toSheet = (e: React.PointerEvent | React.MouseEvent): { x: number; y: number } | null => {
    const svg = (e.target as SVGElement).ownerSVGElement
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  const place = (e: React.MouseEvent) => {
    const p = toSheet(e)
    if (!p) return
    const level = nearestSpeechLevel(p.x)
    const score = nearestSpeechScore(p.y)
    // One reading per level per ear, which is the shape of a performance-intensity curve.
    const rest = speechPoints.filter(pt => !(pt.ear === ear && pt.level === level))
    onSpeechPointsChange([...rest, { id: newId(), ear, level, score }])
  }

  const onPointMove = (e: React.PointerEvent) => {
    const id = dragging.current
    if (!id) return
    const p = toSheet(e)
    if (!p) return
    const point = speechPoints.find(pt => pt.id === id)
    if (!point) return
    const level = nearestSpeechLevel(p.x)
    const score = nearestSpeechScore(p.y)
    if (point.level === level && point.score === score) return
    onSpeechPointsChange(move(speechPoints, id, level, score))
  }

  const curves: Array<[Ear, SpeechPoint[]]> = (['right', 'left'] as Ear[]).map(e => [
    e,
    speechPoints.filter(p => p.ear === e).sort((a, b) => a.level - b.level),
  ])

  return (
    <g data-ink="measurements">
      <rect
        x={S.left}
        y={S.top}
        width={S.right - S.left}
        height={S.bottom - S.top}
        fill="transparent"
        className="no-print"
        style={{ cursor: 'crosshair' }}
        onClick={place}
        onMouseMove={e => {
          const p = toSheet(e)
          if (p) setHover({ level: nearestSpeechLevel(p.x), score: nearestSpeechScore(p.y) })
        }}
        onMouseLeave={() => setHover(null)}
      />

      {mode === 'plain' && hover && (
        <circle
          cx={speechX(hover.level)}
          cy={speechY(hover.score)}
          r={1.6}
          fill="none"
          stroke="#9ca3af"
          strokeWidth={0.2}
          strokeDasharray="0.6 0.6"
          className="no-print"
          pointerEvents="none"
        />
      )}

      {curves.map(([curveEar, points]) =>
        points.length < 2 ? null : (
          <polyline
            key={`curve-${curveEar}`}
            points={points.map(p => `${speechX(p.level)},${speechY(p.score)}`).join(' ')}
            fill="none"
            stroke={SYMBOL_COLORS[curveEar]}
            strokeWidth={0.3}
            pointerEvents="none"
          />
        )
      )}

      {speechPoints.map(point => (
        <g
          key={point.id}
          transform={`translate(${speechX(point.level)} ${speechY(point.score)})`}
          style={{ cursor: 'move' }}
          onPointerDown={e => {
            e.stopPropagation()
            ;(e.target as Element).setPointerCapture(e.pointerId)
            dragging.current = point.id
            setSelected(point.id)
          }}
          onPointerMove={onPointMove}
          onPointerUp={e => {
            ;(e.target as Element).releasePointerCapture(e.pointerId)
            dragging.current = null
          }}
        >
          <rect x={-2.2} y={-2.2} width={4.4} height={4.4} fill="transparent" className="no-print" />
          <SymbolShape
            symbolType={point.ear === 'right' ? 'ac-right-unmasked' : 'ac-left-unmasked'}
            color={SYMBOL_COLORS[point.ear]}
          />
          {selected === point.id && (
            <circle
              cx={0}
              cy={0}
              r={2.4}
              fill="none"
              stroke="#000"
              strokeWidth={0.15}
              strokeDasharray="0.7 0.7"
              className="no-print"
              pointerEvents="none"
            />
          )}
        </g>
      ))}

      <g className="no-print" transform={`translate(${S.right - 20.5} ${S.top - 5.4})`}>
        {(['right', 'left'] as Ear[]).map((option, i) => (
          <g key={option} style={{ cursor: 'pointer' }} onClick={() => setEar(option)}>
            <rect
              x={i * 5.2}
              width={5}
              height={4}
              rx={0.8}
              fill={ear === option ? SYMBOL_COLORS[option] : '#fff'}
              stroke="#9ca3af"
              strokeWidth={0.15}
            />
            <text
              x={i * 5.2 + 2.5}
              y={2.85}
              fontFamily={FONT}
              fontSize={2.4}
              fontWeight="bold"
              fill={ear === option ? '#fff' : '#374151'}
              textAnchor="middle"
            >
              {option === 'right' ? 'O' : 'X'}
            </text>
          </g>
        ))}
        <g
          style={{ cursor: 'pointer' }}
          onClick={() => {
            onSpeechPointsChange([])
            setSelected(null)
          }}
          transform="translate(11 0)"
        >
          <rect width={9.5} height={4} rx={0.8} fill="#fff" stroke="#9ca3af" strokeWidth={0.15} />
          <text
            x={4.75}
            y={2.75}
            fontFamily={FONT}
            fontSize={2.2}
            fill="#374151"
            textAnchor="middle"
          >
            Clear
          </text>
        </g>
      </g>
    </g>
  )
}

function move(points: SpeechPoint[], id: string, level: number, score: number): SpeechPoint[] {
  const moved = points.find(p => p.id === id)
  if (!moved) return points
  return points
    .filter(p => p.id === id || !(p.ear === moved.ear && p.level === level))
    .map(p => (p.id === id ? { ...p, level, score } : p))
}
