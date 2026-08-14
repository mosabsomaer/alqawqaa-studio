import { useEffect, useRef, useState, type CSSProperties } from 'react'
import clinicLogo from '../../../../resources/clinic-logo.png'
import { FRAME, SIDE_COLUMN, type PrintMode } from '../formSpec'

/**
 * Top of the sheet plus the right margin: the outer frame, the side-column rule,
 * the clinic logo, the Phonak agency banner, the patient / age / date / doctor /
 * referral fields with their dotted rules, the ID field, and the two rotated
 * notices down the right-hand side.
 *
 * Every millimetre comes from the de-skewed 300dpi scan (2479x3507, mm = px *
 * 25.4 / 300). Two things the scan settles that the spec's names suggest
 * otherwise:
 *
 * - The frame reads as a *double* border at a glance, but at 300dpi it is one
 *   solid band 13px (1.05mm) thick with no paper between: x300..600 is dark for
 *   y360..373 and empty either side. `FRAME_STROKE` carries that band's per-side
 *   thickness and `FRAME.*` are its centre lines, so it is drawn as one rule.
 * - The big rotated Arabic notice sits *outside* `FRAME.right` in the paper
 *   margin (ink x 187.37..194.31mm), not inside the side column. Only the
 *   English notice lives between `SIDE_COLUMN.left` and `FRAME.right`.
 */

const CHROME = '#4a4a3f'

const FONT = 'Arial, Helvetica, sans-serif'

/**
 * Thickness of the frame band, per side. `FRAME.*` stay the band's centre lines,
 * which is what every other panel reads out of `formSpec.ts`, so only how far
 * the ink bleeds either side changes here.
 *
 * The sides are not equal: at a 60% coverage threshold the scan gives 0.59mm
 * for both verticals but 0.93mm on top and 1.02mm on the bottom, so the frame
 * is four lines rather than one stroked rect.
 */
export const FRAME_STROKE = { left: 0.59, right: 0.59, top: 0.93, bottom: 1.02 } as const

/**
 * The rule down the right margin is not one line: it breaks where the form's
 * sections meet. Segments are the measured ink runs at x = SIDE_COLUMN.left.
 */
export const SIDE_RULE_SEGMENTS: ReadonlyArray<readonly [number, number]> = [
  [39.96, 124.63],
  [134.62, 181.19],
  [189.31, 237.91],
  [242.99, 250.44],
]

export const SIDE_RULE_STROKE = 0.25

/**
 * The pre-printed logo is the same artwork as `resources/clinic-logo.png`, so it
 * is placed as an image rather than redrawn. The box is the PNG's full canvas
 * scaled so its ink lands on the scan's ink: the scan's logo ink runs
 * x 19.90..67.99mm, y 6.86..29.46mm (ratio 2.1234) and the PNG's ink occupies
 * x 27..680, y 37..344 of its 702x356 canvas (ratio 2.1234).
 */
export const LOGO = { x: 17.91, y: 4.13, w: 51.72, h: 26.23 } as const

/* ------------------------------------------------------------------ *
 * Printed rules
 * ------------------------------------------------------------------ */

/** Measured dot pitch 0.48mm: 0.17mm of ink, 0.31mm of paper. */
export const DOT_RULE = { thickness: 0.34, dash: [0.17, 0.31] as const }

export const HEADER_RULES = {
  /** الاسم, row 1, right of التاريخ. */
  name: { y: 14.1, left: 139.02, right: 178.3 },
  /** الطبيب الفاحص, row 2, right half. */
  doctor: { y: 18.94, left: 138.85, right: 166.62 },
  /** محولة من, row 2, left half, running back to the logo. */
  referredFrom: { y: 19.07, left: 79.25, right: 125.56 },
} as const

/* ------------------------------------------------------------------ *
 * Printed text
 * ------------------------------------------------------------------ */

/** Baseline of each header row, measured from the digits of the date skeleton. */
export const ROW_BASELINE = { one: 14.4, two: 19.4 } as const

const LABEL_FONT_SIZE = 3.8

/**
 * Arabic labels, centred with an explicit `textLength` so they occupy exactly
 * the span the printed ones do whatever font the machine actually resolves.
 * `center`/`width` are the measured ink bounds including the trailing colon.
 */
export const HEADER_LABELS = [
  { key: 'name', text: 'الاسم :', center: 182.29, width: 6.6, baseline: ROW_BASELINE.one },
  { key: 'age', text: 'العمر :', center: 134.54, width: 6.77, baseline: ROW_BASELINE.one },
  { key: 'date', text: 'التاريخ :', center: 107.83, width: 9.57, baseline: ROW_BASELINE.one },
  {
    key: 'doctor',
    text: 'الطبيب الفاحص :',
    center: 176.45,
    width: 18.11,
    baseline: ROW_BASELINE.two,
  },
  {
    key: 'referredFrom',
    text: 'محولة من :',
    center: 132.0,
    width: 11.35,
    baseline: ROW_BASELINE.two,
  },
] as const

