/**
 * Geometry of the pre-printed yellow Al-Qawqaa hearing-test sheet.
 *
 * Every number is millimetres on a 210x297 A4 page, measured from a 300dpi scan
 * (2479x3507) that was de-skewed by 0.276 degrees before measuring. Pixels map to
 * millimetres as `px * 25.4 / 300`.
 *
 * Both the chrome layer (the printed template) and the ink layer (what we print
 * onto it) resolve their positions from here, which is what keeps them registered.
 */

export const SHEET = { w: 210, h: 297 } as const

/** Outer double-ruled box that frames the whole form. */
/**
 * Centre lines of the border. It reads as a double rule but the scan shows one
 * solid band, thicker on the horizontals than the verticals; HeaderPanel's
 * FRAME_STROKE carries those per-side thicknesses.
 */
export const FRAME = {
  left: 16.43,
  right: 185.21,
  top: 30.99,
  bottom: 279.02,
} as const

/** Column of rotated text down the right-hand margin. */
export const SIDE_COLUMN = { left: 173.61, right: FRAME.right } as const

export type PrintMode = 'plain' | 'preprinted'

/**
 * Alignment nudge applied to the ink layer when printing onto pre-printed stock.
 * Every printer feeds paper slightly differently, so this is user-calibrated and
 * persisted rather than hard-coded.
 */
export interface Calibration {
  /** Millimetres, positive moves ink right. */
  offsetX: number
  /** Millimetres, positive moves ink down. */
  offsetY: number
  /** 1 = no scaling. Corrects printers that shrink the page slightly. */
  scale: number
}

export const DEFAULT_CALIBRATION: Calibration = { offsetX: 0, offsetY: 0, scale: 1 }

/* ------------------------------------------------------------------ *
 * Audiogram frequency axis
 * ------------------------------------------------------------------ */

/**
 * The grid is 15 columns of equal half-octave width. Frequencies sit *on* grid
 * lines, indexed from the left edge of the grid body. Lines 0, 2, 4 and 15 carry
 * no frequency: they exist to make the header cells come out even.
 */
export const AUDIOGRAM_COLUMN_COUNT = 15

export const FREQUENCY_LINES: ReadonlyArray<{ freq: number; line: number; interoctave: boolean }> = [
  { freq: 0.125, line: 1, interoctave: false },
  { freq: 0.25, line: 3, interoctave: false },
  { freq: 0.5, line: 5, interoctave: false },
  { freq: 0.75, line: 6, interoctave: true },
  { freq: 1, line: 7, interoctave: false },
  { freq: 1.5, line: 8, interoctave: true },
  { freq: 2, line: 9, interoctave: false },
  { freq: 3, line: 10, interoctave: true },
  { freq: 4, line: 11, interoctave: false },
  { freq: 6, line: 12, interoctave: true },
  { freq: 8, line: 13, interoctave: false },
  { freq: 12, line: 14, interoctave: true },
]

export const FREQUENCIES: ReadonlyArray<number> = FREQUENCY_LINES.map(f => f.freq)

/** dB axis runs -10 to 120 in 10 dB steps: 14 grid lines, 13 rows. */
export const DB_LEVELS: ReadonlyArray<number> = Array.from({ length: 14 }, (_, i) => -10 + i * 10)
export const DB_MIN = -10
export const DB_MAX = 120

/* ------------------------------------------------------------------ *
 * Helpers shared by every panel
 * ------------------------------------------------------------------ */

/** Linear interpolation from a value range onto a millimetre range. */
export function scaleTo(value: number, from: [number, number], to: [number, number]): number {
  const t = (value - from[0]) / (from[1] - from[0])
  return to[0] + t * (to[1] - to[0])
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** Snap an arbitrary dB reading to the nearest 5 dB the form can represent. */
export function snapDb(db: number): number {
  return clamp(Math.round(db / 5) * 5, DB_MIN, DB_MAX)
}

/** Nearest plottable frequency to a fractional grid-line index. */
export function nearestFrequency(line: number): number {
  let best = FREQUENCY_LINES[0]
  for (const f of FREQUENCY_LINES) {
    if (Math.abs(f.line - line) < Math.abs(best.line - line)) best = f
  }
  return best.freq
}

export function frequencyLine(freq: number): number {
  return FREQUENCY_LINES.find(f => f.freq === freq)?.line ?? 0
}
