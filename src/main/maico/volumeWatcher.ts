import { execFile } from 'node:child_process'
import * as fs from 'node:fs'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const POLL_INTERVAL_MS = process.platform === 'win32' ? 3000 : 2000
const POWERSHELL_TIMEOUT_MS = 10000
const MAX_SCAN_DEPTH = 4
const MAX_SCAN_ENTRIES = 4000

const SKIP_DIR_NAMES = new Set([
  '$RECYCLE.BIN',
  'System Volume Information',
  '.Spotlight-V100',
  '.Trashes',
  '.fseventsd',
  '.TemporaryItems',
  '.DocumentRevisions-V100',
  'lost+found',
])

export interface DetectedVolume {
  path: string
  label: string
}

function isReadableDir(path: string): boolean {
  try {
    return fs.statSync(path).isDirectory()
  } catch {
    return false
  }
}

const PS_LIST_REMOVABLE =
  "Get-Volume | Where-Object { $_.DriveType -eq 'Removable' -and $_.DriveLetter } | " +
  'Select-Object DriveLetter, FileSystemLabel | ConvertTo-Json -Compress'

// ConvertTo-Json emits a bare object, not an array, when exactly one volume matches
export function parseWindowsVolumes(stdout: string): DetectedVolume[] {
  const trimmed = stdout.trim()
  if (!trimmed) return []

  const parsed = JSON.parse(trimmed)
  const rows: { DriveLetter?: string; FileSystemLabel?: string }[] = Array.isArray(parsed) ? parsed : [parsed]

  return rows
    .filter((row) => Boolean(row?.DriveLetter))
    .map((row) => ({
      path: `${row.DriveLetter}:\\`,
      label: row.FileSystemLabel || `${row.DriveLetter}:`,
    }))
}

async function listWindowsVolumes(): Promise<DetectedVolume[]> {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', PS_LIST_REMOVABLE],
    { windowsHide: true, timeout: POWERSHELL_TIMEOUT_MS },
  )
  return parseWindowsVolumes(stdout)
}

function listUnixVolumes(): DetectedVolume[] {
  const roots = process.platform === 'darwin' ? ['/Volumes'] : ['/media', '/run/media', '/mnt']

  const volumes: DetectedVolume[] = []
  for (const root of roots) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(root, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const full = join(root, entry.name)
      if (!isReadableDir(full)) continue
      // Linux mounts are usually nested one level under a user name
      if (process.platform !== 'darwin' && root !== '/mnt') {
        let nested: fs.Dirent[]
        try {
          nested = fs.readdirSync(full, { withFileTypes: true })
        } catch {
          continue
        }
        const nestedDirs = nested.filter((n) => !n.name.startsWith('.') && isReadableDir(join(full, n.name)))
        if (nestedDirs.length > 0) {
          for (const n of nestedDirs) volumes.push({ path: join(full, n.name), label: n.name })
          continue
        }
      }
      volumes.push({ path: full, label: basename(full) })
    }
  }
  return volumes
}

async function listVolumes(): Promise<DetectedVolume[]> {
  if (process.platform === 'win32') return listWindowsVolumes()
  return listUnixVolumes()
}

export function findLatestPdf(volumePath: string): string | null {
  let bestPath: string | null = null
  let bestMtime = -1
  let seen = 0

  const walk = (dir: string, depth: number) => {
    if (depth > MAX_SCAN_DEPTH || seen > MAX_SCAN_ENTRIES) return
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (seen > MAX_SCAN_ENTRIES) return
      seen++
      if (entry.name.startsWith('.') || SKIP_DIR_NAMES.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full, depth + 1)
        continue
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.pdf')) continue
      try {
        const mtime = fs.statSync(full).mtimeMs
        if (mtime > bestMtime) {
          bestMtime = mtime
          bestPath = full
        }
      } catch {
        // unreadable file, skip
      }
    }
  }

  walk(volumePath, 0)
  return bestPath
}

export function startVolumeWatcher(onVolumeAdded: (volume: DetectedVolume) => void): () => void {
  let known: Set<string> | null = null
  let polling = false

  const poll = async () => {
    if (polling) return
    polling = true
    try {
      const current = await listVolumes()
      const currentPaths = new Set(current.map((v) => v.path))

      // First successful poll only seeds the baseline, it never fires
      if (known !== null) {
        for (const volume of current) {
          if (!known.has(volume.path)) {
            try {
              onVolumeAdded(volume)
            } catch (err) {
              console.error('Volume handler error:', err)
            }
          }
        }
      }
      known = currentPaths
    } catch (err) {
      // Leave the baseline untouched so a transient failure cannot re-fire every volume
      console.error('Volume scan error:', err)
    } finally {
      polling = false
    }
  }

  void poll()
  const timer = setInterval(() => void poll(), POLL_INTERVAL_MS)
  if (typeof timer.unref === 'function') timer.unref()

  return () => clearInterval(timer)
}
