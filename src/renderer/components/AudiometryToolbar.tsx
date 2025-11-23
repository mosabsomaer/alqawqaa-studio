export type SymbolType =
  | 'ac-right-unmasked'    // O - Red circle
  | 'ac-right-masked'      // Δ - Red triangle
  | 'ac-left-unmasked'     // X - Blue X
  | 'ac-left-masked'       // □ - Blue square
  | 'bc-right-unmasked'    // < - Red left arrow
  | 'bc-right-masked'      // [ - Red left bracket
  | 'bc-left-unmasked'     // > - Blue right arrow
  | 'bc-left-masked'       // ] - Blue right bracket
  | 'nr-right'             // O↓ - Red circle with down arrow
  | 'nr-left'              // X↓ - Blue X with down arrow
  | 'aided'                // A - Green A
  | 'sound-field'          // S - Orange S

interface AudiometryToolbarProps {
  selectedSymbol: SymbolType
  onSymbolSelect: (symbol: SymbolType) => void
}

const symbolPairs: Array<{
  left: SymbolType
  right: SymbolType
  label: string
  description: string
}> = [
  {
    left: 'ac-left-unmasked',
    right: 'ac-right-unmasked',
    label: 'O/X',
    description: 'Air Conduction Unmasked',
  },
  {
    left: 'ac-left-masked',
    right: 'ac-right-masked',
    label: 'Δ/□',
    description: 'Air Conduction Masked',
  },
  {
    left: 'bc-left-unmasked',
    right: 'bc-right-unmasked',
    label: '</>',
    description: 'Bone Conduction Unmasked',
  },
  {
    left: 'bc-left-masked',
    right: 'bc-right-masked',
    label: '[/]',
    description: 'Bone Conduction Masked',
  },
  {
    left: 'nr-left',
    right: 'nr-right',
    label: 'O↓/X↓',
    description: 'No Response',
  },
]

const singleSymbols: Array<{ type: SymbolType; label: string; color: string; description: string }> = [
  { type: 'aided', label: 'A', color: '#10B981', description: 'Aided Response' },
  { type: 'sound-field', label: 'S', color: '#F59E0B', description: 'Sound Field' },
]

export default function AudiometryToolbar({ selectedSymbol, onSymbolSelect }: AudiometryToolbarProps) {
  return (
    <div className="flex mx-auto flex-row items-center justify-center gap-2 p-3 mb-4 bg-white border border-gray-300 rounded shadow w-[210mm] no-print">
      <span className="mr-2 text-sm font-bold">Symbol:</span>

      {/* Paired symbols */}
      {symbolPairs.map((pair) => {
        const isActive = selectedSymbol === pair.left || selectedSymbol === pair.right
        return (
          <button
            key={pair.label}
            onClick={() => onSymbolSelect(pair.right)} // Default to right ear
            className={`
              relative group px-3 py-2 border-2 cursor-pointer rounded font-bold text-base
              transition-all duration-150
              ${isActive
                ? 'border-blue-600 bg-blue-50 shadow-md scale-105'
                : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow'
              }
            `}
            title={pair.description}
          >
            <span style={{ color: '#EF4444' }}>{pair.label.split('/')[0]}</span>
            <span className="text-gray-400">/</span>
            <span style={{ color: '#3B82F6' }}>{pair.label.split('/')[1]}</span>
            {/* Tooltip */}
            <span className="absolute px-2 py-1 mb-2 text-xs text-white transition-opacity transform -translate-x-1/2 bg-gray-800 rounded opacity-0 pointer-events-none bottom-full left-1/2 whitespace-nowrap group-hover:opacity-100">
              {pair.description}
            </span>
          </button>
        )
      })}

      {/* Single symbols */}
      {singleSymbols.map((symbol) => (
        <button
          key={symbol.type}
          onClick={() => onSymbolSelect(symbol.type)}
          className={`
            relative group px-3 py-2 border-2 rounded font-bold text-lg
            transition-all duration-150
            ${selectedSymbol === symbol.type
              ? 'border-blue-600 bg-blue-50 shadow-md scale-105'
              : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow'
            }
          `}
          style={{ color: symbol.color }}
          title={symbol.description}
        >
          {symbol.label}
          {/* Tooltip */}
          <span className="absolute px-2 py-1 mb-2 text-xs text-white transition-opacity transform -translate-x-1/2 bg-gray-800 rounded opacity-0 pointer-events-none bottom-full left-1/2 whitespace-nowrap group-hover:opacity-100">
            {symbol.description}
          </span>
        </button>
      ))}
    </div>
  )
}