/** The printed date skeleton: a literal "20" and two slashes. */
export const DATE_SKELETON = {
  century: { center: 81.15, width: 3.98, baseline: 14.48, fontSize: 4.02 },
  slashes: [96.78, 88.44],
  slashBaseline: 14.65,
  slashFontSize: 3.95,
} as const

export const BANNER = {
  text: 'وكيل فوناك السويسرية',
  center: 101.09,
  width: 53.0,
  baseline: 29.77,
  /**
   * Chrome ignores `textLength` on this run, so the width is set by the font
   * size: 4.7 rendered 56.65mm of ink against the scan's 53.0mm.
   */
  fontSize: 4.4,
} as const

export const ID_LABEL = {
  text: 'ID:',
  center: 167.14,
  width: 4.57,
  baseline: 29.13,
  fontSize: 4.37,
} as const

/**
 * The two rotated notices. Both read bottom-to-top, so both are `rotate(-90)`;
 * `x` is the baseline's page column and `y` the mid-point of the run, which is
 * what `text-anchor: middle` needs to land both ends without depending on how
 * the renderer resolves bidi.
 */
export const SIDE_NOTES = {
  english: {
    text: 'L.symbols Adapted from American Speech - Language - Hearing Association (1990)',
    x: 180.3,
    y: 181.19,
    length: 113.03,
    fontSize: 2.62,
  },
  arabic: {
    text: 'القوقعة لعلاج أمراض السمع',
    /**
     * Rotated -90, so `x` is the baseline column and the ink runs from
     * x - ascender to x + descender: 187.37..194.31mm on the scan.
     */
    x: 192.79,
    y: 149.14,
    length: 82.88,
    fontSize: 7.23,
  },
} as const

/* ------------------------------------------------------------------ *
 * Ink metrics
 * ------------------------------------------------------------------ */

/** Arial hhea ascent/descent as a fraction of em, which is how browsers build a line box. */
const ARIAL_ASCENT = 0.9052
const ARIAL_DESCENT = 0.2119

export const INK_FONT_SIZE = 3.2
const INK_LINE_HEIGHT = 4.4
/** Handwriting rides just above the rule rather than through the dots. */
const INK_BASELINE_LIFT = 0.25

function baselineOffset(fontSize: number, lineHeight: number): number {
  return (lineHeight - (ARIAL_ASCENT + ARIAL_DESCENT) * fontSize) / 2 + ARIAL_ASCENT * fontSize
}

