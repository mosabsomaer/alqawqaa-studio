import { useState } from 'react'
import { SIDE_COLUMN, type PrintMode } from '../formSpec'

/**
 * Bottom-right of the sheet: the C/O symptoms table and the detached
 * "Test rvliability" row beneath it.
 *
 * Every millimetre comes from the de-skewed 300dpi scan. Two things about the
 * plate are deliberate and must not be "fixed": the printed spellings are
 * "Nolse Exp" and "rvliability", and the rule between the RT and LT columns
 * stops at the bottom of the "Facial pal" row instead of running the full
 * height of the table.
 */

const CHROME = '#4a4a3f'
const INK = '#1a1a1a'

const RULE = 0.25
const BOX_RULE = 0.4

/* ------------------------------------------------------------------ *
 * Geometry
 * ------------------------------------------------------------------ */

export const CO_TABLE = {
  left: 127.68,
  right: 173.33,
  top: 189.65,
  bottom: 238.42,
  /** Rule under the C/O | RT | LT | D header band. */
  headerBottom: 195.11,
  /** Vertical rules, left edge through right edge. */
  columnX: [127.68, 148.74, 156.99, 165.12, 173.33],
  /** The RT|LT rule is short on the plate: it ends with the "Facial pal" row. */
  rtLtRuleBottom: 222.12,
  /** Left inset of the row labels from the table's left rule. */
  labelInset: 2.82,
  labelFontSize: 2.6,
  headerFontSize: 2.5,
  headerBaseline: 193.05,
} as const

/** The table's right rule is the same line as the rotated side-text column's left edge. */
export const CO_TABLE_MEETS_SIDE_COLUMN = SIDE_COLUMN.left - CO_TABLE.right

export type CoSide = 'RT' | 'LT' | 'D'

export const CO_SIDES: ReadonlyArray<CoSide> = ['RT', 'LT', 'D']

export const CO_HEADERS: ReadonlyArray<{ text: string; width: number; center: number }> = [
  { text: 'C/O', width: 3.81, center: 138.21 },
  { text: 'RT', width: 2.88, center: 152.87 },
  { text: 'LT', width: 2.54, center: 161.06 },
  { text: 'D', width: 1.35, center: 169.23 },
]

export interface SymptomRow {
  key: string
  /** Exactly as printed on the paper, typos included. */
  label: string
  /** Measured ink width, so the condensed plate face is reproduced faithfully. */
  width: number
  top: number
  bottom: number
  baseline: number
}

/**
 * The row pitch is not quite uniform on the plate: heights run 5.08mm to 5.76mm
 * around a 5.41mm mean, so each boundary is the measured one rather than a
 * multiple of a nominal pitch.
 */
export const SYMPTOM_ROWS: ReadonlyArray<SymptomRow> = [
  { key: 'hloss', label: 'H/loss', width: 6.69, top: 195.11, bottom: 200.28, baseline: 198.46 },
  { key: 'tinnitus', label: 'tinnitus', width: 8.3, top: 200.28, bottom: 205.36, baseline: 203.54 },
  { key: 'otalgia', label: 'otalgia', width: 7.37, top: 205.36, bottom: 211.12, baseline: 208.95 },
  { key: 'discharge', label: 'discharge', width: 10.92, top: 211.12, bottom: 216.58, baseline: 214.34 },
  { key: 'facialPal', label: 'Facial pal', width: 10.41, top: 216.58, bottom: 222.12, baseline: 220.22 },
  { key: 'vertigo', label: 'Vertigo', width: 7.79, top: 222.12, bottom: 227.67, baseline: 225.55 },
  { key: 'noiseExp', label: 'Nolse Exp', width: 11.18, top: 227.67, bottom: 233.17, baseline: 230.97 },
  { key: 'familyHis', label: 'Family His', width: 11.43, top: 233.17, bottom: 238.42, baseline: 236.3 },
]

export type Reliability = 'good' | 'fair' | 'bad'

export const RELIABILITY = {
  left: 134.41,
  right: 173.52,
  top: 242.19,
  bottom: 250.32,
  /** Vertical rules between the label cell and good / fair / bad. */
  columnX: [134.41, 150.41, 158.2, 165.78, 173.52],
  label: { first: 'Test', second: 'rvliability' },
  labelWidths: { first: 4.49, second: 9.99 },
  labelCenter: 142.41,
  labelBaselines: [245.36, 248.32],
  labelFontSize: 2.6,
  optionBaseline: 246.97,
  optionFontSize: 2.6,
} as const

