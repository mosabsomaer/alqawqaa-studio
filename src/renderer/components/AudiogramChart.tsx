import { useRef, useState } from 'react'
import { Stage, Layer, Line, Text, Circle } from 'react-konva'

interface AudiogramChartProps {
  title: string
  data: string
  onChange: (data: string) => void
}

export default function AudiogramChart({ title, data, onChange }: AudiogramChartProps) {
  const [points, setPoints] = useState<{ x: number; y: number; freq: number; db: number }[]>([])
  const [isDrawing, setIsDrawing] = useState(false)

  const frequencies = [0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12]
  const dbLevels = Array.from({ length: 14 }, (_, i) => -10 + i * 10) // -10 to 120

  const width = 380
  const height = 300
  const marginLeft = 40
  const marginTop = 30
  const marginRight = 20
  const marginBottom = 30

  const chartWidth = width - marginLeft - marginRight
  const chartHeight = height - marginTop - marginBottom

  const getX = (freq: number) => {
    const index = frequencies.indexOf(freq)
    return marginLeft + (index / (frequencies.length - 1)) * chartWidth
  }

  const getY = (db: number) => {
    const normalized = (db + 10) / 130 // -10 to 120 range
    return marginTop + normalized * chartHeight
  }

  const handleClick = (e: any) => {
    const stage = e.target.getStage()
    const pointerPos = stage.getPointerPosition()

    // Calculate nearest frequency and dB level
    const x = pointerPos.x
    const y = pointerPos.y

    // Find nearest frequency
    const freqIndex = Math.round(((x - marginLeft) / chartWidth) * (frequencies.length - 1))
    const freq = frequencies[Math.max(0, Math.min(freqIndex, frequencies.length - 1))]

    // Calculate dB level
    const dbNormalized = (y - marginTop) / chartHeight
    const db = Math.round(dbNormalized * 130 - 10)
    const clampedDb = Math.max(-10, Math.min(120, db))

    const newPoint = { x: getX(freq), y: getY(clampedDb), freq, db: clampedDb }
    const newPoints = [...points, newPoint]
    setPoints(newPoints)
    onChange(JSON.stringify(newPoints))
  }

  const handleClear = () => {
    setPoints([])
    onChange('')
  }

  return (
    <div className="border border-gray-400">
      {/* Title */}
      <div className="border-b border-gray-400 bg-gray-50 py-1 text-center text-sm font-bold">
        {title}
      </div>

      {/* Chart */}
      <div className="relative">
        <Stage width={width} height={height} onClick={handleClick}>
          <Layer>
            {/* Grid - Vertical lines */}
            {frequencies.map((freq, i) => (
              <Line
                key={`v-${freq}`}
                points={[getX(freq), marginTop, getX(freq), height - marginBottom]}
                stroke="#ccc"
                strokeWidth={freq === 1 ? 1.5 : 0.5}
              />
            ))}

            {/* Grid - Horizontal lines */}
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
                x={getX(freq) - 15}
                y={height - marginBottom + 5}
                text={freq.toString()}
                fontSize={9}
                fill="black"
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
              />
            ))}

            {/* X-axis title */}
            <Text
              x={width / 2 - 15}
              y={height - 10}
              text="KHz"
              fontSize={10}
              fontStyle="bold"
              fill="black"
            />

            {/* Y-axis title */}
            <Text
              x={width - 25}
              y={15}
              text="dB"
              fontSize={10}
              fontStyle="bold"
              fill="black"
            />

            {/* Draw points */}
            {points.map((point, i) => (
              <Circle
                key={i}
                x={point.x}
                y={point.y}
                radius={4}
                fill={title === 'RIGHT' ? 'red' : 'blue'}
                stroke="black"
                strokeWidth={1}
              />
            ))}

            {/* Draw lines connecting points */}
            {points.length > 1 && (
              <Line
                points={points.flatMap((p) => [p.x, p.y])}
                stroke={title === 'RIGHT' ? 'red' : 'blue'}
                strokeWidth={2}
              />
            )}
          </Layer>
        </Stage>

        {/* Clear button */}
        <button
          onClick={handleClear}
          className="no-print absolute right-2 top-2 rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