/** Top edge of a field whose text line must sit on the rule at `ruleY`. */
export function inkTopForRule(ruleY: number): number {
  return ruleY - INK_BASELINE_LIFT - baselineOffset(INK_FONT_SIZE, INK_LINE_HEIGHT)
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

function onRule(rule: { y: number; left: number; right: number }): Box {
  return {
    left: rule.left + 0.6,
    top: inkTopForRule(rule.y),
    width: rule.right - rule.left - 1.2,
    height: INK_LINE_HEIGHT,
  }
}

/**
 * Where the doctor writes. The date is three slots cut out of the printed
 * "20 __ / __ / __" skeleton, right-to-left: day, month, then the two digits
 * that finish the year.
 */
export const HEADER_FIELDS = {
  name: onRule(HEADER_RULES.name),
  /** No printed rule between التاريخ and العمر, just the gap between them. */
  age: { left: 113.5, top: inkTopForRule(HEADER_RULES.name.y), width: 17.0, height: INK_LINE_HEIGHT },
  dateDay: { left: 97.2, top: inkTopForRule(HEADER_RULES.name.y), width: 5.4, height: INK_LINE_HEIGHT },
  dateMonth: { left: 89.1, top: inkTopForRule(HEADER_RULES.name.y), width: 6.9, height: INK_LINE_HEIGHT },
  dateYear: { left: 83.7, top: inkTopForRule(HEADER_RULES.name.y), width: 4.0, height: INK_LINE_HEIGHT },
  doctor: onRule(HEADER_RULES.doctor),
  referredFrom: onRule(HEADER_RULES.referredFrom),
  patientId: { left: 170.0, top: inkTopForRule(29.13), width: 14.0, height: INK_LINE_HEIGHT },
} as const

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

function DotRule({ y, left, right }: { y: number; left: number; right: number }) {
  return (
    <line
      x1={left}
      x2={right}
      y1={y}
      y2={y}
      stroke={CHROME}
      strokeWidth={DOT_RULE.thickness}
      strokeLinecap="butt"
      strokeDasharray={DOT_RULE.dash.join(' ')}
    />
  )
}

function Label({
  text,
  center,
  width,
  baseline,
  fontSize = LABEL_FONT_SIZE,
  rtl = true,
}: {
  text: string
  center: number
  width: number
  baseline: number
  fontSize?: number
  rtl?: boolean
}) {
  return (
    <text
      x={center}
      y={baseline}
      textLength={width}
      lengthAdjust="spacingAndGlyphs"
      textAnchor="middle"
      direction={rtl ? 'rtl' : 'ltr'}
      fontFamily={FONT}
      fontSize={fontSize}
      fontWeight={700}
      fill={CHROME}
    >
      {text}
    </text>
  )
}


export function HeaderChrome(): React.JSX.Element {
  return (
    <g className="header-panel-chrome">
      {/* Outer frame: one solid band per side, not two rules (see the note above). */}
      <line
        x1={FRAME.left}
        x2={FRAME.left}
        y1={FRAME.top}
        y2={FRAME.bottom}
        stroke={CHROME}
        strokeWidth={FRAME_STROKE.left}
      />
      <line
        x1={FRAME.right}
        x2={FRAME.right}
        y1={FRAME.top}
        y2={FRAME.bottom}
        stroke={CHROME}
        strokeWidth={FRAME_STROKE.right}
      />
      {/* Horizontals overhang by half a vertical's width so the corners close. */}
      <line
        x1={FRAME.left - FRAME_STROKE.left / 2}
        x2={FRAME.right + FRAME_STROKE.right / 2}
        y1={FRAME.top}
        y2={FRAME.top}
        stroke={CHROME}
        strokeWidth={FRAME_STROKE.top}
      />
      <line
        x1={FRAME.left - FRAME_STROKE.left / 2}
        x2={FRAME.right + FRAME_STROKE.right / 2}
        y1={FRAME.bottom}
        y2={FRAME.bottom}
        stroke={CHROME}
        strokeWidth={FRAME_STROKE.bottom}
      />

      {SIDE_RULE_SEGMENTS.map(([y1, y2]) => (
        <line
          key={y1}
          x1={SIDE_COLUMN.left}
          x2={SIDE_COLUMN.left}
          y1={y1}
          y2={y2}
          stroke={CHROME}
          strokeWidth={SIDE_RULE_STROKE}
        />
      ))}

      <image
        href={clinicLogo}
        x={LOGO.x}
        y={LOGO.y}
        width={LOGO.w}
        height={LOGO.h}
        preserveAspectRatio="none"
      />

      <DotRule {...HEADER_RULES.name} />
      <DotRule {...HEADER_RULES.doctor} />
      <DotRule {...HEADER_RULES.referredFrom} />

      {HEADER_LABELS.map(l => (
        <Label
          key={l.key}
          text={l.text}
          center={l.center}
          width={l.width}
          baseline={l.baseline}
        />
      ))}

      <Label
        text="20"
        center={DATE_SKELETON.century.center}
        width={DATE_SKELETON.century.width}
        baseline={DATE_SKELETON.century.baseline}
        fontSize={DATE_SKELETON.century.fontSize}
        rtl={false}
      />
      {DATE_SKELETON.slashes.map(x => (
        <text
          key={x}
          x={x}
          y={DATE_SKELETON.slashBaseline}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={DATE_SKELETON.slashFontSize}
          fontWeight={700}
          fill={CHROME}
        >
          /
        </text>
      ))}

      <Label
        text={BANNER.text}
        center={BANNER.center}
        width={BANNER.width}
        baseline={BANNER.baseline}
        fontSize={BANNER.fontSize}
      />

      <Label
        text={ID_LABEL.text}
        center={ID_LABEL.center}
        width={ID_LABEL.width}
        baseline={ID_LABEL.baseline}
        fontSize={ID_LABEL.fontSize}
        rtl={false}
      />

      <text
        x={SIDE_NOTES.english.x}
        y={SIDE_NOTES.english.y}
        transform={`rotate(-90 ${SIDE_NOTES.english.x} ${SIDE_NOTES.english.y})`}
        textLength={SIDE_NOTES.english.length}
        lengthAdjust="spacingAndGlyphs"
        textAnchor="middle"
        direction="ltr"
        fontFamily={FONT}
        fontSize={SIDE_NOTES.english.fontSize}
        fill={CHROME}
      >
        {SIDE_NOTES.english.text}
      </text>

      <text
        x={SIDE_NOTES.arabic.x}
        y={SIDE_NOTES.arabic.y}
        transform={`rotate(-90 ${SIDE_NOTES.arabic.x} ${SIDE_NOTES.arabic.y})`}
        textLength={SIDE_NOTES.arabic.length}
        lengthAdjust="spacingAndGlyphs"
        textAnchor="middle"
        direction="rtl"
        fontFamily={FONT}
        fontSize={SIDE_NOTES.arabic.fontSize}
        fontWeight={700}
        fill={CHROME}
      >
        {SIDE_NOTES.arabic.text}
      </text>
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Fields
 * ------------------------------------------------------------------ */

export interface HeaderValue {
  patientName: string
  age: string
  /** ISO `YYYY-MM-DD`, the shape `<input type="date">` already produces. */
  date: string
  doctor: string
  referredFrom: string
  patientId: string
}

export interface HeaderFieldsProps {
  value: HeaderValue
  onChange: (field: keyof HeaderValue, value: string) => void
  mode: PrintMode
}

function fieldStyle(box: Box, mode: PrintMode, align: 'right' | 'center' = 'right'): CSSProperties {
  return {
    position: 'absolute',
    left: `${box.left}mm`,
    top: `${box.top}mm`,
    width: `${box.width}mm`,
    height: `${box.height}mm`,
    fontSize: `${INK_FONT_SIZE}mm`,
    lineHeight: `${INK_LINE_HEIGHT}mm`,
    textAlign: align,
    padding: 0,
    border: 'none',
    background: 'transparent',
    overflow: 'hidden',
    outline: mode === 'preprinted' ? '0.2mm dashed rgba(100, 116, 139, 0.35)' : 'none',
  }
}

interface DateSlots {
  year: string
  month: string
  day: string
}

/** The template prints the century, so only the last two year digits are typed. */
function splitDate(iso: string): DateSlots {
  const [y = '', m = '', d = ''] = iso.split('-')
  return { year: y.slice(-2), month: m, day: d }
}

function centuryOf(iso: string): string {
  return iso.slice(0, 2) || String(new Date().getFullYear()).slice(0, 2)
}

/** Empty until all three slots are filled: a half-typed date is not a date. */
function joinDate(slots: DateSlots, century: string): string {
  if (!slots.year || !slots.month || !slots.day) return ''
  return `${century}${slots.year.padStart(2, '0')}-${slots.month.padStart(2, '0')}-${slots.day.padStart(2, '0')}`
}

function twoDigits(next: string): string {
  return next.replace(/\D/g, '').slice(0, 2)
}

export function HeaderFields({ value, onChange, mode }: HeaderFieldsProps): React.JSX.Element {
  const [date, setDate] = useState<DateSlots>(() => splitDate(value.date))
  const century = useRef(centuryOf(value.date))

  useEffect(() => {
    if (value.date) century.current = centuryOf(value.date)
    if (value.date !== joinDate(date, century.current)) setDate(splitDate(value.date))
  }, [value.date])

  const datePart = (part: 'year' | 'month' | 'day') => (next: string) => {
    const slots = { ...date, [part]: twoDigits(next) }
    setDate(slots)
    onChange('date', joinDate(slots, century.current))
  }

  return (
    <>
      <input
        data-ink
        type="text"
        aria-label="Patient name"
        dir="rtl"
        value={value.patientName}
        onChange={e => onChange('patientName', e.target.value)}
        style={fieldStyle(HEADER_FIELDS.name, mode)}
      />
      <input
        data-ink
        type="text"
        aria-label="Age"
        value={value.age}
        onChange={e => onChange('age', e.target.value)}
        style={fieldStyle(HEADER_FIELDS.age, mode, 'center')}
      />
      <input
        data-ink
        type="text"
        inputMode="numeric"
        aria-label="Day"
        value={date.day}
        onChange={e => datePart('day')(e.target.value)}
        style={fieldStyle(HEADER_FIELDS.dateDay, mode, 'center')}
      />
      <input
        data-ink
        type="text"
        inputMode="numeric"
        aria-label="Month"
        value={date.month}
        onChange={e => datePart('month')(e.target.value)}
        style={fieldStyle(HEADER_FIELDS.dateMonth, mode, 'center')}
      />
      <input
        data-ink
        type="text"
        inputMode="numeric"
        aria-label="Year"
        value={date.year}
        onChange={e => datePart('year')(e.target.value)}
        style={fieldStyle(HEADER_FIELDS.dateYear, mode, 'center')}
      />
      <input
        data-ink
        type="text"
        aria-label="Examining doctor"
        dir="rtl"
        value={value.doctor}
        onChange={e => onChange('doctor', e.target.value)}
        style={fieldStyle(HEADER_FIELDS.doctor, mode)}
      />
      <input
        data-ink
        type="text"
        aria-label="Referred from"
        dir="rtl"
        value={value.referredFrom}
        onChange={e => onChange('referredFrom', e.target.value)}
        style={fieldStyle(HEADER_FIELDS.referredFrom, mode)}
      />
      <input
        data-ink
        type="text"
        aria-label="Patient ID"
        value={value.patientId}
        onChange={e => onChange('patientId', e.target.value)}
        style={fieldStyle(HEADER_FIELDS.patientId, mode, 'center')}
      />
    </>
  )
}
