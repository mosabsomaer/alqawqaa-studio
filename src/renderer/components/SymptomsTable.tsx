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

  const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center justify-center w-3 h-3 border border-gray-600 bg-white cursor-pointer"
    >
      {checked && <span className="text-[8px] leading-none">&#10003;</span>}
    </button>
  )

  return (
    <div className="border border-gray-800">
      <div className="border-b border-gray-800 bg-gray-100 py-0.5 text-center text-xs font-bold">
        C/O
      </div>

      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-50">
            <th className="border-r border-gray-800 px-1 py-0.5"></th>
            <th className="border-r border-gray-800 px-1 py-0.5 text-center">RT</th>
            <th className="border-r border-gray-800 px-1 py-0.5 text-center">LT</th>
            <th className="px-1 py-0.5 text-center">D</th>
          </tr>
        </thead>
        <tbody>
          {symptoms.map((symptom) => (
            <tr key={symptom.key} className="border-b border-gray-400">
              <td className="border-r border-gray-800 px-1 py-0.5 text-[10px]">{symptom.label}</td>
              <td className="border-r border-gray-800 px-1 py-0.5">
                <div className="flex justify-center">
                  <Checkbox
                    checked={data[symptom.key]?.RT || false}
                    onChange={() => handleCheck(symptom.key, 'RT')}
                  />
                </div>
              </td>
              <td className="border-r border-gray-800 px-1 py-0.5">
                <div className="flex justify-center">
                  <Checkbox
                    checked={data[symptom.key]?.LT || false}
                    onChange={() => handleCheck(symptom.key, 'LT')}
                  />
                </div>
              </td>
              <td className="px-1 py-0.5">
                <div className="flex justify-center">
                  <Checkbox
                    checked={data[symptom.key]?.D || false}
                    onChange={() => handleCheck(symptom.key, 'D')}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Test Reliability - single line */}
      <div className="border-t border-gray-800 px-1 py-0.5 flex items-center gap-2 text-[10px]">
        <span className="font-bold">Test Reliability:</span>
        <label className="flex items-center gap-0.5">
          <input
            type="radio"
            name="reliability"
            value="good"
            checked={data.reliability === 'good'}
            onChange={(e) => onChange({ ...data, reliability: e.target.value })}
            className="h-2.5 w-2.5"
          />
          good
        </label>
        <label className="flex items-center gap-0.5">
          <input
            type="radio"
            name="reliability"
            value="fair"
            checked={data.reliability === 'fair'}
            onChange={(e) => onChange({ ...data, reliability: e.target.value })}
            className="h-2.5 w-2.5"
          />
          fair
        </label>
        <label className="flex items-center gap-0.5">
          <input
            type="radio"
            name="reliability"
            value="bad"
            checked={data.reliability === 'bad'}
            onChange={(e) => onChange({ ...data, reliability: e.target.value })}
            className="h-2.5 w-2.5"
          />
          bad
        </label>
      </div>
    </div>
  )
}
