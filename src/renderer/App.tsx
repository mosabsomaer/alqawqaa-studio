import { useEffect, useMemo, useRef, useState } from 'react'
import AudiometryToolbar, { type SymbolType } from './components/AudiometryToolbar'
import ControlPanel from './components/ControlPanel'
import { todayISO } from './dates'
import { toSheetValue, toStored } from './formMigration'
import PlainForm from './plain/PlainForm'
import FormSheet, { type SheetValue } from './print/FormSheet'
import RecordsDialog from './records/RecordsDialog'
import type { SaveState } from './records/SaveButton'
import { testsClient } from './records/client'
import { migrateSymbols, type PlacedSymbol, serializeSymbols } from './print/panels/AudiogramPanel'
import { usePrintMode } from './print/usePrintMode'

const PRINTER_KEY = 'alqawqaa.printer'
const DOCTOR_KEY = 'alqawqaa.doctorName'
const DOCTOR_RECENTS_KEY = 'alqawqaa.doctorRecents'
const MAX_RECENT_DOCTORS = 8

function readRecentDoctors(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(DOCTOR_RECENTS_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(n => typeof n === 'string') : []
  } catch {
    return []
  }
}

interface ImportedSymbol {
  freq: number
  db: number
  symbolType: string
}

function hasSymbols(serialized: string): boolean {
  return migrateSymbols(serialized).length > 0
}

interface ParsedSymbols {
  rightSymbols: ImportedSymbol[]
  leftSymbols: ImportedSymbol[]
}

/** Maico gives freq/db pairs; migrateSymbols snaps them onto the paper's axes. */
function importedToSheet(symbols: ImportedSymbol[]): string {
  const placed: PlacedSymbol[] = symbols.map((s, i) => ({
    id: `maico-${Date.now()}-${i}`,
    freq: s.freq,
    db: s.db,
    symbolType: s.symbolType as SymbolType,
  }))
  return serializeSymbols(migrateSymbols(JSON.stringify(placed)))
}

