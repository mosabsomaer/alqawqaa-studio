import { useEffect, useRef, useState } from 'react'
import type { SymbolType } from '../../components/AudiometryToolbar'
import {
  DB_LEVELS,
  DB_MAX,
  DB_MIN,
  FREQUENCIES,
  FREQUENCY_LINES,
  AUDIOGRAM_COLUMN_COUNT,
  clamp,
  frequencyLine,
  nearestFrequency,
  snapDb,
  type PrintMode,
} from '../formSpec'
import SymbolShape, { SYMBOL_COLORS, symbolColor, symbolExtent, SYMBOL_RADIUS } from './AudiogramSymbols'

/* ------------------------------------------------------------------ *
 * Geometry
 * ------------------------------------------------------------------ */

export type Ear = 'right' | 'left'

interface ChartGeometry {
  /** Left edge of the grid body, which is also grid line 0. */
  gridLeft: number
  gridRight: number
  colStep: number
  /** dB label column outside the grid, right-aligned. Absent on the left chart, which shares the middle column. */
  labelLeftEnd: number
  /** dB label column outside the grid, left-aligned. */
  labelRightStart: number
  eustachian: { good: number; fair: number; bad: number; end: number }
}

/**
 * Centre of each printed dB rule, one per entry of DB_LEVELS, in millimetres.
 * Measured off the de-skewed 300dpi scan and averaged over the two charts, which
 * sit 0.10-0.17mm apart from each other.
 *
 * The ladder is deliberately a table and not a step: the rows are not evenly
 * spaced on paper. Most run ~4.85mm but 110->120 runs 5.81mm, so any straight
 * line fitted through the 14 rules misses by up to 0.59mm somewhere. Interpolate
 * between neighbours for the 5 dB half-steps.
 */
const DB_RULES: ReadonlyArray<number> = [
  49.17, 54.04, 58.73, 63.65, 68.65, 73.49, 78.37, 83.25, 88.07, 92.84, 97.75, 102.71, 107.42,
  113.23,
]

/**
 * The paper prints RIGHT on the left half of the sheet and LEFT on the right half.
 * The two grids are near-identical but not exactly so; each keeps its measured span.
 */
export const AUDIOGRAM_GEOMETRY = {
  /** Top rule of the whole audiogram box, above the header row. */
  boxTop: 40.3,
  /** Rule between the header row and the grid. Doubles as the -10 dB line. */
  dbTop: DB_RULES[0],
  /** Bottom rule of the grid. Doubles as the 120 dB line. */
  dbBottom: DB_RULES[DB_RULES.length - 1],
  /** Nominal millimetres per 10 dB. Layout that has to land on a rule uses dbY. */
  dbStep: (DB_RULES[DB_RULES.length - 1] - DB_RULES[0]) / (DB_RULES.length - 1),

  /** Frequency captions sit above the box. */
  freqLabelBaseline: 38.9,

  header: {
    /** Grid-line indices where the header row is divided. */
    dividers: [3, 5, 7, 9, 11, 13],
    textBaseline: 45.95,
    earBaseline: 46.3,
  },

  eust: { top: 116.16, bottom: 124.93 },

  /** Screen-only Clear control, parked in the gap between the grid and the Eustachian row. */
  clearButton: { width: 9.5, height: 2.6, top: 113.4 },

  right: {
    gridLeft: 28.74,
    gridRight: 97.16,
    colStep: (97.16 - 28.74) / AUDIOGRAM_COLUMN_COUNT,
    labelLeftEnd: 27.5,
    labelRightStart: 99.0,
    eustachian: { good: 69.64, fair: 78.95, bad: 87.97, end: 97.2 },
  } as ChartGeometry,

  left: {
    gridLeft: 105.49,
    gridRight: 173.69,
    colStep: (173.69 - 105.49) / AUDIOGRAM_COLUMN_COUNT,
    labelLeftEnd: 0,
    labelRightStart: 175.9,
    eustachian: { good: 146.43, fair: 155.66, bad: 164.51, end: 173.69 },
  } as ChartGeometry,
} as const