export const RELIABILITY_OPTIONS: ReadonlyArray<{ value: Reliability; width: number }> = [
  { value: 'good', width: 5.42 },
  { value: 'fair', width: 3.39 },
  { value: 'bad', width: 3.81 },
]

/** Gap between the C/O table and the detached reliability box. */
export const RELIABILITY_GAP = RELIABILITY.top - CO_TABLE.bottom

export function coCellCenter(row: SymptomRow, side: CoSide): { x: number; y: number } {
  const i = CO_SIDES.indexOf(side) + 1
  return {
    x: (CO_TABLE.columnX[i] + CO_TABLE.columnX[i + 1]) / 2,
    y: (row.top + row.bottom) / 2,
  }
}

export function reliabilityCellCenter(value: Reliability): { x: number; y: number } {
  const i = RELIABILITY_OPTIONS.findIndex(o => o.value === value) + 1
  return {
    x: (RELIABILITY.columnX[i] + RELIABILITY.columnX[i + 1]) / 2,
    y: (RELIABILITY.top + RELIABILITY.bottom) / 2,
  }
}

/** The printed word fills the middle of a reliability cell, so its tick goes underneath it. */
export const RELIABILITY_MARK_Y = 248.8
export const RELIABILITY_MARK_SCALE = 0.65

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

function chromeText(
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  italic: boolean,
) {
  return (
    <text
      x={x}
      y={y}
      textLength={width}
      lengthAdjust="spacingAndGlyphs"
      textAnchor="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize={size}
      fontWeight={700}
      fontStyle={italic ? 'italic' : undefined}
      fill={CHROME}
    >
      {text}
    </text>
  )
}

