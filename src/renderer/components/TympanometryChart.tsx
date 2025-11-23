import { useState } from 'react'
import { Circle, Layer, Line, Rect, Stage, Text } from 'react-konva'

interface TympanometryChartProps {
  title: string
  data: string
  onChange: (data: string) => void
}

export default function TympanometryChart({ title, data, onChange }: TympanometryChartProps) {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([])

  // Reset when data prop changes to empty string
  if (data === '' && points.length > 0) {
    setPoints([])
  }

  const width = 320
  const height = 200
  const marginLeft = 40
  const marginTop = 20
  const marginRight = 40
  const marginBottom = 30

  const chartWidth = width - marginLeft - marginRight
  const chartHeight = height - marginTop - marginBottom

  // Pressure range: +200 to -400 daPa
  const pressureMin = -400
  const pressureMax = 200

  // Compliance range: 0 to 5 ml
  const complianceMin = 0
  const complianceMax = 5

  const getX = (pressure: number) => {
    const normalized = (pressure - pressureMin) / (pressureMax - pressureMin)
    return marginLeft + normalized * chartWidth
  }

  const getY = (compliance: number) => {
    const normalized = compliance / complianceMax
    return marginTop + chartHeight - normalized * chartHeight
  }

  const handleClick = (e: any) => {
    const stage = e.target.getStage()
    const pointerPos = stage.getPointerPosition()

    const x = pointerPos.x
    const y = pointerPos.y

    // Keep points within chart bounds
    if (
      x < marginLeft ||
      x > width - marginRight ||
      y < marginTop ||
      y > height - marginBottom
    ) {
      return
    }

    const newPoints = [...points, { x, y }].sort((a, b) => a.x - b.x)
    setPoints(newPoints)
    onChange(JSON.stringify(newPoints))
  }

  const handleClear = () => {
    setPoints([])
    onChange('')
  }

  // Pressure tick marks
  const pressureTicks = [-400, -300, -200, -100, 0, +100, +200]

  // Compliance tick marks
  const complianceTicks = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

  return (
    <div className="border border-gray-400">
      {/* Title */}
      <div className="py-1 text-sm font-bold text-center border-b border-gray-400 bg-gray-50">
        {title}
      </div>

      {/* Chart */}
      <div className="relative bg-white cursor-crosshair">
        <Stage width={width} height={height} onClick={handleClick}>
          <Layer>
            {/* Shaded background area */}
            <Rect
              x={marginLeft}
              y={marginTop}
              width={chartWidth}
              height={chartHeight}
              fill="#f9f9f9"
              stroke="black"
              strokeWidth={1}
            />

            {/* Grid pattern (dense dots like in original) */}
            {Array.from({ length: 40 }).map((_, i) =>
              Array.from({ length: 30 }).map((_, j) => (
                <Circle
                  key={`dot-${i}-${j}`}
                  x={marginLeft + (i / 39) * chartWidth}
                  y={marginTop + (j / 29) * chartHeight}
                  radius={0.5}
                  fill="#999"
                />
              ))
            )}

            {/* Y-axis labels (Compliance - ML) */}
            {complianceTicks.map((comp) => (
              <Text
                key={`comp-${comp}`}
                x={marginLeft + chartWidth + 5}
                y={getY(comp) - 6}
                text={comp.toString()}
                fontSize={8}
                fill="black"
              />
            ))}

            {/* X-axis labels (Pressure - daPa) */}
            {pressureTicks.map((pressure) => (
              <Text
                key={`pressure-${pressure}`}
                x={getX(pressure) - 15}
                y={height - marginBottom + 5}
                text={pressure.toString()}
                fontSize={8}
                fill="black"
              />
            ))}

            {/* ML ML label on right */}
            <Text
              x={marginLeft + chartWidth + 5}
              y={marginTop - 15}
              text="ML ML"
              fontSize={8}
              fontStyle="bold"
              fill="black"
            />

            {/* Draw curve */}
            {points.length > 1 && (
              <Line
                points={points.flatMap((p) => [p.x, p.y])}
                stroke="black"
                strokeWidth={2}
                tension={0.3}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Draw points */}
            {points.map((point, i) => (
              <Circle
                key={i}
                x={point.x}
                y={point.y}
                radius={3}
                fill="black"
                stroke="white"
                strokeWidth={1}
              />
            ))}
          </Layer>
        </Stage>

        {/* Clear button */}
        <button
          onClick={handleClear}
          className="absolute px-2 py-1 text-xs text-white bg-red-400 rounded cursor-pointer no-print left-2 top-2 hover:bg-red-600"
        >
          Clear
        </button>

        {/* Scale labels */}
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <Text />
        </div>
      </div>
    </div>
  )
}
