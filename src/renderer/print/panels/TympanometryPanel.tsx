import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clamp, scaleTo } from '../formSpec'

/* ------------------------------------------------------------------ *
 * Geometry, measured from the 300dpi de-skewed scan (px * 25.4/300).
 * ------------------------------------------------------------------ */

const FONT = 'Arial, Helvetica, sans-serif'
const CHROME = '#4a4a3f'

/** Bordered box carrying the word TYMPANOMETRY, centred above both grids. */
export const TYMP_HEADING = { left: 81.32, right: 113.83, top: 125.98, bottom: 134.32 } as const

/** Both tympanogram grids share these horizontals. 11 rules, 10 equal rows. */
export const TYMP_GRID = { top: 134.92, bottom: 181.57, rows: 10 } as const

export const TYMP_RIGHT = { left: 23.03, right: 93.18, dy: 0, caption: 5.25 } as const
/** The left grid is printed 0.25mm above the right one; dy shifts its chrome only. */
export const TYMP_LEFT = { left: 103.59, right: 173.61, dy: -0.25, caption: 4.32 } as const

/** Baseline of the pressure labels printed under each grid. */
export const TYMP_PRESSURE_LABEL_Y = 184.4

/** Bottom of the whole band, including the pressure labels. */
export const TYMP_BAND = { top: TYMP_HEADING.top, bottom: 185.5 } as const

/**
 * The pressure axis is not linear: the -50..+50 span is drawn three columns
 * wide so the normal-pressure band can be cross-hatched. Fractions are of the
 * grid width, averaged over both grids.
 */
export const PRESSURE_AXIS: ReadonlyArray<{ daPa: number; frac: number; label: string | null }> = [
  { daPa: -450, frac: 0, label: null },
  { daPa: -400, frac: 0.0613, label: '-400' },
  { daPa: -350, frac: 0.125, label: null },
  { daPa: -300, frac: 0.187, label: '-300' },
  { daPa: -250, frac: 0.2508, label: null },
  { daPa: -200, frac: 0.3127, label: '-200' },
  { daPa: -150, frac: 0.3747, label: null },
  { daPa: -100, frac: 0.4396, label: '-100' },
  { daPa: -50, frac: 0.5028, label: '-50' },
  { daPa: 50, frac: 0.6934, label: '+50' },
  { daPa: 100, frac: 0.7562, label: '+100' },
  { daPa: 150, frac: 0.8187, label: null },
  { daPa: 200, frac: 0.8794, label: '+200' },
  { daPa: 250, frac: 0.9419, label: null },
  { daPa: 300, frac: 1, label: '+300' },
]

/** Index into PRESSURE_AXIS of the -50 and +50 rules that bound the hatch. */
export const TYMP_HATCH = { from: 8, to: 9, subColumns: 9, subRowsPerRow: 3 } as const

export const PRESSURE_MIN = PRESSURE_AXIS[0].daPa
export const PRESSURE_MAX = PRESSURE_AXIS[PRESSURE_AXIS.length - 1].daPa

/**
 * The printed ML scale does not line up with the grid rules: its 0 sits 1.2mm
 * inside the bottom rule and its 5 sits 5.9mm below the top rule. Ink has to
 * follow the printed numbers, not the rules, or plotted values would disagree
 * with the scale a reader is looking at.
 */
export const COMPLIANCE_Y = { at0: 180.26, at5: 140.84 } as const
export const COMPLIANCE_LABEL_Y: ReadonlyArray<{ ml: number; y: number }> = [
  { ml: 5, y: 140.84 },
  { ml: 4, y: 148.76 },
  { ml: 3, y: 156.25 },
  { ml: 2, y: 163.75 },
  { ml: 1, y: 172.04 },
  { ml: 0, y: 180.26 },
]

export interface EarGrid {
  left: number
  right: number
  /** Chrome-only vertical shift. Ink stays on the shared, printed ML scale. */
  dy?: number
  /** Measured width of the RT / LT caption in the merged corner cell. */
  caption?: number
}