export default function App() {
  // Store doctor name separately (persistent across resets and restarts)
  const [doctorName, setDoctorName] = useState(() => localStorage.getItem(DOCTOR_KEY) || 'د. ')
  const [recentDoctors, setRecentDoctors] = useState<string[]>(readRecentDoctors)

  // Audiometry symbol selection state
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolType>('ac-right-unmasked')

  const { mode, setMode, calibration, setCalibration, resetCalibration } = usePrintMode()

  // Like calibration, the chosen printer belongs to the machine, not the record.
  const [printerName, setPrinterName] = useState(() => localStorage.getItem(PRINTER_KEY) || '')
  const [printStatus, setPrintStatus] = useState<
    { state: 'printing' } | { state: 'done' } | { state: 'error'; message: string } | null
  >(null)
  const printToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePrinterChange = (name: string) => {
    setPrinterName(name)
    localStorage.setItem(PRINTER_KEY, name)
  }

  const handleDoctorChange = (name: string) => {
    setDoctorName(name)
    localStorage.setItem(DOCTOR_KEY, name)
    patch({ doctor: name })
  }

  const removeRecentDoctor = (name: string) => {
    setRecentDoctors(prev => {
      const next = prev.filter(n => n !== name)
      localStorage.setItem(DOCTOR_RECENTS_KEY, JSON.stringify(next))
      return next
    })
  }

  const rememberDoctor = (name: string) => {
    const trimmed = name.trim()
    // "د." alone is the placeholder, not a name worth remembering.
    if (trimmed.length <= 2) return
    setRecentDoctors(prev => {
      const next = [trimmed, ...prev.filter(n => n !== trimmed)].slice(0, MAX_RECENT_DOCTORS)
      localStorage.setItem(DOCTOR_RECENTS_KEY, JSON.stringify(next))
      return next
    })
  }

  const [importBanner, setImportBanner] = useState<{ count: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [autoImport, setAutoImport] = useState<{
    volumeName: string
    count: number
    data: ParsedSymbols
    applied: boolean
  } | null>(null)

  const getInitialValue = (): SheetValue =>
    toSheetValue({
      date: todayISO(),
      doctor: doctorName,
      referredFrom: 'د. ',
    })

  const [value, setValue] = useState<SheetValue>(getInitialValue)
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const patch = (p: Partial<SheetValue>) => setValue(v => ({ ...v, ...p }))

  // Saved-test state. `savedJson` is the exact snapshot that reached the
  // database: editing a field and typing the old value back counts as saved
  // again, which is what a doctor undoing a typo expects.
  const [recordId, setRecordId] = useState<string | null>(null)
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(value))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [recordsOpen, setRecordsOpen] = useState(false)

  const currentJson = useMemo(() => JSON.stringify(value), [value])
  const dirty = currentJson !== savedJson

  const saveState: SaveState =
    saving ? 'saving'
    : saveError ? 'error'
    : dirty ? 'dirty'
    : recordId ? 'saved'
    : 'clean'

  const showPrintToast = (status: { state: 'done' } | { state: 'error'; message: string }) => {
    if (printToastTimer.current) clearTimeout(printToastTimer.current)
    setPrintStatus(status)
    printToastTimer.current = setTimeout(() => setPrintStatus(null), 12000)
  }

  const handlePrint = async (showDialog = false) => {
    if (!window.electronAPI) {
      window.print()
      return
    }
    setPrintStatus({ state: 'printing' })
    const result = await window.electronAPI.printForm({
      mode,
      deviceName: printerName || undefined,
      showDialog,
    })
    if (result.success) {
      rememberDoctor(doctorName)
      showPrintToast({ state: 'done' })
    } else if (showDialog && result.error === 'cancelled') {
      // User backed out of the OS dialog; not a failure worth a toast.
      setPrintStatus(null)
    } else {
      showPrintToast({ state: 'error', message: result.error ?? 'Unknown error' })
    }
  }

  /**
   * The alignment test prints the template outline itself onto a real yellow
   * sheet, so it always goes out in pre-printed mode whatever the switch says.
   */
  const handleAlignmentTest = async () => {
    document.body.dataset.alignmentTest = 'on'
    document.body.dataset.printMode = 'preprinted'
    try {
      if (window.electronAPI) {
        await window.electronAPI.printForm({ mode: 'preprinted', deviceName: printerName || undefined })
      } else {
        window.print()
      }
    } finally {
      delete document.body.dataset.alignmentTest
      document.body.dataset.printMode = mode
    }
  }

  const handleSave = async () => {
    if (saving) return
    // Snapshot before the await: whatever the doctor types while the write is
    // in flight must stay marked unsaved.
    const snapshot = valueRef.current
    setSaving(true)
    setSaveError(null)
    const result = await testsClient.save(recordId, toStored(snapshot))
    setSaving(false)
    if (!result.ok) {
      setSaveError(result.error)
      return
    }
    setRecordId(result.data.id)
    setSavedJson(JSON.stringify(snapshot))
    rememberDoctor(snapshot.doctor)
  }

  /** Swap the sheet for another record (or a blank one) and clear everything
      the previous one left on screen. */
  const loadSheet = (next: SheetValue, id: string | null) => {
    setValue(next)
    valueRef.current = next
    setSavedJson(JSON.stringify(next))
    setRecordId(id)
    setSaveError(null)
    setImportBanner(null)
    setImportError(null)
    setAutoImport(null)
    setPrintStatus(null)
  }

  const handleOpenRecord = async (id: string) => {
    if (dirty && !confirm('لديك تغييرات غير محفوظة. هل تريد فتح فحص آخر وتجاهلها؟')) return

    const result = await testsClient.get(id)
    if (!result.ok) {
      setSaveError(result.error)
      return
    }
    if (!result.data) {
      setSaveError('لم يعد هذا الفحص موجودًا')
      return
    }

    const loaded = toSheetValue(result.data.data)
    loadSheet(loaded, id)
    setRecordsOpen(false)
    // The header field follows the record; the toolbar input follows the doctor
    // at the machine, so only adopt a name the record actually carries.
    if (loaded.doctor) {
      setDoctorName(loaded.doctor)
      localStorage.setItem(DOCTOR_KEY, loaded.doctor)
    }
  }

  const handleReset = () => {
    if (dirty && !confirm('لديك تغييرات غير محفوظة. هل تريد بدء فحص جديد وتجاهلها؟')) return
    loadSheet(getInitialValue(), null)
  }

  const applyImportedSymbols = ({ rightSymbols, leftSymbols }: ParsedSymbols) => {
    const right = importedToSheet(rightSymbols)
    const left = importedToSheet(leftSymbols)

    setValue(prev => ({
      ...prev,
      rightAudiogram: right || prev.rightAudiogram,
      leftAudiogram: left || prev.leftAudiogram,
    }))

    return rightSymbols.length + leftSymbols.length
  }

  const handleImportMaico = async () => {
    if (!window.electronAPI?.importMaicoPdf) return
    setImportError(null)
    setImportBanner(null)

    const result = await window.electronAPI.importMaicoPdf()
    if (!result.success) {
      if (!result.canceled) setImportError(result.error ?? 'Import failed')
      return
    }

    const count = applyImportedSymbols(result.data!)
    setImportBanner({ count })
    setTimeout(() => setImportBanner(null), 3000)
  }

  useEffect(() => {
    if (!window.electronAPI?.onMaicoAutoImport) return

    return window.electronAPI.onMaicoAutoImport(payload => {
      const { rightSymbols, leftSymbols } = payload.data
      const count = rightSymbols.length + leftSymbols.length
      if (count === 0) return

      const current = valueRef.current
      const hasAudiogram = hasSymbols(current.rightAudiogram) || hasSymbols(current.leftAudiogram)

      if (hasAudiogram) {
        setAutoImport({ volumeName: payload.volumeName, count, data: payload.data, applied: false })
        return
      }

      applyImportedSymbols(payload.data)
      setAutoImport({ volumeName: payload.volumeName, count, data: payload.data, applied: true })
    })
  }, [])

  // Ctrl+S / Ctrl+P are what every Windows user reaches for first. They go
  // through a ref so the listener subscribes once instead of on every keystroke.
  const shortcuts = useRef<{ save: () => void; print: () => void }>({ save: () => {}, print: () => {} })
  useEffect(() => {
    shortcuts.current = {
      save: () => {
        if (dirty) void handleSave()
      },
      print: () => void handlePrint(),
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // AltGr on a Windows Arabic layout reports itself as Ctrl+Alt, so a
      // plain keystroke would otherwise fire the shortcut and eject a page.
      if (e.altKey || e.repeat || !(e.ctrlKey || e.metaKey)) return
      if (e.code !== 'KeyS' && e.code !== 'KeyP') return
      e.preventDefault()
      if (e.code === 'KeyS') shortcuts.current.save()
      else shortcuts.current.print()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const handleApplyAutoImport = () => {
    if (!autoImport) return
    applyImportedSymbols(autoImport.data)
    setAutoImport({ ...autoImport, applied: true })
  }

  return (
    <div className="p-2 bg-gray-100 ">
      {/* Fixed bottom-right toasts, no layout shift */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 no-print">
        {printStatus?.state === 'printing' && (
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded shadow-lg">
            <span className="border-2 border-gray-300 rounded-full size-4 border-t-blue-600 animate-spin" />
            <span dir="rtl">جارٍ الطباعة…</span>
          </div>
        )}
        {printStatus?.state === 'done' && (
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-green-800 bg-green-100 border border-green-300 rounded shadow-lg">
            <span dir="rtl">تمت الطباعة ✓</span>
            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-1 text-white bg-green-600 rounded cursor-pointer hover:bg-green-700"
              dir="rtl"
            >
              مريض جديد
            </button>
            <button type="button" onClick={() => setPrintStatus(null)} className="font-bold text-green-600 hover:text-green-900">✕</button>
          </div>
        )}
        {printStatus?.state === 'error' && (
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-red-800 bg-red-100 border border-red-300 rounded shadow-lg">
            <span>Print failed: {printStatus.message}</span>
            <button type="button" onClick={() => setPrintStatus(null)} className="font-bold text-red-600 hover:text-red-900">✕</button>
          </div>
        )}
        {importBanner && (
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-green-800 bg-green-100 border border-green-300 rounded shadow-lg">
            <span>Imported {importBanner.count} symbol{importBanner.count !== 1 ? 's' : ''}, review before printing</span>
            <button type="button" onClick={() => setImportBanner(null)} className="text-green-600 hover:text-green-900 font-bold">✕</button>
          </div>
        )}
        {autoImport && (
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded shadow-lg">
            <span>
              {autoImport.applied
                ? `Auto-imported ${autoImport.count} symbol${autoImport.count !== 1 ? 's' : ''} from ${autoImport.volumeName}. Review before printing.`
                : `Found ${autoImport.count} symbol${autoImport.count !== 1 ? 's' : ''} on ${autoImport.volumeName}. Applying replaces the current audiogram.`}
            </span>
            {!autoImport.applied && (
              <button
                type="button"
                onClick={handleApplyAutoImport}
                className="px-2 py-1 text-white bg-blue-600 rounded cursor-pointer hover:bg-blue-700"
              >
                Apply
              </button>
            )}
            <button type="button" onClick={() => setAutoImport(null)} className="font-bold text-blue-600 hover:text-blue-900">✕</button>
          </div>
        )}
        {importError && (
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-red-800 bg-red-100 border border-red-300 rounded shadow-lg">
            <span>Import failed: {importError}</span>
            <button type="button" onClick={() => setImportError(null)} className="text-red-600 hover:text-red-900 font-bold">✕</button>
          </div>
        )}
      </div>
      <ControlPanel
        mode={mode}
        onModeChange={setMode}
        printerName={printerName}
        onPrinterChange={handlePrinterChange}
        calibration={calibration}
        onCalibrationChange={setCalibration}
        onCalibrationReset={resetCalibration}
        onAlignmentTest={handleAlignmentTest}
        doctorName={doctorName}
        onDoctorChange={handleDoctorChange}
        recentDoctors={recentDoctors}
        onRemoveRecentDoctor={removeRecentDoctor}
        onImportMaico={handleImportMaico}
        onPrint={handlePrint}
        saveState={saveState}
        saveError={saveError}
        onSave={handleSave}
        onOpenRecords={() => setRecordsOpen(true)}
        onReset={handleReset}
      />

      {/* Audiometry Symbol Toolbar */}
      <AudiometryToolbar selectedSymbol={selectedSymbol} onSymbolSelect={setSelectedSymbol} />

      <RecordsDialog
        open={recordsOpen}
        onClose={() => setRecordsOpen(false)}
        currentId={recordId}
        onOpenRecord={handleOpenRecord}
      />

      <div className="flex justify-center print:block">
        {mode === 'preprinted' ? (
          <FormSheet
            value={value}
            onChange={patch}
            selectedSymbol={selectedSymbol}
            mode={mode}
            calibration={calibration}
          />
        ) : (
          <PlainForm value={value} onChange={patch} selectedSymbol={selectedSymbol} />
        )}
      </div>
    </div>
  )
}
