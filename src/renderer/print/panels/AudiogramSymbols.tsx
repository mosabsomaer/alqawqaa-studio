import type { SymbolType } from '../../components/AudiometryToolbar'

/** Half-extent in millimetres. A symbol reads ~3.2mm across, matching the cell scale. */
export const SYMBOL_RADIUS = 1.6

const STROKE = 0.35

/** The Konva original was drawn against a half-extent of 6px; ported offsets scale by this. */
const K = SYMBOL_RADIUS / 6

export const SYMBOL_COLORS = {
  right: '#EF4444',
  left: '#3B82F6',
  aided: '#10B981',
  soundField: '#F59E0B',
} as const

export function symbolColor(symbolType: SymbolType): string {
  if (symbolType === 'aided') return SYMBOL_COLORS.aided
  if (symbolType === 'sound-field') return SYMBOL_COLORS.soundField
  if (symbolType.includes('right')) return SYMBOL_COLORS.right
  if (symbolType.includes('left')) return SYMBOL_COLORS.left
  return '#000000'
}

/** Vertical reach below the centre, so the selection ring can clear a no-response arrow. */
export function symbolExtent(symbolType: SymbolType): number {
  return symbolType === 'nr-right' || symbolType === 'nr-left'
    ? SYMBOL_RADIUS + 10 * K
    : SYMBOL_RADIUS
}

interface SymbolShapeProps {
  symbolType: SymbolType
  color?: string
}

const S = SYMBOL_RADIUS

function noResponseArrow(color: string) {
  return (
    <>
      <line x1={0} y1={S + 2 * K} x2={0} y2={S + 10 * K} stroke={color} strokeWidth={STROKE} />
      <polyline
        points={`${-3 * K},${S + 7 * K} 0,${S + 10 * K} ${3 * K},${S + 7 * K}`}
        stroke={color}
        strokeWidth={STROKE}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  )
}

/** The 12 audiometric marks, centred on (0,0) and drawn in millimetres. */
export default function SymbolShape({ symbolType, color }: SymbolShapeProps) {
  const c = color ?? symbolColor(symbolType)
  const common = { stroke: c, strokeWidth: STROKE, fill: 'none' as const }

  switch (symbolType) {
    case 'ac-right-unmasked':
      return <circle cx={0} cy={0} r={S} {...common} />

    case 'ac-right-masked':
      return <polygon points={`0,${-S} ${-S},${S} ${S},${S}`} {...common} strokeLinejoin="round" />

    case 'ac-left-unmasked':
      return (
        <>
          <line x1={-S} y1={-S} x2={S} y2={S} {...common} />
          <line x1={-S} y1={S} x2={S} y2={-S} {...common} />
        </>
      )

    case 'ac-left-masked':
      return <rect x={-S} y={-S} width={S * 2} height={S * 2} {...common} />

    case 'bc-right-unmasked':
      return <polyline points={`${S},${-S} ${-S},0 ${S},${S}`} {...common} strokeLinejoin="round" />

    case 'bc-right-masked':
      return (
        <polyline
          points={`${-S + 4 * K},${-S} ${-S},${-S} ${-S},${S} ${-S + 4 * K},${S}`}
          {...common}
          strokeLinejoin="miter"
        />
      )

    case 'bc-left-unmasked':
      return <polyline points={`${-S},${-S} ${S},0 ${-S},${S}`} {...common} strokeLinejoin="round" />

    case 'bc-left-masked':
      return (
        <polyline
          points={`${S - 4 * K},${-S} ${S},${-S} ${S},${S} ${S - 4 * K},${S}`}
          {...common}
          strokeLinejoin="miter"
        />
      )

    case 'nr-right':
      return (
        <>
          <circle cx={0} cy={0} r={S} {...common} />
          {noResponseArrow(c)}
        </>
      )

    case 'nr-left':
      return (
        <>
          <line x1={-S} y1={-S} x2={S} y2={S} {...common} />
          <line x1={-S} y1={S} x2={S} y2={-S} {...common} />
          {noResponseArrow(c)}
        </>
      )

    case 'aided':
    case 'sound-field':
      return (
        <text
          x={0}
          y={0}
          fill={c}
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize={4.2}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {symbolType === 'aided' ? 'A' : 'S'}
        </text>
      )

    default:
      return null
  }
}