export function pressureToX(grid: EarGrid, daPa: number): number {
  const p = clamp(daPa, PRESSURE_MIN, PRESSURE_MAX)
  let i = 0
  while (i < PRESSURE_AXIS.length - 2 && PRESSURE_AXIS[i + 1].daPa < p) i++
  const a = PRESSURE_AXIS[i]
  const b = PRESSURE_AXIS[i + 1]
  const frac = scaleTo(p, [a.daPa, b.daPa], [a.frac, b.frac])
  return grid.left + frac * (grid.right - grid.left)
}

export function xToPressure(grid: EarGrid, x: number): number {
  const frac = clamp((x - grid.left) / (grid.right - grid.left), 0, 1)
  let i = 0
  while (i < PRESSURE_AXIS.length - 2 && PRESSURE_AXIS[i + 1].frac < frac) i++
  const a = PRESSURE_AXIS[i]
  const b = PRESSURE_AXIS[i + 1]
  return scaleTo(frac, [a.frac, b.frac], [a.daPa, b.daPa])
}

export function complianceToY(ml: number): number {
  return scaleTo(ml, [0, 5], [COMPLIANCE_Y.at0, COMPLIANCE_Y.at5])
}

export function yToCompliance(y: number): number {
  return scaleTo(y, [COMPLIANCE_Y.at0, COMPLIANCE_Y.at5], [0, 5])
}

export const COMPLIANCE_MIN = yToCompliance(TYMP_GRID.bottom)
export const COMPLIANCE_MAX = yToCompliance(TYMP_GRID.top)

/* ------------------------------------------------------------------ *
 * Curve data
 * ------------------------------------------------------------------ */

/** x is pressure in daPa, y is compliance in ml. Handles use the same units. */
export interface BezierPoint {
  x: number
  y: number
  handleIn: { x: number; y: number } | null
  handleOut: { x: number; y: number } | null
}

const LEGACY = { left: 40, width: 240, top: 15, height: 120 }

function isLegacy(points: BezierPoint[]): boolean {
  return points.some(p => p.y > 6)
}

function legacyToData(p: { x: number; y: number }): { x: number; y: number } {
  return {
    x: ((p.x - LEGACY.left) / LEGACY.width) * 600 - 300,
    y: ((LEGACY.top + LEGACY.height - p.y) / LEGACY.height) * 5,
  }
}

/** Converts curves persisted in the old Konva pixel space into data units. */
export function migrateCurve(raw: string): BezierPoint[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const points = parsed as BezierPoint[]
  if (!isLegacy(points)) return points
  return points.map(p => {
    const a = legacyToData(p)
    return {
      ...a,
      handleIn: p.handleIn ? legacyToData(p.handleIn) : null,
      handleOut: p.handleOut ? legacyToData(p.handleOut) : null,
    }
  })
}