const G = AUDIOGRAM_GEOMETRY
const CHROME_STROKE = { hairline: 0.15, rule: 0.25, heavy: 0.5, frame: 0.7 }
const FONT = 'Arial, Helvetica, sans-serif'

/** Interoctave frequencies, one per header cell right of the empty second cell. */
const HEADER_CELLS: ReadonlyArray<{ label: string; line: number }> = FREQUENCY_LINES.filter(
  f => f.interoctave
).map(f => ({ label: String(f.freq), line: f.line }))

/**
 * Verticals the plate rules heavily: 0.25, 1 and 4 kHz, every fourth grid line.
 * The other octaves carry exactly the same weight as the interoctaves between
 * them on the scan, so only these three are picked out.
 */
const HEAVY_LINES = [3, 7, 11]

/** dB rules the plate rules heavily. -10 and 120 are drawn with the box below. */
const HEAVY_DB = [20, 100]

export function chartGeometry(ear: Ear): ChartGeometry {
  return ear === 'right' ? G.right : G.left
}

export function freqX(ear: Ear, freq: number): number {
  const g = chartGeometry(ear)
  return g.gridLeft + frequencyLine(freq) * g.colStep
}

export function lineX(ear: Ear, line: number): number {
  const g = chartGeometry(ear)
  return g.gridLeft + line * g.colStep
}

/** Interpolates between the measured rules, and off the ends on their own slope. */
export function dbY(db: number): number {
  const i = (db - DB_MIN) / 10
  const lo = clamp(Math.floor(i), 0, DB_RULES.length - 2)
  return DB_RULES[lo] + (i - lo) * (DB_RULES[lo + 1] - DB_RULES[lo])
}

function xToFreq(ear: Ear, x: number): number {
  const g = chartGeometry(ear)
  return nearestFrequency((x - g.gridLeft) / g.colStep)
}

function yToDb(y: number): number {
  let lo = 0
  while (lo < DB_RULES.length - 2 && y >= DB_RULES[lo + 1]) lo++
  const t = (y - DB_RULES[lo]) / (DB_RULES[lo + 1] - DB_RULES[lo])
  return snapDb(DB_MIN + (lo + t) * 10)
}

/* ------------------------------------------------------------------ *
 * Data
 * ------------------------------------------------------------------ */

export interface PlacedSymbol {
  id: string
  freq: number
  db: number
  symbolType: SymbolType
}

export type EustachianGrade = 'good' | 'fair' | 'bad'

export interface EustachianValue {
  right: EustachianGrade | null
  left: EustachianGrade | null
}

export const EMPTY_EUSTACHIAN: EustachianValue = { right: null, left: null }

/**
 * Reads either the current shape or the pre-SVG one, which cached x/y in chart pixels
 * and only offered ten frequencies. The cached coordinates are dropped: position is
 * derived from freq/db now, so a stale x/y would fight the geometry.
 */
export function migrateSymbols(raw: string): PlacedSymbol[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const out: PlacedSymbol[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const freq = Number(rec.freq)
    const db = Number(rec.db)
    if (!Number.isFinite(freq) || !Number.isFinite(db)) continue
    if (typeof rec.symbolType !== 'string') continue
    if (!FREQUENCIES.includes(freq)) continue
    out.push({
      id: typeof rec.id === 'string' ? rec.id : newId(),
      freq,
      db: clamp(snapDb(db), DB_MIN, DB_MAX),
      symbolType: rec.symbolType as SymbolType,
    })
  }
  return out
}

