import type { CSSProperties } from 'react'
import { FRAME, type PrintMode } from '../formSpec'

/**
 * Bottom of the sheet: the TYMPANOMETRY / AUDIOMETRY dotted leader lines, the
 * blank continuation line beneath them, and the clinic footer below the frame.
 *
 * Every millimetre here comes from the de-skewed 300dpi scan. The three leader
 * rules are 63 scan pixels apart, which is 5.334mm, and that pitch is what the
 * fields' line-height is built from so wrapped text lands on the rules.
 */

const CHROME = '#4a4a3f'

/** Text column inside the frame, measured as an inset from the frame's rules. */
const LABEL_LEFT = FRAME.left + 6.18
/** Dots stop well short of the frame's right rule. */
const DOTS_RIGHT = FRAME.right - 11.31
/** Gap from the label's left edge to where its dots begin. Third rule carries no label. */
const LABEL_ADVANCE = [24.63, 19.72, 0]

export const LEADER = {
  /** Rule the TYMPANOMETRY answer is written on. */
  firstY: 261.75,
  /** 63 scan px at 300dpi. Rules sit at firstY, firstY + pitch, firstY + 2*pitch. */
  pitch: 5.334,
  count: 3,
  right: DOTS_RIGHT,
  labelLeft: LABEL_LEFT,
  labelBaselineDrop: 0.15,
  labelFontSize: 2.95,
  /** Where the dots begin on each rule, after the printed label. */
  dotsLeft: LABEL_ADVANCE.map(a => LABEL_LEFT + a),
  /** Measured dot pitch 0.558mm: 0.35mm of ink, 0.21mm of paper. */
  dash: [0.35, 0.21] as const,
  dotThickness: 0.34,
} as const

export const LEADER_Y = Array.from({ length: LEADER.count }, (_, i) => LEADER.firstY + i * LEADER.pitch)

export const NOTES_LABELS = [
  { text: 'TYMPANOMETRY :', width: 23.7 },
  { text: 'AUDIOMETRY :', width: 18.97 },
] as const

export const FOOTER = {
  arabic: 'الحدائق - مجمع نادي خالد بن الوليد - الدور الأول - مقابل مستشفى الصفوة وصيدلية شلوف',
  arabicBaseline: 283.72,
  arabicCenter: 98.68,
  arabicWidth: 94.4,
  arabicFontSize: 3.2,
  phones: '091 657 7507 - 091 921 6936',
  phoneBaseline: 288.33,
  phoneCenter: 96.18,
  phoneWidth: 42.16,
  phoneFontSize: 3.35,
  glyph: { x: 118.62, y: 285.24, w: 3.64, h: 3.47 },
} as const

/* ------------------------------------------------------------------ *
 * Ink metrics
 * ------------------------------------------------------------------ */

/** Arial hhea ascent/descent as a fraction of em, which is how browsers build a line box. */
const ARIAL_ASCENT = 0.9052
const ARIAL_DESCENT = 0.2119

export const INK_FONT_SIZE = 3.2
/** The whole point of this panel: one text line per printed rule. */
export const INK_LINE_HEIGHT = LEADER.pitch
/** Handwriting rides just above the rule rather than through the dots. */
export const INK_BASELINE_LIFT = 0.25

/** Distance from the top of a line box down to its baseline. */
function baselineOffset(fontSize: number, lineHeight: number): number {
  return (lineHeight - (ARIAL_ASCENT + ARIAL_DESCENT) * fontSize) / 2 + ARIAL_ASCENT * fontSize
}

const INK_BASELINE_OFFSET = baselineOffset(INK_FONT_SIZE, INK_LINE_HEIGHT)

/** Top edge of a field whose first text line must sit on the rule at `ruleY`. */
export function inkTopForRule(ruleY: number): number {
  return ruleY - INK_BASELINE_LIFT - INK_BASELINE_OFFSET
}

export const NOTES_FIELDS = {
  tympanometry: {
    left: LEADER.dotsLeft[0] + 0.6,
    top: inkTopForRule(LEADER_Y[0]),
    width: LEADER.right - LEADER.dotsLeft[0] - 0.6,
    height: INK_LINE_HEIGHT,
    rows: 1,
  },
  audiometry: {
    left: LEADER.dotsLeft[2] + 0.6,
    top: inkTopForRule(LEADER_Y[1]),
    width: LEADER.right - LEADER.dotsLeft[2] - 0.6,
    height: INK_LINE_HEIGHT * 2,
    rows: 2,
    /** First line starts after the AUDIOMETRY label; the wrap line runs full width. */
    indent: LEADER.dotsLeft[1] - LEADER.dotsLeft[2],
  },
} as const

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