function curvePath(grid: EarGrid, points: BezierPoint[]): string {
  if (points.length < 2) return ''
  const X = (p: { x: number }) => pressureToX(grid, p.x)
  const Y = (p: { y: number }) => complianceToY(p.y)
  let d = `M ${X(points[0]).toFixed(3)} ${Y(points[0]).toFixed(3)}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    const c1 = prev.handleOut ?? prev
    const c2 = cur.handleIn ?? cur
    d += ` C ${X(c1).toFixed(3)} ${Y(c1).toFixed(3)}, ${X(c2).toFixed(3)} ${Y(c2).toFixed(3)}, ${X(cur).toFixed(3)} ${Y(cur).toFixed(3)}`
  }
  return d
}

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

const ROW_Y = Array.from({ length: TYMP_GRID.rows + 1 }, (_, i) =>
  scaleTo(i, [0, TYMP_GRID.rows], [TYMP_GRID.top, TYMP_GRID.bottom])
)

function EarGridChrome({
  grid,
  label,
  hatchId,
}: {
  grid: EarGrid
  label: string
  hatchId: string
}) {
  const w = grid.right - grid.left
  const x = (frac: number) => grid.left + frac * w
  const hatchA = x(PRESSURE_AXIS[TYMP_HATCH.from].frac)
  const hatchB = x(PRESSURE_AXIS[TYMP_HATCH.to].frac)

  // The top-left 2x2 cells are merged to hold the RT / LT caption.
  const cornerX = x(PRESSURE_AXIS[2].frac)
  const cornerY = ROW_Y[2]

  const dy = grid.dy ?? 0
  const colStep = (hatchB - hatchA) / TYMP_HATCH.subColumns
  const rowStep = (TYMP_GRID.bottom - TYMP_GRID.top) / (TYMP_GRID.rows * TYMP_HATCH.subRowsPerRow)

  return (
    <g transform={`translate(0 ${dy})`}>
      <defs>
        {/* Origin is half a cell back so tile-edge lines are not clipped in half. */}
        <pattern
          id={hatchId}
          patternUnits="userSpaceOnUse"
          x={hatchA - colStep / 2}
          y={TYMP_GRID.top - rowStep / 2}
          width={colStep}
          height={rowStep}
        >
          <path
            d={`M ${colStep / 2} 0 V ${rowStep} M 0 ${rowStep / 2} H ${colStep}`}
            stroke={CHROME}
            strokeWidth={0.15}
            fill="none"
          />
        </pattern>
      </defs>

      <rect
        x={hatchA}
        y={TYMP_GRID.top}
        width={hatchB - hatchA}
        height={TYMP_GRID.bottom - TYMP_GRID.top}
        fill={`url(#${hatchId})`}
        stroke="none"
      />

      <rect
        x={grid.left}
        y={TYMP_GRID.top}
        width={w}
        height={TYMP_GRID.bottom - TYMP_GRID.top}
        fill="none"
        stroke={CHROME}
        strokeWidth={0.5}
      />

      {PRESSURE_AXIS.map((a, i) => {
        if (i === 0 || i === PRESSURE_AXIS.length - 1) return null
        const px = x(a.frac)
        const top = i === 1 ? cornerY : TYMP_GRID.top
        return (
          <line
            key={`v${a.daPa}`}
            x1={px}
            y1={top}
            x2={px}
            y2={TYMP_GRID.bottom}
            stroke={CHROME}
            strokeWidth={0.25}
          />
        )
      })}

      {ROW_Y.map((y, i) => {
        if (i === 0 || i === TYMP_GRID.rows) return null
        const left = i === 1 ? cornerX : grid.left
        return (
          <line
            key={`h${i}`}
            x1={left}
            y1={y}
            x2={grid.right}
            y2={y}
            stroke={CHROME}
            strokeWidth={0.25}
          />
        )
      })}

      <text
        x={(grid.left + cornerX) / 2}
        y={(TYMP_GRID.top + cornerY) / 2 + 1.44}
        textAnchor="middle"
        fontFamily={FONT}
        fontSize={4}
        fontWeight="bold"
        fill={CHROME}
        textLength={grid.caption ?? 5.25}
        lengthAdjust="spacingAndGlyphs"
      >
        {label}
      </text>

      {PRESSURE_AXIS.map(a =>
        a.label === null ? null : (
          <text
            key={`p${a.daPa}`}
            x={x(a.frac)}
            y={TYMP_PRESSURE_LABEL_Y}
            textAnchor="middle"
            fontFamily={FONT}
            fontSize={1.4}
            fontWeight="bold"
            fill={CHROME}
          >
            {a.label}
          </text>
        )
      )}
    </g>
  )
}