export function serializeSymbols(symbols: PlacedSymbol[]): string {
  return symbols.length ? JSON.stringify(symbols) : ''
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** The toolbar offers one symbol per pair; each chart rewrites it to its own ear. */
function forEar(symbolType: SymbolType, ear: Ear): SymbolType {
  const other: Ear = ear === 'right' ? 'left' : 'right'
  if (symbolType.includes(other)) {
    return symbolType.replace(other, ear) as SymbolType
  }
  return symbolType
}

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

function Grid({ ear }: { ear: Ear }) {
  const g = chartGeometry(ear)

  return (
    <>
      {/* Only lines carrying a frequency are ruled: 2 and 4 are column positions, not rules. */}
      {FREQUENCY_LINES.map(f => (
        <line
          key={`v${f.line}`}
          x1={lineX(ear, f.line)}
          y1={G.dbTop}
          x2={lineX(ear, f.line)}
          y2={G.dbBottom}
          strokeWidth={HEAVY_LINES.includes(f.line) ? CHROME_STROKE.heavy : CHROME_STROKE.rule}
        />
      ))}
      {G.header.dividers.map(i => (
        <line
          key={`h-div${i}`}
          x1={lineX(ear, i)}
          y1={G.boxTop}
          x2={lineX(ear, i)}
          y2={G.dbTop}
          strokeWidth={HEAVY_LINES.includes(i) ? CHROME_STROKE.heavy : CHROME_STROKE.rule}
        />
      ))}
      {DB_LEVELS.slice(1, -1).map(db => (
        <line
          key={`h${db}`}
          x1={g.gridLeft}
          y1={dbY(db)}
          x2={g.gridRight}
          y2={dbY(db)}
          strokeWidth={HEAVY_DB.includes(db) ? CHROME_STROKE.heavy : CHROME_STROKE.rule}
        />
      ))}
      <line
        x1={g.gridLeft}
        y1={G.dbTop}
        x2={g.gridRight}
        y2={G.dbTop}
        strokeWidth={CHROME_STROKE.heavy}
      />
      <rect
        x={g.gridLeft}
        y={G.boxTop}
        width={g.gridRight - g.gridLeft}
        height={G.dbBottom - G.boxTop}
        fill="none"
        strokeWidth={CHROME_STROKE.frame}
      />
    </>
  )
}

function DbLabelColumn({ x, anchor }: { x: number; anchor: 'start' | 'end' }) {
  return (
    <>
      <text x={x} y={42.25} fontSize={2.3} fontWeight="bold" fill="currentColor" stroke="none" textAnchor={anchor}>
        dB
      </text>
      {DB_LEVELS.map(db => (
        <text
          key={db}
          x={x}
          y={dbY(db) + 0.95}
          fontSize={2.7}
          fontWeight="bold" fill="currentColor" stroke="none"
          textAnchor={anchor}
        >
          {`‎${db}`}
        </text>
      ))}
    </>
  )
}

function ChartChrome({ ear }: { ear: Ear }) {
  const g = chartGeometry(ear)
  return (
    <g>
      <Grid ear={ear} />

      {FREQUENCY_LINES.filter(f => !f.interoctave).map(f => (
        <text
          key={f.freq}
          x={lineX(ear, f.line)}
          y={G.freqLabelBaseline}
          fontSize={2.9}
          fontWeight="bold" fill="currentColor" stroke="none"
          textAnchor="middle"
        >
          {f.freq}
        </text>
      ))}
      <text x={g.gridRight + 0.15} y={G.freqLabelBaseline} fontSize={2.9} fontWeight="bold" fill="currentColor" stroke="none" textAnchor="end">
        KHz
      </text>

      <text x={g.gridLeft + 1.85} y={G.header.earBaseline} fontSize={3.4} fontWeight="bold" fill="currentColor" stroke="none">
        {ear === 'right' ? 'RIGHT' : 'LEFT'}
      </text>
      {HEADER_CELLS.map(cell => (
        <text
          key={cell.label}
          x={lineX(ear, cell.line)}
          y={G.header.textBaseline}
          fontSize={2.7}
          fontWeight="bold" fill="currentColor" stroke="none"
          textAnchor="middle"
        >
          {cell.label}
        </text>
      ))}

      {ear === 'right' && <DbLabelColumn x={g.labelLeftEnd} anchor="end" />}
      <DbLabelColumn x={g.labelRightStart} anchor="start" />
    </g>
  )
}

function EustachianChrome({ ear }: { ear: Ear }) {
  const g = chartGeometry(ear)
  const e = g.eustachian
  const midY = (G.eust.top + G.eust.bottom) / 2
  const cells: Array<[string, number, number]> = [
    ['good', e.good, e.fair],
    ['fair', e.fair, e.bad],
    ['bad', e.bad, e.end],
  ]

  return (
    <g>
      <rect
        x={g.gridLeft}
        y={G.eust.top}
        width={e.end - g.gridLeft}
        height={G.eust.bottom - G.eust.top}
        fill="none"
        strokeWidth={CHROME_STROKE.heavy}
      />
      {[e.good, e.fair, e.bad].map(x => (
        <line key={x} x1={x} y1={G.eust.top} x2={x} y2={G.eust.bottom} strokeWidth={CHROME_STROKE.rule} />
      ))}
      <text
        x={(g.gridLeft + e.good) / 2}
        y={midY - 0.2}
        fontSize={2.5}
        fontWeight="bold" fill="currentColor" stroke="none"
        textAnchor="middle"
      >
        Eustachian tube function
      </text>
      <text
        x={(g.gridLeft + e.good) / 2}
        y={midY + 2.5}
        fontSize={1.7}
        fontWeight="bold"
        fontStyle="italic"
        fill="currentColor"
        stroke="none"
        textAnchor="middle"
      >
        ( only in perforated drum )
      </text>
      {cells.map(([label, x0, x1]) => (
        <text key={label} x={(x0 + x1) / 2} y={midY + 1.2} fontSize={2.4} fontWeight="bold" fill="currentColor" stroke="none" textAnchor="middle">
          {label}
        </text>
      ))}
    </g>
  )
}

export function AudiogramChrome() {
  return (
    <g
      color="#4a4a3f"
      stroke="currentColor"
      fill="none"
      strokeLinecap="square"
      fontFamily={FONT}
    >
      <ChartChrome ear="right" />
      <ChartChrome ear="left" />
      <EustachianChrome ear="right" />
      <EustachianChrome ear="left" />
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Ink
 * ------------------------------------------------------------------ */

/** Symbols in the same group are joined by one polyline. No-response marks join their AC group. */
function lineGroup(symbolType: SymbolType): string | null {
  if (symbolType.startsWith('ac-right') || symbolType === 'nr-right') return 'ac-right'
  if (symbolType.startsWith('ac-left') || symbolType === 'nr-left') return 'ac-left'
  if (symbolType.startsWith('bc-right')) return 'bc-right'
  if (symbolType.startsWith('bc-left')) return 'bc-left'
  return null
}

interface Selection {
  ear: Ear
  id: string
}

export interface AudiogramInkProps {
  right: string
  left: string
  onRightChange: (data: string) => void
  onLeftChange: (data: string) => void
  eustachian: EustachianValue
  onEustachianChange: (value: EustachianValue) => void
  selectedSymbol: SymbolType
  mode: PrintMode
}

export function AudiogramInk({
  right,
  left,
  onRightChange,
  onLeftChange,
  eustachian,
  onEustachianChange,
  selectedSymbol,
  mode,
}: AudiogramInkProps) {
  const rightSymbols = migrateSymbols(right)
  const leftSymbols = migrateSymbols(left)
  const [selected, setSelected] = useState<Selection | null>(null)
  const [hover, setHover] = useState<{ ear: Ear; freq: number; db: number } | null>(null)
  const dragging = useRef<Selection | null>(null)

  const symbolsFor = (ear: Ear) => (ear === 'right' ? rightSymbols : leftSymbols)
  const commit = (ear: Ear, next: PlacedSymbol[]) =>
    (ear === 'right' ? onRightChange : onLeftChange)(serializeSymbols(next))

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      const list = symbolsFor(selected.ear)
      const sym = list.find(s => s.id === selected.id)
      if (!sym) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        commit(selected.ear, list.filter(s => s.id !== selected.id))
        setSelected(null)
        return
      }

      const i = FREQUENCIES.indexOf(sym.freq)
      let freq = sym.freq
      let db = sym.db
      if (e.key === 'ArrowRight') freq = FREQUENCIES[Math.min(i + 1, FREQUENCIES.length - 1)]
      else if (e.key === 'ArrowLeft') freq = FREQUENCIES[Math.max(i - 1, 0)]
      else if (e.key === 'ArrowUp') db = Math.max(DB_MIN, sym.db - 5)
      else if (e.key === 'ArrowDown') db = Math.min(DB_MAX, sym.db + 5)
      else return

      e.preventDefault()
      if (freq === sym.freq && db === sym.db) return
      commit(selected.ear, list.map(s => (s.id === selected.id ? { ...s, freq, db } : s)))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, right, left, onRightChange, onLeftChange])

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

  const place = (ear: Ear, e: React.MouseEvent) => {
    const p = toSheet(e)
    if (!p) return
    const list = symbolsFor(ear)
    commit(ear, [
      ...list,
      {
        id: newId(),
        freq: xToFreq(ear, p.x),
        db: yToDb(p.y),
        symbolType: forEar(selectedSymbol, ear),
      },
    ])
  }

  const onSymbolPointerMove = (e: React.PointerEvent) => {
    const drag = dragging.current
    if (!drag) return
    const p = toSheet(e)
    if (!p) return
    const freq = xToFreq(drag.ear, p.x)
    const db = yToDb(p.y)
    const list = symbolsFor(drag.ear)
    const sym = list.find(s => s.id === drag.id)
    if (!sym || (sym.freq === freq && sym.db === db)) return
    commit(drag.ear, list.map(s => (s.id === drag.id ? { ...s, freq, db } : s)))
  }

  const renderChart = (ear: Ear) => {
    const g = chartGeometry(ear)
    const list = symbolsFor(ear)
    const groups = new Map<string, PlacedSymbol[]>()
    for (const sym of list) {
      const group = lineGroup(sym.symbolType)
      if (!group) continue
      const bucket = groups.get(group)
      if (bucket) bucket.push(sym)
      else groups.set(group, [sym])
    }

    return (
      <g key={ear} data-ink={`audiogram-${ear}`}>
        <rect
          x={g.gridLeft}
          y={G.dbTop}
          width={g.gridRight - g.gridLeft}
          height={G.dbBottom - G.dbTop}
          fill="transparent"
          className="no-print"
          style={{ cursor: 'crosshair' }}
          onClick={e => place(ear, e)}
          onMouseMove={e => {
            const p = toSheet(e)
            if (p) setHover({ ear, freq: xToFreq(ear, p.x), db: yToDb(p.y) })
          }}
          onMouseLeave={() => setHover(null)}
        />

        {mode === 'plain' && hover && hover.ear === ear && (
          <circle
            cx={freqX(ear, hover.freq)}
            cy={dbY(hover.db)}
            r={SYMBOL_RADIUS}
            fill="none"
            stroke="#9ca3af"
            strokeWidth={0.2}
            strokeDasharray="0.6 0.6"
            className="no-print"
            pointerEvents="none"
          />
        )}

        {[...groups.entries()].map(([group, syms]) => {
          if (syms.length < 2) return null
          const sorted = [...syms].sort((a, b) => a.freq - b.freq)
          return (
            <polyline
              key={group}
              points={sorted.map(s => `${freqX(ear, s.freq)},${dbY(s.db)}`).join(' ')}
              fill="none"
              stroke={group.includes('right') ? SYMBOL_COLORS.right : SYMBOL_COLORS.left}
              strokeWidth={0.3}
              strokeDasharray={group.startsWith('bc-') ? '1.2 1.2' : undefined}
              pointerEvents="none"
            />
          )
        })}

        {list.map(sym => {
          const isSelected = selected?.ear === ear && selected.id === sym.id
          return (
            <g
              key={sym.id}
              transform={`translate(${freqX(ear, sym.freq)} ${dbY(sym.db)})`}
              style={{ cursor: 'move' }}
              onPointerDown={e => {
                e.stopPropagation()
                ;(e.target as Element).setPointerCapture(e.pointerId)
                dragging.current = { ear, id: sym.id }
                setSelected({ ear, id: sym.id })
              }}
              onPointerMove={onSymbolPointerMove}
              onPointerUp={e => {
                ;(e.target as Element).releasePointerCapture(e.pointerId)
                dragging.current = null
              }}
            >
              <rect
                x={-2.5}
                y={-2.5}
                width={5}
                height={symbolExtent(sym.symbolType) + 2.5 + SYMBOL_RADIUS}
                fill="transparent"
                className="no-print"
              />
              <SymbolShape symbolType={sym.symbolType} color={symbolColor(sym.symbolType)} />
              {isSelected && (
                <circle
                  cx={0}
                  cy={0}
                  r={symbolExtent(sym.symbolType) + 0.8}
                  fill="none"
                  stroke="#000"
                  strokeWidth={0.15}
                  strokeDasharray="0.7 0.7"
                  className="no-print"
                  pointerEvents="none"
                />
              )}
            </g>
          )
        })}
      </g>
    )
  }

  const renderEustachian = (ear: Ear) => {
    const g = chartGeometry(ear)
    const e = g.eustachian
    const cells: Array<[EustachianGrade, number, number]> = [
      ['good', e.good, e.fair],
      ['fair', e.fair, e.bad],
      ['bad', e.bad, e.end],
    ]
    const current = eustachian[ear]

    return (
      <g key={`eust-${ear}`} data-ink={`eustachian-${ear}`}>
        {cells.map(([grade, x0, x1]) => (
          <g
            key={grade}
            style={{ cursor: 'pointer' }}
            onClick={() =>
              onEustachianChange({ ...eustachian, [ear]: current === grade ? null : grade })
            }
          >
            <rect
              x={x0}
              y={G.eust.top}
              width={x1 - x0}
              height={G.eust.bottom - G.eust.top}
              fill="transparent"
              className="no-print"
            />
            {current === grade && (
              <ellipse
                cx={(x0 + x1) / 2}
                cy={(G.eust.top + G.eust.bottom) / 2}
                rx={(x1 - x0) / 2 - 1.2}
                ry={(G.eust.bottom - G.eust.top) / 2 - 1.2}
                fill="none"
                stroke="#1f2937"
                strokeWidth={0.4}
                pointerEvents="none"
              />
            )}
          </g>
        ))}
      </g>
    )
  }

  return (
    <g fontFamily={FONT}>
      {renderChart('right')}
      {renderChart('left')}
      {renderEustachian('right')}
      {renderEustachian('left')}
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Fields
 * ------------------------------------------------------------------ */

export interface AudiogramFieldsProps {
  onRightChange: (data: string) => void
  onLeftChange: (data: string) => void
}

/**
 * HTML overlay fragment. Screen-only, so it is never laid out against the paper,
 * but it is still positioned in sheet millimetres to sit under its own chart.
 */
export function AudiogramFields({ onRightChange, onLeftChange }: AudiogramFieldsProps) {
  const buttons: Array<[Ear, () => void]> = [
    ['right', () => onRightChange('')],
    ['left', () => onLeftChange('')],
  ]

  return (
    <>
      {buttons.map(([ear, onClear]) => (
        <button
          key={ear}
          type="button"
          className="no-print"
          onClick={onClear}
          style={{
            position: 'absolute',
            left: `${chartGeometry(ear).gridRight - G.clearButton.width}mm`,
            top: `${G.clearButton.top}mm`,
            width: `${G.clearButton.width}mm`,
            height: `${G.clearButton.height}mm`,
            padding: 0,
            font: `2.1mm ${FONT}`,
            color: '#374151',
            background: '#fff',
            border: '0.15mm solid #9ca3af',
            borderRadius: '0.6mm',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      ))}
    </>
  )
}
