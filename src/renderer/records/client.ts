/**
 * The renderer's single door to the saved-tests database.
 *
 * Outside Electron (a plain browser tab during UI work) there is no
 * `electronAPI`, so every call resolves to the same thing a fresh database
 * would return instead of each caller inventing its own fallback.
 */
import type { TestRecord, TestSummary } from '../../shared/tests'

export type Outcome<T> = { ok: true; data: T } | { ok: false; error: string }

const NO_BRIDGE = 'قاعدة البيانات غير متاحة'

async function call<T>(
  run: (api: NonNullable<Window['electronAPI']>) => Promise<{ success: boolean; data?: T; error?: string }>,
  fallback?: T,
): Promise<Outcome<T>> {
  const api = window.electronAPI
  if (!api) {
    return fallback === undefined ? { ok: false, error: NO_BRIDGE } : { ok: true, data: fallback }
  }
  const result = await run(api)
  if (!result.success) return { ok: false, error: result.error ?? 'Unknown error' }
  return { ok: true, data: result.data as T }
}

export const testsClient = {
  isAvailable: () => Boolean(window.electronAPI),
  list: (query: string) => call<TestSummary[]>(api => api.listTests(query), []),
  get: (id: string) => call<TestRecord | null>(api => api.getTest(id)),
  save: (id: string | null, record: unknown) => call<TestRecord>(api => api.saveTest({ id, record })),
  remove: (id: string) => call<boolean>(api => api.deleteTest(id)),
}