export function TympanometryChrome() {
  return (
    <g className="tymp-chrome">
      <rect
        x={TYMP_HEADING.left}
        y={TYMP_HEADING.top}
        width={TYMP_HEADING.right - TYMP_HEADING.left}
        height={TYMP_HEADING.bottom - TYMP_HEADING.top}
        fill="none"
        stroke={CHROME}
        strokeWidth={0.5}
      />
      <text
        x={97.92}
        y={131.66}
        textAnchor="middle"
        fontFamily={FONT}
        fontSize={3.8}
        fontWeight="bold"
        fill={CHROME}
        textLength={28.03}
        lengthAdjust="spacingAndGlyphs"
      >
        TYMPANOMETRY
      </text>

      <EarGridChrome grid={TYMP_RIGHT} label="RT" hatchId="tymp-hatch-rt" />
      <EarGridChrome grid={TYMP_LEFT} label="LT" hatchId="tymp-hatch-lt" />

      <g fontFamily={FONT} fontSize={2.3} fontWeight="bold" fill={CHROME}>
        <text x={95.67} y={137.33} textLength={2.71} lengthAdjust="spacingAndGlyphs">
          ML
        </text>
        <text x={99.06} y={137.33} textLength={2.71} lengthAdjust="spacingAndGlyphs">
          ML
        </text>
        {COMPLIANCE_LABEL_Y.map(({ ml, y }) => (
          <text key={`ml${ml}`} x={96.31} y={y + 0.8} textAnchor="middle">
            {ml}
          </text>
        ))}
        {COMPLIANCE_LABEL_Y.map(({ ml, y }) => (
          <text key={`ml2${ml}`} x={99.14} y={y + 0.8}>
            {ml / 2}
          </text>
        ))}
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Ink
 * ------------------------------------------------------------------ */

export type TympanometryMode = 'edit' | 'print'

export interface TympanometryInkProps {
  right: string
  left: string
  onRightChange: (data: string) => void
  onLeftChange: (data: string) => void
  mode: TympanometryMode
}

type Ear = 'right' | 'left'
type DragKind = 'anchor' | 'in' | 'out'

interface Selection {
  ear: Ear
  index: number
}

const EAR_GRID: Record<Ear, EarGrid> = { right: TYMP_RIGHT, left: TYMP_LEFT }
const EAR_COLOUR: Record<Ear, string> = { right: '#EF4444', left: '#3B82F6' }

/** Default handle reach either side of a freshly placed anchor, in daPa. */
const HANDLE_REACH = 25

export function TympanometryInk({
  right,
  left,
  onRightChange,
  onLeftChange,
  mode,
}: TympanometryInkProps) {
  const rootRef = useRef<SVGGElement | null>(null)
  const [selected, setSelected] = useState<Selection | null>(null)
  const dragRef = useRef<{ ear: Ear; index: number; kind: DragKind } | null>(null)

  const curves = useMemo(
    () => ({ right: migrateCurve(right), left: migrateCurve(left) }),
    [right, left]
  )
  const emit = useCallback(
    (ear: Ear, points: BezierPoint[]) => {
      const json = points.length ? JSON.stringify(points) : ''
      if (ear === 'right') onRightChange(json)
      else onLeftChange(json)
    },
    [onRightChange, onLeftChange]
  )

  useEffect(() => {
    const clear = () => setSelected(null)
    window.addEventListener('beforeprint', clear)
    return () => window.removeEventListener('beforeprint', clear)
  }, [])

  useEffect(() => {
    if (mode === 'print') setSelected(null)
  }, [mode])

  const toSheet = useCallback((evt: { clientX: number; clientY: number }) => {
    const svg = rootRef.current?.ownerSVGElement
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = evt.clientX
    pt.y = evt.clientY
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  const addPoint = useCallback(
    (ear: Ear, evt: React.PointerEvent) => {
      if (mode === 'print') return
      const at = toSheet(evt)
      if (!at) return
      const grid = EAR_GRID[ear]
      if (at.x < grid.left || at.x > grid.right) return
      if (at.y < TYMP_GRID.top || at.y > TYMP_GRID.bottom) return

      const x = xToPressure(grid, at.x)
      const y = clamp(yToCompliance(at.y), COMPLIANCE_MIN, COMPLIANCE_MAX)
      const point: BezierPoint = {
        x,
        y,
        handleIn: { x: x - HANDLE_REACH, y },
        handleOut: { x: x + HANDLE_REACH, y },
      }
      const next = [...curves[ear], point].sort((a, b) => a.x - b.x)
      emit(ear, next)
      setSelected({ ear, index: next.indexOf(point) })
    },
    [curves, emit, mode, toSheet]
  )

  useEffect(() => {
    if (mode === 'print') return

    const move = (evt: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const at = toSheet(evt)
      if (!at) return
      const grid = EAR_GRID[drag.ear]
      const points = curves[drag.ear].map(p => ({
        ...p,
        handleIn: p.handleIn ? { ...p.handleIn } : null,
        handleOut: p.handleOut ? { ...p.handleOut } : null,
      }))
      const point = points[drag.index]
      if (!point) return

      const px = xToPressure(grid, at.x)
      const py = yToCompliance(at.y)

      if (drag.kind === 'anchor') {
        const nx = clamp(px, PRESSURE_MIN, PRESSURE_MAX)
        const ny = clamp(py, COMPLIANCE_MIN, COMPLIANCE_MAX)
        const dx = nx - point.x
        const dy = ny - point.y
        point.x = nx
        point.y = ny
        if (point.handleIn) {
          point.handleIn.x += dx
          point.handleIn.y += dy
        }
        if (point.handleOut) {
          point.handleOut.x += dx
          point.handleOut.y += dy
        }
      } else {
        const near = drag.kind === 'in' ? point.handleIn : point.handleOut
        const far = drag.kind === 'in' ? point.handleOut : point.handleIn
        if (!near) return
        near.x = px
        near.y = py
        if (far && !evt.shiftKey) {
          far.x = point.x + (point.x - px)
          far.y = point.y + (point.y - py)
        }
      }

      emit(drag.ear, points)
    }

    const up = () => {
      dragRef.current = null
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [curves, emit, mode, toSheet])

  useEffect(() => {
    if (mode === 'print' || !selected) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      e.preventDefault()
      emit(
        selected.ear,
        curves[selected.ear].filter((_, i) => i !== selected.index)
      )
      setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [curves, emit, mode, selected])

  const startDrag = (ear: Ear, index: number, kind: DragKind) => (e: React.PointerEvent) => {
    if (mode === 'print') return
    e.stopPropagation()
    dragRef.current = { ear, index, kind }
    setSelected({ ear, index })
  }

  const renderEar = (ear: Ear) => {
    const grid = EAR_GRID[ear]
    const points = curves[ear]
    const colour = EAR_COLOUR[ear]
    const active = mode === 'edit' && selected?.ear === ear ? points[selected.index] : null
    const X = (p: { x: number }) => pressureToX(grid, p.x)
    const Y = (p: { y: number }) => complianceToY(p.y)

    return (
      <g key={ear} data-ink={`tympanogram-${ear}`}>
        {mode === 'edit' && (
          <rect
            className="no-print"
            x={grid.left}
            y={TYMP_GRID.top}
            width={grid.right - grid.left}
            height={TYMP_GRID.bottom - TYMP_GRID.top}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onPointerDown={e => addPoint(ear, e)}
          />
        )}

        <path
          d={curvePath(grid, points)}
          fill="none"
          stroke={colour}
          strokeWidth={0.45}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {active && (
          <g className="no-print">
            {(['in', 'out'] as const).map(kind => {
              const handle = kind === 'in' ? active.handleIn : active.handleOut
              if (!handle) return null
              return (
                <g key={kind}>
                  <line
                    x1={X(active)}
                    y1={Y(active)}
                    x2={X(handle)}
                    y2={Y(handle)}
                    stroke="#3B82F6"
                    strokeWidth={0.2}
                    strokeDasharray="0.8 0.8"
                  />
                  <circle
                    cx={X(handle)}
                    cy={Y(handle)}
                    r={1}
                    fill="#3B82F6"
                    stroke="#fff"
                    strokeWidth={0.25}
                    style={{ cursor: 'grab' }}
                    onPointerDown={startDrag(ear, selected!.index, kind)}
                  />
                </g>
              )
            })}
          </g>
        )}

        {points.map((p, i) => {
          const isSelected = mode === 'edit' && selected?.ear === ear && selected.index === i
          return (
            <circle
              key={i}
              cx={X(p)}
              cy={Y(p)}
              r={mode === 'print' ? 0.6 : isSelected ? 1.2 : 0.8}
              fill={isSelected ? '#3B82F6' : colour}
              stroke={mode === 'print' ? 'none' : '#fff'}
              strokeWidth={0.25}
              style={mode === 'edit' ? { cursor: 'grab' } : undefined}
              onPointerDown={mode === 'edit' ? startDrag(ear, i, 'anchor') : undefined}
            />
          )
        })}
      </g>
    )
  }

  return (
    <g ref={rootRef} className="tymp-ink">
      {renderEar('right')}
      {renderEar('left')}
    </g>
  )
}
