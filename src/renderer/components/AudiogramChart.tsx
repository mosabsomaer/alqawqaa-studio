import { useEffect, useState } from 'react'
import { Layer, Line, Stage, Text } from 'react-konva'
import AudiometrySymbol from './AudiometrySymbol'
import type { SymbolType } from './AudiometryToolbar'

interface AudiogramChartProps {
  title: string
  data: string
  onChange: (data: string) => void
  selectedSymbol: SymbolType
  isRightEar?: boolean
}

interface PlacedSymbol {
  id: string
  x: number
  y: number
  freq: number
  db: number
  symbolType: SymbolType
}

export default function AudiogramChart({ title, data, onChange, selectedSymbol, isRightEar = false }: AudiogramChartProps) {
  const [symbols, setSymbols] = useState<PlacedSymbol[]>([])
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{ freq: number; db: number } | null>(null)

  const frequencies = [0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12]
  const dbLevels = Array.from({ length: 14 }, (_, i) => -10 + i * 10) // -10 to 120

  const width = 370
  const height = 300
  const marginLeft = 50
  const marginTop = 30
  const marginRight = 30
  const marginBottom = 30

  const chartWidth = width - marginLeft - marginRight
  const chartHeight = height - marginTop - marginBottom

  // Load symbols from data on mount
  useEffect(() => {
    if (data && data !== '') {
      try {
        const parsed = JSON.parse(data)
        setSymbols(parsed)
      } catch (e) {
        console.error('Failed to parse audiogram data:', e)
      }
    }
  }, [data])

  // Reset when data prop changes to empty string
  useEffect(() => {
    if (data === '' && symbols.length > 0) {
      setSymbols([])
      setSelectedSymbolId(null)
    }
  }, [data])

  const getX = (freq: number) => {
    const index = frequencies.indexOf(freq)
    return marginLeft + (index / (frequencies.length - 1)) * chartWidth
  }

  const getY = (db: number) => {
    const normalized = (db + 10) / 130 // -10 to 120 range
    return marginTop + normalized * chartHeight
  }

  const getNearestFrequency = (x: number): number => {
    const freqIndex = Math.round(((x - marginLeft) / chartWidth) * (frequencies.length - 1))
    return frequencies[Math.max(0, Math.min(freqIndex, frequencies.length - 1))]
  }

  const getNearestDb = (y: number): number => {
    const dbNormalized = (y - marginTop) / chartHeight
    const db = Math.round((dbNormalized * 130 - 10) / 5) * 5  // Round to nearest 5dB
    return Math.max(-10, Math.min(120, db))
  }

  const handleClick = (e: any) => {
    const stage = e.target.getStage()
    const pointerPos = stage.getPointerPosition()

    // Check if clicking on background (not on a symbol)
    if (e.target === e.target.getStage() || e.target.getClassName() === 'Line' || e.target.getClassName() === 'Text') {
      const x = pointerPos.x
      const y = pointerPos.y

      // Only place if within chart bounds
      if (
        x < marginLeft ||
        x > width - marginRight ||
        y < marginTop ||
        y > height - marginBottom
      ) {
        return
      }

      const freq = getNearestFrequency(x)
      const db = getNearestDb(y)

      // Auto-select correct ear variant based on chart
      let symbolToPlace = selectedSymbol
      if (isRightEar) {
        // Convert left ear symbols to right ear equivalents
        switch (selectedSymbol) {
          case 'ac-left-unmasked': symbolToPlace = 'ac-right-unmasked'; break
          case 'ac-left-masked': symbolToPlace = 'ac-right-masked'; break
          case 'bc-left-unmasked': symbolToPlace = 'bc-right-unmasked'; break
          case 'bc-left-masked': symbolToPlace = 'bc-right-masked'; break
          case 'nr-left': symbolToPlace = 'nr-right'; break
        }
      } else {
        // Convert right ear symbols to left ear equivalents
        switch (selectedSymbol) {
          case 'ac-right-unmasked': symbolToPlace = 'ac-left-unmasked'; break
          case 'ac-right-masked': symbolToPlace = 'ac-left-masked'; break
          case 'bc-right-unmasked': symbolToPlace = 'bc-left-unmasked'; break
          case 'bc-right-masked': symbolToPlace = 'bc-left-masked'; break
          case 'nr-right': symbolToPlace = 'nr-left'; break
        }
      }

      const newSymbol: PlacedSymbol = {
        id: `${Date.now()}-${Math.random()}`,
        x: getX(freq),
        y: getY(db),
        freq,
        db,
        symbolType: symbolToPlace,
      }

      const newSymbols = [...symbols, newSymbol]
      setSymbols(newSymbols)
      onChange(JSON.stringify(newSymbols))
    }
  }

  const handleSymbolClick = (id: string) => {
    setSelectedSymbolId(id)
  }

  const handleSymbolDragEnd = (id: string, x: number, y: number) => {
    // Snap to nearest grid point
    const freq = getNearestFrequency(x)
    const db = getNearestDb(y)
    const snappedX = getX(freq)
    const snappedY = getY(db)

    const updatedSymbols = symbols.map((sym) =>
      sym.id === id
        ? { ...sym, x: snappedX, y: snappedY, freq, db }
        : sym
    )
    setSymbols(updatedSymbols)
    onChange(JSON.stringify(updatedSymbols))
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!selectedSymbolId) return

    const symbol = symbols.find((s) => s.id === selectedSymbolId)
    if (!symbol) return

    let newFreq = symbol.freq
    let newDb = symbol.db

    // Arrow keys for movement
    if (e.key === 'ArrowRight') {
      const currentIndex = frequencies.indexOf(symbol.freq)
      if (currentIndex < frequencies.length - 1) {
        newFreq = frequencies[currentIndex + 1]
      }
    } else if (e.key === 'ArrowLeft') {
      const currentIndex = frequencies.indexOf(symbol.freq)
      if (currentIndex > 0) {
        newFreq = frequencies[currentIndex - 1]
      }
    } else if (e.key === 'ArrowUp') {
      newDb = Math.max(-10, symbol.db - 5)
    } else if (e.key === 'ArrowDown') {
      newDb = Math.min(120, symbol.db + 5)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Delete symbol
      const updatedSymbols = symbols.filter((s) => s.id !== selectedSymbolId)
      setSymbols(updatedSymbols)
      onChange(JSON.stringify(updatedSymbols))
      setSelectedSymbolId(null)
      return
    }

    if (newFreq !== symbol.freq || newDb !== symbol.db) {
      const updatedSymbols = symbols.map((s) =>
        s.id === selectedSymbolId
          ? { ...s, freq: newFreq, db: newDb, x: getX(newFreq), y: getY(newDb) }
          : s
      )
      setSymbols(updatedSymbols)
      onChange(JSON.stringify(updatedSymbols))
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedSymbolId, symbols])

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage()
    const pointerPos = stage.getPointerPosition()
    const x = pointerPos.x
    const y = pointerPos.y

    if (
      x >= marginLeft &&
      x <= width - marginRight &&
      y >= marginTop &&
      y <= height - marginBottom
    ) {
      const freq = getNearestFrequency(x)
      const db = getNearestDb(y)
      setHoveredPoint({ freq, db })
    } else {
      setHoveredPoint(null)
    }
  }

  const handleClear = () => {
    setSymbols([])
    setSelectedSymbolId(null)
    onChange('')
  }

  return (
    <div className="border border-gray-400 cursor-crosshair">
      {/* Title */}
      <div className="py-1 text-sm font-bold text-center border-b border-gray-400">
        {title}
      </div>

      {/* Chart */}
      <div className="relative">
        <Stage
          width={width}
          height={height}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <Layer>
            {/* Grid - Vertical lines (Frequencies) */}
            {frequencies.map((freq) => (
              <Line
                key={`v-${freq}`}
                points={[getX(freq), marginTop, getX(freq), height - marginBottom]}
                stroke="#ccc"
                strokeWidth={freq === 1 ? 1.5 : 0.5}
              />
            ))}

            {/* Grid - Horizontal lines (dB levels) */}
            {dbLevels.map((db) => (
              <Line
                key={`h-${db}`}
                points={[marginLeft, getY(db), width - marginRight, getY(db)]}
                stroke="#ccc"
                strokeWidth={db === 0 ? 1.5 : 0.5}
              />
            ))}

            {/* X-axis labels (frequencies) */}
            {frequencies.map((freq) => (
              <Text
                key={`xl-${freq}`}
                x={getX(freq)}
                y={height - marginBottom + 5}
                text={freq.toString()}
                fontSize={9}
                fill="black"
                align="center"
                width={30}
                offsetX={15}
              />
            ))}

            {/* Y-axis labels (dB levels) */}
            {dbLevels.filter((_, i) => i % 2 === 0).map((db) => (
              <Text
                key={`yl-${db}`}
                x={5}
                y={getY(db) - 6}
                text={db.toString()}
                fontSize={9}
                fill="black"
                align="right"
                width={35}
              />
            ))}

            {/* X-axis title */}
            <Text
              x={width / 2 - 15}
              y={height - 13}
              text="KHz"
              fontSize={10}
              fontStyle="bold"
              fill="black"
            />

            {/* Y-axis title */}
            <Text
              x={30}
              y={2}
              text="dB"
              fontSize={10}
              fontStyle="bold"
              fill="black"
            />

            {/* Draw connecting lines between symbols of same type */}
            {(() => {
              const symbolsByType = symbols.reduce((acc, symbol) => {
                if (!acc[symbol.symbolType]) acc[symbol.symbolType] = []
                acc[symbol.symbolType].push(symbol)
                return acc
              }, {} as Record<string, PlacedSymbol[]>)

              return Object.entries(symbolsByType).map(([type, syms]) => {
                if (syms.length < 2) return null
                const sorted = [...syms].sort((a, b) => a.freq - b.freq)
                const points = sorted.flatMap((s) => [s.x, s.y])
                const color = type.includes('right') || type === 'nr-right' ? '#EF4444' : '#3B82F6'
                return (
                  <Line
                    key={`line-${type}`}
                    points={points}
                    stroke={color}
                    strokeWidth={1.5}
                    dash={type.includes('masked') ? [5, 5] : undefined}
                  />
                )
              })
            })()}

            {/* Draw symbols */}
            {symbols.map((symbol) => (
              <AudiometrySymbol
                key={symbol.id}
                x={symbol.x}
                y={symbol.y}
                symbolType={symbol.symbolType}
                isSelected={selectedSymbolId === symbol.id}
                onClick={() => handleSymbolClick(symbol.id)}
                onDragEnd={(x, y) => handleSymbolDragEnd(symbol.id, x, y)}
              />
            ))}
          </Layer>
        </Stage>

        {/* Clear button */}
        <button
          onClick={handleClear}
          className="absolute px-2 py-1 text-xs text-white bg-red-400 rounded cursor-pointer no-print left-7 top-0.5 hover:bg-red-600"
        >
          Clear
        </button>

        {/* Hover tooltip */}
        {hoveredPoint && (
          <div className="absolute px-2 py-1 text-xs text-white bg-gray-800 rounded pointer-events-none no-print"
               style={{ left: '50%', top: '5px', transform: 'translateX(-50%)' }}>
            {hoveredPoint.freq} KHz, {hoveredPoint.db} dB
          </div>
        )}
      </div>
    </div>
  )
}
