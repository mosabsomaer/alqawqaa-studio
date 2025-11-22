interface SymptomsTableProps {
  data: any
  onChange: (data: any) => void
}

export default function SymptomsTable({ data, onChange }: SymptomsTableProps) {
  const symptoms = [
    { label: 'H/loss', key: 'hloss' },
    { label: 'tinnitus', key: 'tinnitus' },
    { label: 'otalgia', key: 'otalgia' },
    { label: 'discharge', key: 'discharge' },
    { label: 'Facial pal', key: 'facialPal' },
    { label: 'Vertigo', key: 'vertigo' },
    { label: 'Noise Exp', key: 'noiseExp' },
    { label: 'Family His', key: 'familyHis' },
  ]

  const handleCheck = (symptom: string, side: string) => {
    onChange({
      ...data,
      [symptom]: {
        ...data[symptom],
        [side]: !data[symptom]?.[side],
      },
    })
  }

  return (
    <div className="border border-gray-800">
      <div className="border-b border-gray-800 bg-gray-100 py-1 text-center text-sm font-bold">
        C/O
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-50">
            <th className="border-r border-gray-800 px-2 py-1"></th>
            <th className="border-r border-gray-800 px-1 py-1 text-center">RT</th>
            <th className="border-r border-gray-800 px-1 py-1 text-center">LT</th>
            <th className="px-1 py-1 text-center">D</th>
          </tr>
        </thead>
        <tbody>
          {symptoms.map((symptom) => (
            <tr key={symptom.key} className="border-b border-gray-400">
              <td className="border-r border-gray-800 px-2 py-1 text-[11px]">{symptom.label}</td>
              <td className="border-r border-gray-800 px-1 py-1 text-center">
                <input
                  type="checkbox"
                  checked={data[symptom.key]?.RT || false}
                  onChange={() => handleCheck(symptom.key, 'RT')}
                  className="h-3 w-3"
                />
              </td>
              <td className="border-r border-gray-800 px-1 py-1 text-center">
                <input
                  type="checkbox"
                  checked={data[symptom.key]?.LT || false}
                  onChange={() => handleCheck(symptom.key, 'LT')}
                  className="h-3 w-3"
                />
              </td>
              <td className="px-1 py-1 text-center">
                <input
                  type="checkbox"
                  checked={data[symptom.key]?.D || false}
                  onChange={() => handleCheck(symptom.key, 'D')}
                  className="h-3 w-3"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Test Reliability */}
      <div className="border-t border-gray-800 p-2">
        <div className="mb-1 text-[11px] font-bold">Test<br/>Reliability</div>
        <div className="flex gap-2 text-[10px]">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="reliability"
              value="good"
              checked={data.reliability === 'good'}
              onChange={(e) => onChange({ ...data, reliability: e.target.value })}
              className="h-3 w-3"
            />
            good
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="reliability"
              value="fair"
              checked={data.reliability === 'fair'}
              onChange={(e) => onChange({ ...data, reliability: e.target.value })}
              className="h-3 w-3"
            />
            fair
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="reliability"
              value="bad"
              checked={data.reliability === 'bad'}
              onChange={(e) => onChange({ ...data, reliability: e.target.value })}
              className="h-3 w-3"
            />
            bad
          </label>
        </div>
      </div>
    </div>
  )
}
