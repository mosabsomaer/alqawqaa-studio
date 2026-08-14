/**
 * The original A4 form, printed whole on white paper.
 *
 * The layout is the one the clinic used before the pre-printed sheet existed;
 * the components under ../components are unchanged, so everything here is the
 * boundary between them and the shared store (see adapters.ts).
 */
import AudiogramChart from '../components/AudiogramChart'
import type { SymbolType } from '../components/AudiometryToolbar'
import Header from '../components/Header'
import SpeechAudiometryTable from '../components/SpeechAudiometryTable'
import SymptomsTable from '../components/SymptomsTable'
import TympanometryChart from '../components/TympanometryChart'
import type { SheetValue } from '../print/FormSheet'
import {
  audiogramFromPlain,
  audiogramToPlain,
  type PlainSpeechData,
  speechFromPlain,
  speechToPlain,
  tympanogramFromPlain,
  tympanogramToPlain,
} from './adapters'

export interface PlainFormProps {
  value: SheetValue
  onChange: (patch: Partial<SheetValue>) => void
  selectedSymbol: SymbolType
}

export default function PlainForm({ value, onChange, selectedSymbol }: PlainFormProps) {
  const headerData = {
    patientName: value.patientName,
    age: value.age,
    date: value.date,
    doctor: value.doctor,
    referredFrom: value.referredFrom,
  }

  const setHeader = (next: typeof headerData) => onChange(next)

  const setSpeech = (data: PlainSpeechData) => onChange(speechFromPlain(data, value))

  return (
    <div
      className="mx-auto bg-white shadow-lg form-container"
      style={{
        width: '210mm',
        height: '280mm',
        padding: '5mm',
      }}
    >
      <Header formData={headerData} setFormData={setHeader} />

      {/* Audiometry Charts Section */}
      <div className="mb-4">
        <h1 className="mb-1 text-base font-bold text-center">Audiometry</h1>
        <div className="grid grid-cols-2 gap-4">
          <AudiogramChart
            title="RIGHT"
            data={audiogramToPlain(value.rightAudiogram)}
            onChange={data =>
              onChange({ rightAudiogram: audiogramFromPlain(data, value.rightAudiogram) })
            }
            selectedSymbol={selectedSymbol}
            isRightEar={true}
          />
          <AudiogramChart
            title="LEFT"
            data={audiogramToPlain(value.leftAudiogram)}
            onChange={data =>
              onChange({ leftAudiogram: audiogramFromPlain(data, value.leftAudiogram) })
            }
            selectedSymbol={selectedSymbol}
            isRightEar={false}
          />
        </div>
      </div>

      {/* Tympanometry Charts Section */}
      <div className="mb-6">
        <h2 className="mb-1 text-base font-bold text-center">Tympanometry</h2>
        <div className="grid grid-cols-2 gap-4">
          <TympanometryChart
            title="RT"
            data={tympanogramToPlain(value.rightTympanogram)}
            onChange={data => onChange({ rightTympanogram: tympanogramFromPlain(data) })}
          />
          <TympanometryChart
            title="LT"
            data={tympanogramToPlain(value.leftTympanogram)}
            onChange={data => onChange({ leftTympanogram: tympanogramFromPlain(data) })}
          />
        </div>
      </div>

      {/* Speech Audiometry and Symptoms Tables */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="col-span-2 space-y-2">
          <SpeechAudiometryTable data={speechToPlain(value)} onChange={setSpeech} />
          {/* Tympanometry Notes */}
          <div className="border border-gray-800">
            <div className="flex p-2">
              <label htmlFor="plain-tymp-notes" className="text-xs font-bold">
                TYMPANOMETRY:
              </label>
              <textarea
                id="plain-tymp-notes"
                value={value.tympanometryNotes}
                onChange={e => onChange({ tympanometryNotes: e.target.value })}
                className="flex-1 pr-2 ml-2 text-xs bg-transparent border-none resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                rows={4}
                placeholder="ملاحظات القياس الطبي"
              />
            </div>
          </div>
        </div>
        <div>
          <SymptomsTable data={value.symptoms} onChange={symptoms => onChange({ symptoms })} />
        </div>
      </div>

      {/* Audiometry Notes */}
      <div className="mb-4 border border-gray-800">
        <div className="flex p-2">
          <label htmlFor="plain-audio-notes" className="text-xs font-bold">
            AUDIOMETRY:
          </label>
          <textarea
            id="plain-audio-notes"
            value={value.audiometryNotes}
            onChange={e => onChange({ audiometryNotes: e.target.value })}
            className="flex-1 px-2 ml-2 text-xs bg-transparent border-none resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            rows={4}
            placeholder="ملاحظات قياس السمع"
          />
        </div>
      </div>

      {/* Footer with address */}
      <div className="mt-3 text-center border-gray-400">
        <p className="text-xs text-gray-700" dir="rtl">
          الحدائق - مجمع نادي خالد بن الوليد - الدور الأول - مقابل مستشفى الصفوة وصيدلية شلوف
        </p>
        <p className="text-xs font-bold text-gray-800" dir="ltr">
          091 657 7507 - 091 921 6936
        </p>
      </div>
    </div>
  )
}
