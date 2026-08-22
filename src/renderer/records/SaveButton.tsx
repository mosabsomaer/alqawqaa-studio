import { BUTTON_BASE } from '../ui/buttons'

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error'

interface SaveButtonProps {
  state: SaveState
  onSave: () => void
  errorMessage?: string | null
}

const SaveIcon = () => (
  <svg className="size-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
    />
  </svg>
)

const CheckIcon = () => (
  <svg className="size-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const Spinner = () => (
  <span className="border-2 border-gray-300 rounded-full size-4 border-t-blue-600 animate-spin" />
)

interface Look {
  className: string
  label: string
  title?: string
  icon: () => React.JSX.Element
  /** Nothing to do in this state, so the button stays out of the tab order. */
  disabled?: boolean
  /** The amber dot that marks unsaved work. */
  dot?: boolean
}

const LOOKS: Record<SaveState, Look> = {
  clean: {
    className: 'text-gray-400 bg-white border-gray-200',
    label: 'حفظ',
    title: 'لا يوجد ما يُحفظ',
    icon: SaveIcon,
    disabled: true,
  },
  dirty: {
    className: 'text-amber-900 bg-amber-50 border-amber-300 cursor-pointer hover:bg-amber-100 hover:shadow',
    label: 'حفظ',
    title: 'حفظ الفحص (Ctrl+S)',
    icon: SaveIcon,
    dot: true,
  },
  saving: {
    className: 'text-gray-500 bg-white border-gray-300',
    label: 'حفظ…',
    icon: Spinner,
    disabled: true,
  },
  saved: {
    className: 'text-green-800 bg-green-50 border-green-300',
    label: 'محفوظ',
    title: 'لا توجد تغييرات غير محفوظة',
    icon: CheckIcon,
    disabled: true,
  },
  error: {
    className: 'text-red-800 bg-red-50 border-red-300 cursor-pointer hover:bg-red-100',
    label: 'فشل الحفظ',
    icon: SaveIcon,
  },
}

/**
 * One button carrying the whole save state, so "did that go through?" never
 * needs a second glance: amber dot means unsaved, green check means stored.
 */
export default function SaveButton({ state, onSave, errorMessage }: SaveButtonProps) {
  const look = LOOKS[state]
  const Icon = look.icon

  return (
    <button
      type="button"
      disabled={look.disabled}
      onClick={look.disabled ? undefined : onSave}
      title={state === 'error' ? (errorMessage ?? look.label) : look.title}
      className={`${BUTTON_BASE} w-28 justify-center ${look.className}`}
    >
      <Icon />
      <span dir="rtl">{look.label}</span>
      {look.dot && <span className="rounded-full size-2 bg-amber-500" title="تغييرات غير محفوظة" />}
    </button>
  )
}