function PhoneGlyph(): React.JSX.Element {
  const { x, y, w, h } = FOOTER.glyph
  return (
    <g transform={`translate(${x} ${y}) scale(${w / 100} ${h / 100})`}>
      <path
        d="M22 22 A 58 58 0 0 0 80 80"
        fill="none"
        stroke={CHROME}
        strokeWidth={27}
        strokeLinecap="round"
      />
      <path d="M27 55 A 48 48 0 0 1 73 78" fill="none" stroke={CHROME} strokeWidth={8} />
      <path d="M42 33 A 62 62 0 0 1 89 76" fill="none" stroke={CHROME} strokeWidth={8} />
      <path d="M55 12 A 78 78 0 0 1 99 72" fill="none" stroke={CHROME} strokeWidth={8} />
    </g>
  )
}

export function NotesChrome(): React.JSX.Element {
  return (
    <g className="notes-panel-chrome">
      {LEADER_Y.map((y, i) => (
        <line
          key={y}
          x1={LEADER.dotsLeft[i]}
          x2={LEADER.right}
          y1={y}
          y2={y}
          stroke={CHROME}
          strokeWidth={LEADER.dotThickness}
          strokeLinecap="butt"
          strokeDasharray={LEADER.dash.join(' ')}
        />
      ))}

      {NOTES_LABELS.map((label, i) => (
        <text
          key={label.text}
          x={LEADER.labelLeft}
          y={LEADER_Y[i] + LEADER.labelBaselineDrop}
          textLength={label.width}
          lengthAdjust="spacingAndGlyphs"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize={LEADER.labelFontSize}
          fontWeight={700}
          fill={CHROME}
        >
          {label.text}
        </text>
      ))}

      <text
        x={FOOTER.arabicCenter}
        y={FOOTER.arabicBaseline}
        textLength={FOOTER.arabicWidth}
        lengthAdjust="spacingAndGlyphs"
        textAnchor="middle"
        direction="rtl"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize={FOOTER.arabicFontSize}
        fontWeight={700}
        fill={CHROME}
      >
        {FOOTER.arabic}
      </text>

      <text
        x={FOOTER.phoneCenter}
        y={FOOTER.phoneBaseline}
        textLength={FOOTER.phoneWidth}
        lengthAdjust="spacingAndGlyphs"
        textAnchor="middle"
        direction="ltr"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize={FOOTER.phoneFontSize}
        fontWeight={700}
        fill={CHROME}
      >
        {FOOTER.phones}
      </text>

      <PhoneGlyph />
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Fields
 * ------------------------------------------------------------------ */

export interface NotesFieldsProps {
  tympanometryNotes: string
  audiometryNotes: string
  onChange: (field: 'tympanometryNotes' | 'audiometryNotes', value: string) => void
  mode: PrintMode
}

function fieldStyle(
  box: { left: number; top: number; width: number; height: number },
  mode: PrintMode,
  indent = 0
): CSSProperties {
  return {
    position: 'absolute',
    left: `${box.left}mm`,
    top: `${box.top}mm`,
    width: `${box.width}mm`,
    height: `${box.height}mm`,
    fontSize: `${INK_FONT_SIZE}mm`,
    lineHeight: `${INK_LINE_HEIGHT}mm`,
    textIndent: indent ? `${indent}mm` : undefined,
    overflow: 'hidden',
    resize: 'none',
    whiteSpace: 'pre-wrap',
    outline: mode === 'preprinted' ? '0.2mm dashed rgba(100, 116, 139, 0.35)' : 'none',
  }
}

export function NotesFields({
  tympanometryNotes,
  audiometryNotes,
  onChange,
  mode,
}: NotesFieldsProps): React.JSX.Element {
  const t = NOTES_FIELDS.tympanometry
  const a = NOTES_FIELDS.audiometry
  return (
    <>
      <textarea
        data-ink
        aria-label="Tympanometry notes"
        rows={t.rows}
        value={tympanometryNotes}
        onChange={e => onChange('tympanometryNotes', e.target.value)}
        style={fieldStyle(t, mode)}
      />
      <textarea
        data-ink
        aria-label="Audiometry notes"
        rows={a.rows}
        value={audiometryNotes}
        onChange={e => onChange('audiometryNotes', e.target.value)}
        style={fieldStyle(a, mode, a.indent)}
      />
    </>
  )
}
