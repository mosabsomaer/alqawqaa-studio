import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_CALIBRATION, type Calibration, type PrintMode } from './formSpec'

const MODE_KEY = 'alqawqaa.printMode'
const CALIBRATION_KEY = 'alqawqaa.calibration.v2'

/**
 * Calibration is a property of the physical printer and its paper tray, not of
 * the patient or the form, so it lives on the machine rather than in the record.
 */
function readCalibration(): Calibration {
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY)
    if (!raw) return DEFAULT_CALIBRATION
    const parsed = JSON.parse(raw)
    return {
      offsetX: Number(parsed.offsetX) || 0,
      offsetY: Number(parsed.offsetY) || 0,
      scale: Number(parsed.scale) || 1,
    }
  } catch {
    return DEFAULT_CALIBRATION
  }
}

function readMode(): PrintMode {
  return localStorage.getItem(MODE_KEY) === 'preprinted' ? 'preprinted' : 'plain'
}

export function usePrintMode() {
  const [mode, setModeState] = useState<PrintMode>(readMode)
  const [calibration, setCalibrationState] = useState<Calibration>(readCalibration)

  // The print stylesheet keys off this attribute, so it has to be on the body
  // rather than on a React-owned node.
  useEffect(() => {
    document.body.dataset.printMode = mode
    localStorage.setItem(MODE_KEY, mode)
  }, [mode])

  useEffect(() => {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibration))
  }, [calibration])

  const setMode = useCallback((next: PrintMode) => setModeState(next), [])

  const setCalibration = useCallback((patch: Partial<Calibration>) => {
    setCalibrationState(prev => ({ ...prev, ...patch }))
  }, [])

  const resetCalibration = useCallback(() => setCalibrationState(DEFAULT_CALIBRATION), [])

  return { mode, setMode, calibration, setCalibration, resetCalibration }
}
