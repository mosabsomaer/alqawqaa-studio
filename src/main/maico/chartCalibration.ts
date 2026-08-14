// MA 42 chart JPEG calibration (1150x1030 px at 360 DPI)
// Derived from known reference: 250 Hz @ 35 dB → (304,436), 2k Hz @ 15 dB → (700,304)
const X_ORIGIN_PX = 179     // x pixel of 125 Hz column
const X_PX_PER_OCTAVE = 132 // pixels per doubling of frequency
const Y_ORIGIN_PX = 139     // y pixel of -10 dB row
const Y_PX_PER_10DB = 66    // pixels per 10 dB step

const VALID_FREQS_KHZ = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8]
const VALID_DBS = Array.from({ length: 27 }, (_, i) => -10 + i * 5)

export function pxToFreqKhz(cx: number): number {
  const freqKhz = (125 * Math.pow(2, (cx - X_ORIGIN_PX) / X_PX_PER_OCTAVE)) / 1000
  return VALID_FREQS_KHZ.reduce((best, f) =>
    Math.abs(f - freqKhz) < Math.abs(best - freqKhz) ? f : best
  )
}

export function pxToDb(cy: number): number {
  const db = ((cy - Y_ORIGIN_PX) / Y_PX_PER_10DB) * 10 - 10
  return VALID_DBS.reduce((best, d) =>
    Math.abs(d - db) < Math.abs(best - db) ? d : best
  )
}

// Classify audiogram symbol type from cluster geometry.
// aspect = w/h, density = pixelCount / (w*h)
//
// BC symbol densities (confirmed by pixel inspection at 360 DPI):
//   [ and ]  (masked BC):   density >= 0.40: thick horizontal bars fill the bounding box
//   < and >  (unmasked BC): density <  0.40: two diagonal strokes, sparser
//
// AC symbol densities differ by ear:
//   Right ear: O (unmasked) density >= 0.34 > △ (masked) density ~0.26
//   Left ear:  □ (masked)   density >= 0.34 > X (unmasked) density ~0.32
//
// Merged BC+AC blob: when both symbols land on the same grid point the Maico
// renders them as one wide shape, aspect > 1.4 catches this.
export function classifySymbol(
  w: number,
  h: number,
  pixelCount: number,
  ear: 'right' | 'left'
): string {
  const aspect = w / h
  const density = pixelCount / (w * h)

  // Merged BC + AC blob: unusually wide for its height
  if (aspect > 1.4) {
    return ear === 'right' ? 'ac-right-unmasked' : 'ac-left-unmasked'
  }

  // Narrow symbols: BC family (< > [ ])
  if (aspect < 0.7) {
    // [ and ] have thick horizontal bars → higher density than chevrons < >
    return density >= 0.40
      ? (ear === 'right' ? 'bc-right-masked' : 'bc-left-masked')      // [ or ]
      : (ear === 'right' ? 'bc-right-unmasked' : 'bc-left-unmasked')  // < or >
  }

  // Square-ish symbols: AC family (O X △ □)
  // Right ear: O (unmasked circle) is denser than △ (masked triangle)
  // Left ear:  □ (masked square)  is denser than X (unmasked cross)
  if (ear === 'right') {
    return density >= 0.34 ? 'ac-right-unmasked' : 'ac-right-masked'
  } else {
    return density >= 0.34 ? 'ac-left-masked' : 'ac-left-unmasked'
  }
}
