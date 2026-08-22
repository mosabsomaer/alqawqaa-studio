import DoctorNameInput from './DoctorNameInput'
import SettingsMenu from './SettingsMenu'
import SplitButton from './SplitButton'
import PrintModeSwitch from '../print/PrintModeSwitch'
import SaveButton, { type SaveState } from '../records/SaveButton'
import { TOOLBAR_BUTTON } from '../ui/buttons'
import type { Calibration, PrintMode } from '../print/formSpec'

interface ControlPanelProps {
  mode: PrintMode
  onModeChange: (mode: PrintMode) => void
  printerName: string
  onPrinterChange: (name: string) => void
  calibration: Calibration
  onCalibrationChange: (patch: Partial<Calibration>) => void
  onCalibrationReset: () => void
  onAlignmentTest: () => void
  doctorName: string
  onDoctorChange: (name: string) => void
  recentDoctors: string[]
  onRemoveRecentDoctor: (name: string) => void
  onImportMaico: () => void
  onPrint: (showDialog?: boolean) => void
  saveState: SaveState
  saveError: string | null
  onSave: () => void
  onOpenRecords: () => void
  onReset: () => void
}

const PATH = {
  print:
    'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z',
  records: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  reset:
    'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  import: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
}

const Icon = ({ d, className = 'size-5' }: { d: string; className?: string }) => (
  <svg className={className} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
)

const Divider = () => <span className="w-px h-6 bg-gray-200 shrink-0" />

/** Quiet, icon-first control for things used now and then rather than per patient. */
function GhostButton({
  label,
  path,
  onClick,
  title,
  iconOnly,
}: {
  label: string
  path: string
  onClick: () => void
  title?: string
  /** The tooltip carries the name, for actions whose icon is unambiguous. */
  iconOnly?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-label={label}
      className="flex items-center h-9 gap-2 px-2.5 text-sm text-gray-500 whitespace-nowrap transition-colors rounded cursor-pointer hover:bg-gray-100 hover:text-gray-700"
    >
      <Icon d={path} />
      {!iconOnly && <span dir="rtl">{label}</span>}
    </button>
  )
}

/**
 * Two tiers, ranked by how often a doctor touches them. The top tier is the
 * per-patient work, ending in the one button the whole app exists for; the
 * strip underneath holds what is set once per printer and otherwise ignored.
 */
export default function ControlPanel(props: ControlPanelProps) {
  return (
    <div className="w-[210mm] mx-auto mb-4 bg-white border border-gray-300 rounded shadow no-print">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <label htmlFor="doctor-name" className="text-gray-400 shrink-0" title="اسم الطبيب">
          <Icon d={PATH.user} />
        </label>
        <DoctorNameInput
          value={props.doctorName}
          onChange={props.onDoctorChange}
          recents={props.recentDoctors}
          onRemoveRecent={props.onRemoveRecentDoctor}
        />
        <GhostButton label="السجلات" path={PATH.records} onClick={props.onOpenRecords} title="الفحوصات المحفوظة" />
        <GhostButton
          iconOnly
          label="استيراد تخطيط Maico"
          path={PATH.import}
          onClick={props.onImportMaico}
          title="استيراد تخطيط Maico من ملف. التخطيطات على قرص Maico المتصل تُستورد تلقائيًا."
        />

        <div className="flex items-center gap-2 ms-auto">
          <button type="button" onClick={props.onReset} title="بدء فحص جديد بورقة فارغة" className={TOOLBAR_BUTTON}>
            <Icon d={PATH.reset} />
            <span dir="rtl">فحص جديد</span>
          </button>
          <SaveButton state={props.saveState} onSave={props.onSave} errorMessage={props.saveError} />
          <Divider />
          <SplitButton
            variant="primary"
            label={<span dir="rtl">طباعة</span>}
            title="طباعة الفحص (Ctrl+P)"
            icon={<Icon d={PATH.print} />}
            onClick={() => props.onPrint()}
            menu={[{ label: 'فتح نافذة الطباعة (تخصيص)…', onSelect: () => props.onPrint(true) }]}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-gray-200 rounded-b bg-gray-50">
        <PrintModeSwitch mode={props.mode} onChange={props.onModeChange} />
        <SettingsMenu
          mode={props.mode}
          printerName={props.printerName}
          onPrinterChange={props.onPrinterChange}
          calibration={props.calibration}
          onCalibrationChange={props.onCalibrationChange}
          onCalibrationReset={props.onCalibrationReset}
          onAlignmentTest={props.onAlignmentTest}
        />
      </div>
    </div>
  )
}
