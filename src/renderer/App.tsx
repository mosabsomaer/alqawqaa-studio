import { useState } from 'react'
import AudiogramChart from './components/AudiogramChart'
import AudiometryToolbar, { type SymbolType } from './components/AudiometryToolbar'
import Footer from './components/Footer'
import Header from './components/Header'
import SpeechAudiometryTable from './components/SpeechAudiometryTable'
import SymptomsTable from './components/SymptomsTable'
import TympanometryChart from './components/TympanometryChart'

interface FormData {
  patientName: string
  age: string
  date: string
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
  // Store doctor name separately (persistent across resets)
  const [doctorName, setDoctorName] = useState('د. ')

  // Audiometry symbol selection state
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolType>('ac-right-unmasked')

  const getInitialFormData = (): FormData => ({
    patientName: '',
    age: '',
    date: new Date().toISOString().split('T')[0],
    doctor: doctorName,
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

  const [formData, setFormData] = useState<FormData>(getInitialFormData())

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

  const handleReset = () => {
    // Reset form but keep doctor name
    setFormData(getInitialFormData())
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      {/* Toolbar - Hidden when printing */}
      <div className="mb-4 no-print">


        {/* Action Buttons */}
        <div className="flex justify-center gap-3">
        {/* Doctor Name Input */}
            <label className="my-auto text-sm font-bold">اسم الطبيب:</label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => {
                setDoctorName(e.target.value)
                setFormData({ ...formData, doctor: e.target.value })
              }}
              className="w-64 px-3 py-1 text-right border border-gray-300 rounded"
              placeholder="د. "
            />
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-gray-700 transition-all bg-white border border-gray-300 rounded shadow-sm cursor-pointer hover:bg-gray-50 hover:shadow"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-gray-700 transition-all bg-white border border-gray-300 rounded shadow-sm cursor-pointer hover:bg-gray-50 hover:shadow"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            حفظ
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2 text-gray-700 transition-all bg-white border border-gray-300 rounded shadow-sm cursor-pointer hover:bg-gray-50 hover:shadow"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            إعادة تعيين
          </button>
        </div>
      </div>
        {/* Audiometry Symbol Toolbar */}
        <AudiometryToolbar
          selectedSymbol={selectedSymbol}
          onSymbolSelect={setSelectedSymbol}
        />
      {/* A4 Form Container */}
      <div
        className="mx-auto bg-white shadow-lg form-container"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '10mm',
        }}
      >
        <Header formData={formData} setFormData={setFormData} />

        {/* Audiometry Charts Section */}
        <div className="mt-6 mb-6">
          <h2 className="mb-3 text-lg font-bold text-center">وكيل فوناك السويسرية</h2>
          <div className="grid grid-cols-2 gap-4">
            <AudiogramChart
              title="RIGHT"
              data={formData.rightAudiogramData}
              onChange={(data) => setFormData({ ...formData, rightAudiogramData: data })}
              selectedSymbol={selectedSymbol}
              isRightEar={true}
            />
            <AudiogramChart
              title="LEFT"
              data={formData.leftAudiogramData}
              onChange={(data) => setFormData({ ...formData, leftAudiogramData: data })}
              selectedSymbol={selectedSymbol}
              isRightEar={false}
            />
          </div>
        </div>

        {/* Tympanometry Charts Section */}
        <div className="mb-6">
          <h2 className="mb-3 text-base font-bold text-center">TYMPANOMETRY</h2>
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="col-span-2 space-y-4">
            <SpeechAudiometryTable
              data={formData.speechAudiometryData}
              onChange={(data) => setFormData({ ...formData, speechAudiometryData: data })}
            />
            {/* Tympanometry Notes */}
            <div className="border border-gray-800">
              <div className="flex items-center pr-2 border-b border-gray-400 h-29">
                <label className="text-sm font-bold">TYMPANOMETRY:</label>
                <textarea
                  value={formData.tympanometryNotes}
                  onChange={(e) => setFormData({ ...formData, tympanometryNotes: e.target.value })}
                  className="flex-1 pr-2 ml-2 text-sm bg-transparent border-none resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                  rows={3}
                  placeholder="ملاحظات القياس الطبي"
                />
              </div>
            </div>
          </div>
          <div>
            <SymptomsTable
              data={formData.symptomsData}
              onChange={(data) => setFormData({ ...formData, symptomsData: data })}
            />
          </div>
        </div>

        {/* Audiometry Notes */}
        <div className="mb-6 border border-gray-800">
          <div className="flex items-center px-3 py-1 border-b border-gray-400">
            <label className="text-sm font-bold">AUDIOMETRY:</label>
            <textarea
              value={formData.audiometryNotes}
              onChange={(e) => setFormData({ ...formData, audiometryNotes: e.target.value })}
              className="flex-1 px-2 ml-2 text-sm bg-transparent border-none resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              rows={3}
              placeholder="ملاحظات قياس السمع"
            />
          </div>
        </div>

        {/* Footer */}
        <Footer doctorName={doctorName} />
      </div>
    </div>
  )
}
