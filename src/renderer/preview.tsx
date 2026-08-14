/**
 * Renders the template chrome alone at the exact pixel size of the 300dpi
 * reference scan, so a headless screenshot can be diffed against the real sheet.
 * Not part of the shipped app.
 */
import { createRoot } from 'react-dom/client'
import { AudiogramChrome } from './print/panels/AudiogramPanel'
import { HeaderChrome } from './print/panels/HeaderPanel'
import { MeasurementsChrome } from './print/panels/MeasurementsPanel'
import { NotesChrome } from './print/panels/NotesPanel'
import { SymptomsChrome } from './print/panels/SymptomsPanel'
import { TympanometryChrome } from './print/panels/TympanometryPanel'
import './index.css'

const SCAN_W = 2479
const SCAN_H = 3507

function Preview() {
  return (
    <svg width={SCAN_W} height={SCAN_H} viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg">
      <rect x={0} y={0} width={210} height={297} fill="#ffffff" />
      <g className="template-chrome">
        <HeaderChrome />
        <AudiogramChrome />
        <TympanometryChrome />
        <MeasurementsChrome />
        <SymptomsChrome />
        <NotesChrome />
      </g>
    </svg>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
