/** Date formatting shared by the form and the records list. */

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date, not UTC: after midnight in Libya the two differ. */
export function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** `2026-08-19` → `19/08/2026`. Stored ISO for sorting, read day-first. */
export function formatIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

/** `2026-08-19T09:41:03.000Z` → `19/08/2026 11:41` in the machine's own zone. */
export function formatStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
