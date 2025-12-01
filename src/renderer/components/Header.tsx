import clinicLogo from '../../../resources/clinic-logo.png'

interface HeaderProps {
  formData: {
    patientName: string
    age: string
    date: string
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
    <div className="pb-4 mb-6 border-b-2 border-black">
      {/* Top row: Logo and Patient Info */}
      <div className="flex items-start justify-between">
        {/* Patient Info Section (Right in RTL) */}
        <div className="flex-1" dir="rtl">
          {/* First Row */}
          <div className="flex items-center gap-4 mb-2 text-sm">
            <div className="flex items-center flex-1 gap-2">
              <label className="font-bold">الاسم:</label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) => handleChange('patientName', e.target.value)}
                className="flex-1 px-1 text-right bg-transparent border-b border-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold">العمر:</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                className="w-16 px-1 text-right bg-transparent border-b border-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold">التاريخ:</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="px-1 bg-transparent border-b border-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Second Row */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center flex-1 gap-2">
              <label className="font-bold">الطبيب الفاحص:</label>
              <input
                type="text"
                value={formData.doctor}
                onChange={(e) => handleChange('doctor', e.target.value)}
                className="flex-1 px-1 text-right bg-transparent border-b border-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center flex-1 gap-2">
              <label className="font-bold">محول من:</label>
              <input
                type="text"
                value={formData.referredFrom}
                onChange={(e) => handleChange('referredFrom', e.target.value)}
                className="flex-1 px-1 text-right bg-transparent border-b border-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Logo Section (Left in RTL) */}
        <div className="flex flex-col items-center ml-4" style={{ minWidth: '180px' }}>
          <img
            src={clinicLogo}
            alt="Clinic Logo"
            className="object-contain mb-2 h-25"
            style={{ maxWidth: '200px' }}
            onError={(e) => {
              // Fallback if image not found
              e.currentTarget.style.display = 'none'
              const fallback = document.createElement('div')
              fallback.className = 'flex items-center justify-center px-4 py-2 mb-2 text-xs bg-gray-100 border-2 border-black'
              fallback.innerHTML = '<span>CLINIC LOGO</span>'
              e.currentTarget.parentElement?.insertBefore(fallback, e.currentTarget)
            }}
          />
        </div>
      </div>
    </div>
  )
}
