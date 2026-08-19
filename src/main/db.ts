/**
 * Saved tests, in a single SQLite file under the user's app-data directory.
 *
 * `node:sqlite` ships inside Electron, so there is no native module to rebuild
 * per architecture: the Windows installer stays a plain copy of `out/`.
 *
 * The full form record lives in `data` as JSON; the columns beside it exist
 * only so the records dialog can list and search without parsing every row.
 * Those columns come from SUMMARY_FIELDS, so adding a searchable field is one
 * line there rather than an edit in seven places here.
 */
import electron from 'electron'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { SUMMARY_FIELDS, summaryValues, type TestRecord, type TestSummary } from '../shared/tests'

export type { TestRecord, TestSummary }

const SUMMARY_COLS = SUMMARY_FIELDS.map(f => f.col)
/** Every column except `data`, which is only read when opening one record. */
const LIGHT_COLS = ['id', ...SUMMARY_COLS, 'schema', 'created_at', 'updated_at']
const WRITE_COLS = ['id', ...SUMMARY_COLS, 'schema', 'data', 'created_at', 'updated_at']

const LIST_LIMIT = 500

let db: DatabaseSync | null = null

function connect(): DatabaseSync {
  if (db) return db

  const file = join(electron.app.getPath('userData'), 'alqawqaa-tests.db')
  const handle = new DatabaseSync(file)

  // WAL survives a laptop losing power mid-write, which is the realistic
  // failure mode on a clinic machine with no UPS.
  handle.exec('PRAGMA journal_mode = WAL')
  handle.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      ${SUMMARY_COLS.map(c => `${c} TEXT NOT NULL DEFAULT ''`).join(',\n      ')},
      schema INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // A file written before a summary column existed keeps its old shape through
  // CREATE TABLE IF NOT EXISTS, and every INSERT would then fail on the missing
  // column. Adding a field to SUMMARY_FIELDS stays a one-line change.
  const present = new Set(
    (handle.prepare('PRAGMA table_info(tests)').all() as unknown as { name: string }[]).map(c => c.name),
  )
  for (const col of SUMMARY_COLS) {
    if (!present.has(col)) handle.exec(`ALTER TABLE tests ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`)
  }
  if (!present.has('schema')) {
    handle.exec('ALTER TABLE tests ADD COLUMN schema INTEGER NOT NULL DEFAULT 0')
  }

  handle.exec('CREATE INDEX IF NOT EXISTS tests_updated_at ON tests (updated_at DESC)')

  db = handle
  return db
}

export function closeDb() {
  db?.close()
  db = null
}

type Row = Record<string, string | number>

function toSummary(row: Row): TestSummary {
  const summary: Record<string, unknown> = {
    id: row.id,
    schema: Number(row.schema ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
  for (const f of SUMMARY_FIELDS) {
    summary[f.out] = row[f.col] ?? ''
  }
  return summary as unknown as TestSummary
}

/**
 * An empty query becomes `LIKE '%'`, which matches every row: the searchable
 * columns are all NOT NULL, so there is no NULL to escape the comparison.
 */
export function listTests(query = ''): TestSummary[] {
  const like = `%${query.trim()}%`
  const where = SUMMARY_COLS.map(c => `${c} LIKE ?`).join(' OR ')
  const rows = connect()
    .prepare(
      `SELECT ${LIGHT_COLS.join(', ')} FROM tests
       WHERE ${where}
       ORDER BY updated_at DESC LIMIT ?`,
    )
    .all(...SUMMARY_COLS.map(() => like), LIST_LIMIT) as unknown as Row[]
  return rows.map(toSummary)
}

export function getTest(id: string): TestRecord | null {
  const row = connect().prepare('SELECT * FROM tests WHERE id = ?').get(id) as unknown as Row | undefined
  if (!row) return null
  return { ...toSummary(row), data: JSON.parse((row.data as string) ?? '{}') }
}

/**
 * Upsert. A record whose id was deleted from another window is re-inserted
 * rather than silently dropping the doctor's work; `created_at` is left out of
 * the conflict clause so it survives an update.
 */
export function saveTest(id: string | null, record: unknown): TestRecord {
  const rec = (record ?? {}) as Record<string, unknown>
  const now = new Date().toISOString()
  const newId = id ?? randomUUID()
  const values = summaryValues(rec)
  const schema = Number(rec.schema ?? 0)

  const updatable = [...SUMMARY_COLS, 'schema', 'data', 'updated_at']
  // RETURNING hands back the stored row (notably the original created_at on an
  // update) without a second statement, and without re-parsing the JSON blob.
  const row = connect()
    .prepare(
      `INSERT INTO tests (${WRITE_COLS.join(', ')})
       VALUES (${WRITE_COLS.map(() => '?').join(', ')})
       ON CONFLICT(id) DO UPDATE SET ${updatable.map(c => `${c} = excluded.${c}`).join(', ')}
       RETURNING ${LIGHT_COLS.join(', ')}`,
    )
    .get(newId, ...values, schema, JSON.stringify(rec), now, now) as unknown as Row

  return { ...toSummary(row), data: rec }
}

export function deleteTest(id: string): boolean {
  return connect().prepare('DELETE FROM tests WHERE id = ?').run(id).changes > 0
}