export function SymptomsChrome() {
  const t = CO_TABLE
  const r = RELIABILITY

  return (
    <g>
      <rect
        x={t.left}
        y={t.top}
        width={t.right - t.left}
        height={t.bottom - t.top}
        fill="none"
        stroke={CHROME}
        strokeWidth={BOX_RULE}
      />

      {SYMPTOM_ROWS.map(row => (
        <line
          key={`co-rule-${row.key}`}
          x1={t.left}
          x2={t.right}
          y1={row.top}
          y2={row.top}
          stroke={CHROME}
          strokeWidth={RULE}
        />
      ))}

      <line
        x1={t.columnX[1]}
        x2={t.columnX[1]}
        y1={t.top}
        y2={t.bottom}
        stroke={CHROME}
        strokeWidth={RULE}
      />
      <line
        x1={t.columnX[2]}
        x2={t.columnX[2]}
        y1={t.top}
        y2={t.rtLtRuleBottom}
        stroke={CHROME}
        strokeWidth={RULE}
      />
      <line
        x1={t.columnX[3]}
        x2={t.columnX[3]}
        y1={t.top}
        y2={t.bottom}
        stroke={CHROME}
        strokeWidth={RULE}
      />

      {CO_HEADERS.map(h =>
        <g key={`co-head-${h.text}`}>
          {chromeText(h.text, h.center, t.headerBaseline, h.width, t.headerFontSize, true)}
        </g>,
      )}

      {SYMPTOM_ROWS.map(row => (
        <text
          key={`co-label-${row.key}`}
          x={t.left + t.labelInset}
          y={row.baseline}
          textLength={row.width}
          lengthAdjust="spacingAndGlyphs"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize={t.labelFontSize}
          fontWeight={700}
          fill={CHROME}
        >
          {row.label}
        </text>
      ))}

      <rect
        x={r.left}
        y={r.top}
        width={r.right - r.left}
        height={r.bottom - r.top}
        fill="none"
        stroke={CHROME}
        strokeWidth={BOX_RULE}
      />
      {r.columnX.slice(1, 4).map(x => (
        <line
          key={`rel-rule-${x}`}
          x1={x}
          x2={x}
          y1={r.top}
          y2={r.bottom}
          stroke={CHROME}
          strokeWidth={RULE}
        />
      ))}

      {chromeText(r.label.first, r.labelCenter, r.labelBaselines[0], r.labelWidths.first, r.labelFontSize, true)}
      {chromeText(r.label.second, r.labelCenter, r.labelBaselines[1], r.labelWidths.second, r.labelFontSize, true)}

      {RELIABILITY_OPTIONS.map(o => (
        <g key={`rel-opt-${o.value}`}>
          {chromeText(
            o.value,
            reliabilityCellCenter(o.value).x,
            r.optionBaseline,
            o.width,
            r.optionFontSize,
            false,
          )}
        </g>
      ))}
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Ink
 * ------------------------------------------------------------------ */

/** Half-extent of a tick in millimetres. A tick reads about 3.4mm across. */
export const TICK_RADIUS = 1.7

const TICK_PATH =
  'M -0.95 0.02 C -0.71 0.19 -0.51 0.46 -0.29 0.81 C -0.03 0.29 0.44 -0.47 1.03 -0.88'

export function TickMark({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <path
      d={TICK_PATH}
      transform={`translate(${x} ${y}) scale(${TICK_RADIUS * scale})`}
      fill="none"
      stroke={INK}
      strokeWidth={0.38 / (TICK_RADIUS * scale)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

export interface SymptomsData {
  [key: string]: unknown
  reliability?: Reliability
}

export interface SymptomsInkProps {
  data: SymptomsData
  onChange: (data: SymptomsData) => void
  mode: PrintMode
}

function isChecked(data: SymptomsData, key: string, side: CoSide): boolean {
  const row = data[key] as Record<string, boolean> | undefined
  return Boolean(row?.[side])
}

interface CellProps {
  x: number
  y: number
  w: number
  h: number
  markX: number
  markY: number
  markScale: number
  checked: boolean
  hovered: boolean
  /** Preprinted stock hides the chrome, so hovering also has to reveal where the cell is. */
  outlineOnHover: boolean
  onEnter: () => void
  onLeave: () => void
  onClick: () => void
}

function Cell({
  x,
  y,
  w,
  h,
  markX,
  markY,
  markScale,
  checked,
  hovered,
  outlineOnHover,
  onEnter,
  onLeave,
  onClick,
}: CellProps) {
  return (
    <g>
      {checked && <TickMark x={markX} y={markY} scale={markScale} />}
      {hovered && (
        <g className="no-print">
          {outlineOnHover && (
            <rect
              x={x + 0.2}
              y={y + 0.2}
              width={w - 0.4}
              height={h - 0.4}
              fill="none"
              stroke={INK}
              strokeWidth={0.12}
              opacity={0.35}
            />
          )}
          {!checked && (
            <g opacity={0.28}>
              <TickMark x={markX} y={markY} scale={markScale} />
            </g>
          )}
        </g>
      )}
      <rect
        data-ink
        className="no-print"
        x={x}
        y={y}
        width={w}
        height={h}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onClick={onClick}
      />
    </g>
  )
}

export function SymptomsInk({ data, onChange, mode }: SymptomsInkProps) {
  const [hover, setHover] = useState<string | null>(null)
  const outlineOnHover = mode === 'preprinted'

  const toggle = (key: string, side: CoSide) => {
    const row = (data[key] as Record<string, boolean> | undefined) ?? {}
    onChange({ ...data, [key]: { ...row, [side]: !row[side] } })
  }

  return (
    <g>
      {SYMPTOM_ROWS.map(row =>
        CO_SIDES.map((side, i) => {
          const id = `${row.key}:${side}`
          const x = CO_TABLE.columnX[i + 1]
          const w = CO_TABLE.columnX[i + 2] - x
          return (
            <Cell
              key={id}
              x={x}
              y={row.top}
              w={w}
              h={row.bottom - row.top}
              markX={x + w / 2}
              markY={(row.top + row.bottom) / 2}
              markScale={1}
              checked={isChecked(data, row.key, side)}
              hovered={hover === id}
              outlineOnHover={outlineOnHover}
              onEnter={() => setHover(id)}
              onLeave={() => setHover(h => (h === id ? null : h))}
              onClick={() => toggle(row.key, side)}
            />
          )
        }),
      )}

      {RELIABILITY_OPTIONS.map((o, i) => {
        const id = `reliability:${o.value}`
        const x = RELIABILITY.columnX[i + 1]
        const w = RELIABILITY.columnX[i + 2] - x
        return (
          <Cell
            key={id}
            x={x}
            y={RELIABILITY.top}
            w={w}
            h={RELIABILITY.bottom - RELIABILITY.top}
            markX={x + w / 2}
            markY={RELIABILITY_MARK_Y}
            markScale={RELIABILITY_MARK_SCALE}
            checked={data.reliability === o.value}
            hovered={hover === id}
            outlineOnHover={outlineOnHover}
            onEnter={() => setHover(id)}
            onLeave={() => setHover(h => (h === id ? null : h))}
            onClick={() =>
              onChange({
                ...data,
                reliability: data.reliability === o.value ? undefined : o.value,
              })
            }
          />
        )
      })}
    </g>
  )
}
