/**
 * Reads a saved record in either the pre-SVG shape or the current one and
 * returns a SheetValue. Running it twice on its own output changes nothing.
 */
import {
  EMPTY_MEASUREMENTS,
  type MeasurementsValue,
  parseSpeechPoints,
  type SpeechPoint,
} from './print/panels/MeasurementsPanel'
import { migrateSymbols, serializeSymbols } from './print/panels/AudiogramPanel'
import { migrateCurve } from './print/panels/TympanometryPanel'
import { EMPTY_SHEET_VALUE, EMPTY_SPEECH_EXTRAS, type SheetValue, type SpeechExtras } from './print/FormSheet'
import type { EustachianGrade, EustachianValue } from './print/panels/AudiogramPanel'
import type { SymptomsData } from './print/panels/SymptomsPanel'

/** Bumped whenever a one-shot rewrite has to run exactly once per record. */
export const SHEET_SCHEMA = 2

export interface StoredSheet extends SheetValue {
  schema: number
}

type Rec = Record<string, unknown>

function str(rec: Rec, ...keys: string[]): string {
  for (const key of keys) {
    const v = rec[key]
    if (typeof v === 'string' && v !== '') return v
  }
  return ''
}

function grade(v: unknown): EustachianGrade | null {
  return v === 'good' || v === 'fair' || v === 'bad' ? v : null
}

function eustachianOf(rec: Rec): EustachianValue {
  const e = (rec.eustachian ?? {}) as Rec
  return { right: grade(e.right), left: grade(e.left) }
}

const MEASUREMENT_FIELDS = [
  'toneDecay500',
  'toneDecay1000',
  'ldl',
  'discrimination',
  'stapedialReflex',
] as const

/**
 * The old speech table held five strings per ear. Only `discrimination` has a
 * printed box on the paper; `level` + `discrimination` also plot as one point on
 * the speech graph, and the two masking columns have nowhere to go (see notesOf).
 */
function measurementsOf(rec: Rec): MeasurementsValue {
  const current = rec.measurements as Rec | undefined
  const legacy = rec.speechAudiometryData as Rec | undefined
  const build = (ear: 'right' | 'left') => {
    const cur = (current?.[ear] ?? {}) as Rec
    const old = (legacy?.[`${ear}Ear`] ?? {}) as Rec
    const out = { ...EMPTY_MEASUREMENTS[ear] }
    for (const field of MEASUREMENT_FIELDS) {
      out[field] = typeof cur[field] === 'string' ? (cur[field] as string) : ''
    }
    if (!out.discrimination && typeof old.discrimination === 'string') {
      out.discrimination = old.discrimination
    }
    return out
  }
  return { right: build('right'), left: build('left') }
}

function speechPointsOf(rec: Rec): SpeechPoint[] {
  if (Array.isArray(rec.speechPoints)) return parseSpeechPoints(JSON.stringify(rec.speechPoints))
  if (typeof rec.speechPoints === 'string') return parseSpeechPoints(rec.speechPoints)

  const legacy = rec.speechAudiometryData as Rec | undefined
  if (!legacy) return []
  const points: SpeechPoint[] = []
  for (const ear of ['right', 'left'] as const) {
    const old = (legacy[`${ear}Ear`] ?? {}) as Rec
    const level = Number(old.level)
    const score = Number(old.discrimination)
    if (!Number.isFinite(level) || !Number.isFinite(score)) continue
    if (old.level === '' || old.discrimination === '') continue
    points.push({ id: `legacy-${ear}`, ear, level, score })
  }
  return parseSpeechPoints(JSON.stringify(points))
}

/**
 * SRT and the two masking columns have no box on the printed sheet, so on the
 * one migration of a given record they are folded into the audiometry notes
 * rather than dropped. `schema` is what keeps that from happening twice.
 */
function notesOf(rec: Rec, migrated: boolean): string {
  const notes = str(rec, 'audiometryNotes')
  if (migrated) return notes
  const legacy = rec.speechAudiometryData as Rec | undefined
  if (!legacy) return notes
  const parts: string[] = []
  for (const ear of ['right', 'left'] as const) {
    const old = (legacy[`${ear}Ear`] ?? {}) as Rec
    const bits = [
      ['SRT', old.srt],
      ['mask SRT', old.maskingSRT],
      ['mask DS', old.maskingDS],
    ]
      .filter(([, v]) => typeof v === 'string' && v !== '')
      .map(([label, v]) => `${label} ${v}`)
    if (bits.length) parts.push(`${ear === 'right' ? 'RT' : 'LT'}: ${bits.join(', ')}`)
  }
  if (!parts.length) return notes
  return [notes, parts.join('  ')].filter(Boolean).join('\n')
}

/**
 * The old speech table's SRT / level / masking columns. Records written before
 * this field existed still carry them under `speechAudiometryData`.
 */
function speechExtrasOf(rec: Rec): SpeechExtras {
  const current = rec.speechExtras as Rec | undefined
  const legacy = rec.speechAudiometryData as Rec | undefined
  const build = (ear: 'right' | 'left') => {
    const cur = (current?.[ear] ?? {}) as Rec
    const old = (legacy?.[`${ear}Ear`] ?? {}) as Rec
    const pick = (key: string) =>
      typeof cur[key] === 'string' ? (cur[key] as string)
      : typeof old[key] === 'string' ? (old[key] as string)
      : ''
    return {
      srt: pick('srt'),
      level: pick('level'),
      maskingSRT: pick('maskingSRT'),
      maskingDS: pick('maskingDS'),
    }
  }
  return { ...EMPTY_SPEECH_EXTRAS, right: build('right'), left: build('left') }
}

export function toSheetValue(raw: unknown): SheetValue {
  if (!raw || typeof raw !== 'object') return EMPTY_SHEET_VALUE
  const rec = raw as Rec
  const migrated = rec.schema === SHEET_SCHEMA

  return {
    patientName: str(rec, 'patientName'),
    age: str(rec, 'age'),
    date: str(rec, 'date'),
    doctor: str(rec, 'doctor'),
    referredFrom: str(rec, 'referredFrom'),
    patientId: str(rec, 'patientId'),
    rightAudiogram: serializeSymbols(migrateSymbols(str(rec, 'rightAudiogram', 'rightAudiogramData'))),
    leftAudiogram: serializeSymbols(migrateSymbols(str(rec, 'leftAudiogram', 'leftAudiogramData'))),
    eustachian: eustachianOf(rec),
    rightTympanogram: serialize(migrateCurve(str(rec, 'rightTympanogram', 'rightTympData'))),
    leftTympanogram: serialize(migrateCurve(str(rec, 'leftTympanogram', 'leftTympData'))),
    measurements: measurementsOf(rec),
    speechPoints: speechPointsOf(rec),
    speechExtras: speechExtrasOf(rec),
    symptoms: (rec.symptoms ?? rec.symptomsData ?? {}) as SymptomsData,
    tympanometryNotes: str(rec, 'tympanometryNotes'),
    audiometryNotes: notesOf(rec, migrated),
  }
}

function serialize(points: unknown[]): string {
  return points.length ? JSON.stringify(points) : ''
}

export function toStored(value: SheetValue): StoredSheet {
  return { ...value, schema: SHEET_SCHEMA }
}
