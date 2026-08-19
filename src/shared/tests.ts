/**
 * The contract between the saved-tests database and the form that fills it.
 *
 * Main and renderer both import this, so the column list exists once. `form` is
 * typed against StoredSheet: renaming a field on the sheet breaks the build
 * here rather than silently writing blank columns nobody notices until the
 * records list stops showing dates.
 */
import type { StoredSheet } from '../renderer/formMigration'

export interface TestSummary {
  id: string
  patientName: string
  age: string
  patientId: string
  doctor: string
  referredFrom: string
  testDate: string
  /** SHEET_SCHEMA of the stored blob, kept queryable so a bump can drive a
      migration pass instead of waiting for each record to be reopened. */
  schema: number
  createdAt: string
  updatedAt: string
}

export interface TestRecord extends TestSummary {
  data: unknown
}

export type DbResult<T> = { success: true; data: T } | { success: false; error: string }

/** Column ← form field ← summary field. Everything else is derived from this. */
export const SUMMARY_FIELDS = [
  { col: 'patient_name', form: 'patientName', out: 'patientName' },
  { col: 'age', form: 'age', out: 'age' },
  { col: 'patient_id', form: 'patientId', out: 'patientId' },
  { col: 'doctor', form: 'doctor', out: 'doctor' },
  { col: 'referred_from', form: 'referredFrom', out: 'referredFrom' },
  { col: 'test_date', form: 'date', out: 'testDate' },
] as const satisfies readonly {
  col: string
  form: keyof StoredSheet
  out: keyof TestSummary
}[]

/** The searchable columns, pulled out of a stored record in column order. */
export function summaryValues(record: Record<string, unknown>): string[] {
  return SUMMARY_FIELDS.map(f => {
    const v = record[f.form]
    return typeof v === 'string' ? v : ''
  })
}
