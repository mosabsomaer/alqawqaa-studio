import { useEffect, useRef, useState } from 'react'
import AudiometryToolbar, { type SymbolType } from './components/AudiometryToolbar'
import { toSheetValue, toStored } from './formMigration'
import PlainForm from './plain/PlainForm'
import CalibrationPanel from './print/CalibrationPanel'
import FormSheet, { type SheetValue } from './print/FormSheet'
import PrintModeSwitch from './print/PrintModeSwitch'
import { migrateSymbols, type PlacedSymbol, serializeSymbols } from './print/panels/AudiogramPanel'
import { usePrintMode } from './print/usePrintMode'

interface ImportedSymbol {
  freq: number
  db: number
  symbolType: string
}

/** Local calendar date, not UTC: after midnight in Libya the two differ. */
function todayISO(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
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
  // Store doctor name separately (persistent across resets)
  const [doctorName, setDoctorName] = useState('د. ')

  // Audiometry symbol selection state
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolType>('ac-right-unmasked')

  const { mode, setMode, calibration, setCalibration, resetCalibration } = usePrintMode()

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

  const handlePrint = async () => {
    if (window.electronAPI) {
      await window.electronAPI.printForm({ mode })
    } else {
      window.print()
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
        await window.electronAPI.printForm({ mode: 'preprinted' })
      } else {
        window.print()
      }
    } finally {
      delete document.body.dataset.alignmentTest
      document.body.dataset.printMode = mode
    }
  }

  const handleSave = async () => {
    const record = toStored(valueRef.current)
    if (window.electronAPI) {
      await window.electronAPI.saveFormData(record)
    } else {
      console.log('Save data:', record)
    }
  }

  const handleReset = () => {
    setValue(getInitialValue())
    setImportBanner(null)
    setImportError(null)
    setAutoImport(null)
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

  const handleApplyAutoImport = () => {
    if (!autoImport) return
    applyImportedSymbols(autoImport.data)
    setAutoImport({ ...autoImport, applied: true })
  }

  return (
    <div className="p-2 bg-gray-100 ">
      {/* Fixed bottom-right toasts, no layout shift */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 no-print">
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
            className="flex items-center gap-2 px-5 py-2 text-white transition-all bg-blue-600 border border-blue-700 rounded shadow-sm cursor-pointer hover:bg-blue-700 hover:shadow"
          >
            <svg className="size-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Maico
          </button>
          {/* Doctor Name Input */}
          <label htmlFor="doctor-name" className="my-auto text-sm font-bold">اسم الطبيب:</label>
          <input
            id="doctor-name"
            type="text"
            value={doctorName}
            onChange={e => {
              setDoctorName(e.target.value)
              patch({ doctor: e.target.value })
            }}
            className="w-64 px-3 py-1 text-right border border-gray-300 rounded"
            placeholder="د. "
          />
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-gray-700 transition-all bg-white border border-gray-300 rounded shadow-sm cursor-pointer hover:bg-gray-50 hover:shadow"
          >
            <svg className="size-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-gray-700 transition-all bg-white border border-gray-300 rounded shadow-sm cursor-pointer hover:bg-gray-50 hover:shadow"
          >
            <svg className="size-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            حفظ
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2 text-gray-700 transition-all bg-white border border-gray-300 rounded shadow-sm cursor-pointer hover:bg-gray-50 hover:shadow"
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
