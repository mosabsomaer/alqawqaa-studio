interface HeaderProps {
  formData: {
    patientName: string
    age: string
    date: string
    id: string
    doctor: string
    referredFrom: string
  }
  setFormData: (data: any) => void
}

export default function Header({ formData, setFormData }: HeaderProps) {
  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <div className="mb-6 border-b-2 border-black pb-4">
      {/* Top row: Logo and Patient Info */}
      <div className="flex items-start justify-between">
        {/* Logo Section (Left) */}
        <div className="flex flex-col items-center" style={{ width: '150px' }}>
          <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full border-2 border-black bg-gray-100">
            {/* Placeholder for logo - replace with actual logo */}
            <span className="text-xs">LOGO</span>
          </div>
          <div className="text-center text-xs">
            <p className="font-bold">شركة السلسبيل</p>
            <p className="text-[10px]">عيادة القويعة</p>
            <p className="text-[10px]">للسمع والنطق والكلام والأذن والحنجرة</p>
            <p className="text-[10px]">1998</p>
          </div>
        </div>

        {/* Patient Info Section (Right) */}
        <div className="flex-1" dir="rtl">
          {/* First Row */}
          <div className="mb-2 flex items-center gap-4 text-sm">
            <div className="flex flex-1 items-center gap-2">
              <label className="font-bold">الاسم:</label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) => handleChange('patientName', e.target.value)}
                className="flex-1 border-b border-gray-400 bg-transparent px-1 text-right focus:border-blue-500 focus:outline-none"
                placeholder="اسم المريض"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold">العمر:</label>
              <input
                type="text"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                className="w-16 border-b border-gray-400 bg-transparent px-1 text-right focus:border-blue-500 focus:outline-none"
                placeholder="العمر"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold">التاريخ:</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="border-b border-gray-400 bg-transparent px-1 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold">ID:</label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => handleChange('id', e.target.value)}
                className="w-24 border-b border-gray-400 bg-transparent px-1 text-right focus:border-blue-500 focus:outline-none"
                placeholder="رقم الهوية"
              />
            </div>
          </div>

          {/* Second Row */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex flex-1 items-center gap-2">
              <label className="font-bold">الطبيب الفاحص:</label>
              <input
                type="text"
                value={formData.doctor}
                onChange={(e) => handleChange('doctor', e.target.value)}
                className="flex-1 border-b border-gray-400 bg-transparent px-1 text-right focus:border-blue-500 focus:outline-none"
                placeholder="اسم الطبيب"
              />
            </div>

            <div className="flex flex-1 items-center gap-2">
              <label className="font-bold">محول من:</label>
              <input
                type="text"
                value={formData.referredFrom}
                onChange={(e) => handleChange('referredFrom', e.target.value)}
                className="flex-1 border-b border-gray-400 bg-transparent px-1 text-right focus:border-blue-500 focus:outline-none"
                placeholder="الجهة المحولة"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
