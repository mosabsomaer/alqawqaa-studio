interface NotesSectionProps {
  tympanometryNotes: string
  audiometryNotes: string
  onTympanometryChange: (notes: string) => void
  onAudiometryChange: (notes: string) => void
}

export default function NotesSection({
  tympanometryNotes,
  audiometryNotes,
  onTympanometryChange,
  onAudiometryChange,
}: NotesSectionProps) {
  return (
    <div className="mb-6 space-y-3">
      {/* Tympanometry Notes */}
      <div className="border border-gray-800">
        <div className="flex items-center border-b border-gray-400 px-3 py-1">
          <label className="text-sm font-bold">TYMPANOMETRY:</label>
          <input
            type="text"
            value={tympanometryNotes}
            onChange={(e) => onTympanometryChange(e.target.value)}
            className="ml-2 flex-1 border-none bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="ملاحظات القياس الطبلي"
          />
        </div>
      </div>

      {/* Audiometry Notes */}
      <div className="border border-gray-800">
        <div className="flex items-center border-b border-gray-400 px-3 py-1">
          <label className="text-sm font-bold">AUDIOMETRY:</label>
          <textarea
            value={audiometryNotes}
            onChange={(e) => onAudiometryChange(e.target.value)}
            className="ml-2 flex-1 resize-none border-none bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            rows={3}
            placeholder="ملاحظات قياس السمع"
          />
        </div>
      </div>
    </div>
  )
}
