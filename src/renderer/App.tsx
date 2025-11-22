import { useState } from 'react'
import Header from './components/Header'
import AudiogramChart from './components/AudiogramChart'
import TympanometryChart from './components/TympanometryChart'
import SpeechAudiometryTable from './components/SpeechAudiometryTable'
import SymptomsTable from './components/SymptomsTable'
import NotesSection from './components/NotesSection'
import Footer from './components/Footer'

interface FormData {
  patientName: string
  age: string
  date: string
  id: string
  doctor: string
  referredFrom: string
  rightAudiogramData: string
  leftAudiogramData: string
  rightTympData: string
  leftTympData: string
  speechAudiometryData: {
    rightEar: { srt: string; level: string; discrimination: string; maskingSRT: string; maskingDS: string }
    leftEar: { srt: string; level: string; discrimination: string; maskingSRT: string; maskingDS: string }
  }
  symptomsData: any
  tympanometryNotes: string
  audiometryNotes: string
}

export default function App() {
  const [formData, setFormData] = useState<FormData>({
    patientName: '',
    age: '',
    date: new Date().toISOString().split('T')[0],
    id: '',
    doctor: '',
    referredFrom: '',
    rightAudiogramData: '',
    leftAudiogramData: '',
    rightTympData: '',
    leftTympData: '',
    speechAudiometryData: {
      rightEar: { srt: '', level: '', discrimination: '', maskingSRT: '', maskingDS: '' },
      leftEar: { srt: '', level: '', discrimination: '', maskingSRT: '', maskingDS: '' },
    },
    symptomsData: {},
    tympanometryNotes: '',
    audiometryNotes: '',
  })

  const handlePrint = async () => {
    if (window.electronAPI) {
      await window.electronAPI.printForm()
    } else {
      window.print()
    }
  }

  const handleSave = async () => {
    if (window.electronAPI) {
      await window.electronAPI.saveFormData(formData)
    } else {
      console.log('Save data:', formData)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Toolbar - Hidden when printing */}
      <div className="no-print mb-4 flex justify-center gap-4">
        <button
          onClick={handlePrint}
          className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          🖨️ طباعة / Print
        </button>
        <button
          onClick={handleSave}
          className="rounded bg-green-600 px-6 py-2 text-white hover:bg-green-700"
        >
          💾 حفظ / Save
        </button>
      </div>

      {/* A4 Form Container */}
      <div
        className="form-container mx-auto bg-white shadow-lg"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '10mm',
        }}
      >
        <Header formData={formData} setFormData={setFormData} />

        {/* Audiometry Charts Section */}
        <div className="mb-6 mt-6">
          <h2 className="mb-3 text-center text-lg font-bold">وكيل فوناك السويسرية</h2>
          <div className="grid grid-cols-2 gap-4">
            <AudiogramChart
              title="RIGHT"
              data={formData.rightAudiogramData}
              onChange={(data) => setFormData({ ...formData, rightAudiogramData: data })}
            />
            <AudiogramChart
              title="LEFT"
              data={formData.leftAudiogramData}
              onChange={(data) => setFormData({ ...formData, leftAudiogramData: data })}
            />
          </div>
        </div>

        {/* Tympanometry Section */}
        <div className="mb-6">
          <h2 className="mb-3 text-center text-base font-bold">TYMPANOMETRY</h2>
          <div className="grid grid-cols-2 gap-4">
            <TympanometryChart
              title="RT"
              data={formData.rightTympData}
              onChange={(data) => setFormData({ ...formData, rightTympData: data })}
            />
            <TympanometryChart
              title="LT"
              data={formData.leftTympData}
              onChange={(data) => setFormData({ ...formData, leftTympData: data })}
            />
          </div>
        </div>

        {/* Speech Audiometry and Symptoms Tables */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <SpeechAudiometryTable
              data={formData.speechAudiometryData}
              onChange={(data) => setFormData({ ...formData, speechAudiometryData: data })}
            />
          </div>
          <div>
            <SymptomsTable
              data={formData.symptomsData}
              onChange={(data) => setFormData({ ...formData, symptomsData: data })}
            />
          </div>
        </div>

        {/* Notes Sections */}
        <NotesSection
          tympanometryNotes={formData.tympanometryNotes}
          audiometryNotes={formData.audiometryNotes}
          onTympanometryChange={(notes) =>
            setFormData({ ...formData, tympanometryNotes: notes })
          }
          onAudiometryChange={(notes) => setFormData({ ...formData, audiometryNotes: notes })}
        />

        {/* Footer */}
        <Footer doctorName={formData.doctor} />
      </div>
    </div>
  )
}
