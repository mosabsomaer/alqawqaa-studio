interface SpeechAudiometryData {
  rightEar: {
    srt: string
    level: string
    discrimination: string
    maskingSRT: string
    maskingDS: string
  }
  leftEar: {
    srt: string
    level: string
    discrimination: string
    maskingSRT: string
    maskingDS: string
  }
}

interface SpeechAudiometryTableProps {
  data: SpeechAudiometryData
  onChange: (data: SpeechAudiometryData) => void
}

export default function SpeechAudiometryTable({ data, onChange }: SpeechAudiometryTableProps) {
  const handleChange = (ear: 'rightEar' | 'leftEar', field: string, value: string) => {
    onChange({
      ...data,
      [ear]: {
        ...data[ear],
        [field]: value,
      },
    })
  }

  return (
    <div className="border border-gray-800">
      <h3 className="border-b border-gray-800 bg-gray-100 py-0.5 text-center text-xs font-bold">
        Speech Audiometry
      </h3>

      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-50">
            <th className="border-r border-gray-800 px-1 py-0.5 text-center">Ear</th>
            <th className="border-r border-gray-800 px-1 py-0.5 text-center">SRT/SDT</th>
            <th className="border-r border-gray-800 px-1 py-0.5 text-center">Level</th>
            <th className="border-r border-gray-800 px-1 py-0.5 text-center">Discrim %</th>
            <th className="border-r border-gray-800 px-1 py-0.5 text-center" colSpan={2}>
              Masking
            </th>
          </tr>
          <tr className="border-b border-gray-800 bg-gray-50">
            <th className="border-r border-gray-800"></th>
            <th className="border-r border-gray-800"></th>
            <th className="border-r border-gray-800"></th>
            <th className="border-r border-gray-800"></th>
            <th className="border-r border-gray-800 px-1 py-0.5 text-center text-[9px]">SRT</th>
            <th className="px-1 py-0.5 text-center text-[9px]">DS</th>
          </tr>
        </thead>
        <tbody>
          {/* Right Ear */}
          <tr className="border-b border-gray-800">
            <td className="border-r border-gray-800 px-1 py-0.5 font-semibold">Right Ear</td>
            <td className="border-r border-gray-800 px-1 py-0.5">
              <input
                type="text"
                value={data.rightEar.srt}
                onChange={(e) => handleChange('rightEar', 'srt', e.target.value)}
                className="w-full border-none bg-transparent px-1 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </td>
            <td className="border-r border-gray-800 px-1 py-0.5">
              <input
                type="text"
                value={data.rightEar.level}
                onChange={(e) => handleChange('rightEar', 'level', e.target.value)}
                className="w-full border-none bg-transparent px-1 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </td>
            <td className="border-r border-gray-800 px-1 py-0.5">
              <input
                type="text"
                value={data.rightEar.discrimination}
                onChange={(e) => handleChange('rightEar', 'discrimination', e.target.value)}
                className="w-full border-none bg-transparent px-1 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </td>
            <td className="border-r border-gray-800 px-1 py-0.5">
              <input
                type="text"
                value={data.rightEar.maskingSRT}
                onChange={(e) => handleChange('rightEar', 'maskingSRT', e.target.value)}
                className="w-full border-none bg-transparent px-1 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </td>
            <td className="px-1 py-0.5">
              <input
                type="text"
                value={data.rightEar.maskingDS}
                onChange={(e) => handleChange('rightEar', 'maskingDS', e.target.value)}
                className="w-full border-none bg-transparent px-1 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </td>
          </tr>

          {/* Left Ear */}
          <tr>
            <td className="border-r border-gray-800 px-1 py-0.5 font-semibold">Left Ear</td>
            <td className="border-r border-gray-800 px-1 py-0.5">
              <input
                type="text"
                value={data.leftEar.srt}
                onChange={(e) => handleChange('leftEar', 'srt', e.target.value)}
                className="w-full border-none bg-transparent px-1 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </td>
            <td className="border-r border-gray-800 px-1 py-0.5">
              <input
                type="text"
                value={data.leftEar.level}
                onChange={(e) => handleChange('leftEar', 'level', e.target.value)}
                className="w-full border-none bg-transparent px-1 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </td>
            <td className="border-r border-gray-800 px-1 py-0.5">
              <input
                type="text"
                value={data.leftEar.discrimination}
                onChange={(e) => handleChange('leftEar', 'discrimination', e.target.value)}
                className="w-full border-none bg-transparent px-1 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </td>
            <td className="border-r border-gray-800 px-1 py-0.5">
              <input
                type="text"
                value={data.leftEar.maskingSRT}
                onChange={(e) => handleChange('leftEar', 'maskingSRT', e.target.value)}
                className="w-full border-none bg-transparent px-1 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </td>
            <td className="px-1 py-0.5">
              <input
                type="text"
                value={data.leftEar.maskingDS}
                onChange={(e) => handleChange('leftEar', 'maskingDS', e.target.value)}
                className="w-full border-none bg-transparent px-1 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
