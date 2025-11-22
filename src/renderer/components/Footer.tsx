interface FooterProps {
  doctorName: string
}

export default function Footer({ doctorName }: FooterProps) {
  return (
    <div className="mt-8 flex items-end justify-between border-t-2 border-gray-400 pt-4">
      {/* Signature (Right side in RTL) */}
      <div className="text-right" dir="rtl">
        <div className="mb-2 text-sm font-bold">التوقيع:</div>
        <div className="h-12 w-48 border-b border-gray-400"></div>
      </div>

      {/* Doctor Name (Left side in RTL) */}
      <div className="text-right" dir="rtl">
        <div className="mb-2 text-sm font-bold">الطبيب:</div>
        <div className="border-b border-gray-400 px-2 pb-1 text-sm">{doctorName || '_____________________'}</div>
      </div>
    </div>
  )
}
