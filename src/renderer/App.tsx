import { useEffect, useMemo, useRef, useState } from 'react'
import AudiometryToolbar, { type SymbolType } from './components/AudiometryToolbar'
import DoctorNameInput from './components/DoctorNameInput'
import SplitButton from './components/SplitButton'
import { todayISO } from './dates'
import { toSheetValue, toStored } from './formMigration'
import PlainForm from './plain/PlainForm'
import CalibrationPanel from './print/CalibrationPanel'
import FormSheet, { type SheetValue } from './print/FormSheet'
import PrinterSelect from './print/PrinterSelect'
import PrintModeSwitch from './print/PrintModeSwitch'
import RecordsDialog from './records/RecordsDialog'
import SaveButton, { type SaveState } from './records/SaveButton'
import { testsClient } from './records/client'
import { TOOLBAR_BUTTON, TOOLBAR_BUTTON_PRIMARY } from './ui/buttons'
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

  // Ctrl+S is what every Windows user reaches for first. The handler goes
  // through a ref so the listener subscribes once instead of on every keystroke.
  const saveShortcut = useRef<() => void>(() => {})
  useEffect(() => {
    saveShortcut.current = () => {
      if (dirty) void handleSave()
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveShortcut.current()
      }
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
      {/* Toolbar - Hidden when printing */}
      <div className="mb-4 no-print">
        <div className="flex flex-wrap items-start justify-center gap-3">
          <PrintModeSwitch mode={mode} onChange={setMode} />
          <PrinterSelect printerName={printerName} onChange={handlePrinterChange} />
          {/* Calibration registers ink against pre-printed stock; plain paper has
              nothing to register against. */}
          {mode === 'preprinted' && (
            <CalibrationPanel
              calibration={calibration}
              onChange={setCalibration}
              onReset={resetCalibration}
              onAlignmentTest={handleAlignmentTest}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
          <button
            type="button"
            onClick={handleImportMaico}
            className={TOOLBAR_BUTTON_PRIMARY}
          >
            <svg className="size-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Maico
          </button>
          {/* Doctor Name Input */}
          <label htmlFor="doctor-name" className="my-auto text-sm font-bold">اسم الطبيب:</label>
          <DoctorNameInput
            value={doctorName}
            onChange={handleDoctorChange}
            recents={recentDoctors}
            onRemoveRecent={removeRecentDoctor}
          />
          <SplitButton
            label="طباعة"
            icon={
              <svg className="size-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            }
            onClick={() => handlePrint()}
            menu={[{ label: 'فتح نافذة الطباعة (تخصيص)…', onSelect: () => handlePrint(true) }]}
          />
          <SaveButton state={saveState} onSave={handleSave} errorMessage={saveError} />
          <button
            type="button"
            onClick={() => setRecordsOpen(true)}
            title="الفحوصات المحفوظة"
            className={TOOLBAR_BUTTON}
          >
            <svg className="size-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            السجلات
          </button>
          <button
            type="button"
            onClick={handleReset}
            className={TOOLBAR_BUTTON}
          >
            <svg className="size-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            إعادة تعيين
          </button>
        </div>
      </div>

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
