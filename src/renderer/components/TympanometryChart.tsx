import { useEffect, useState } from 'react'
import { Circle, Layer, Line, Rect, Stage, Text } from 'react-konva'

interface TympanometryChartProps {
  title: string
  data: string
  onChange: (data: string) => void
}

interface BezierPoint {
  x: number
  y: number
  handleIn: { x: number; y: number } | null  // Control point for curve coming IN to this point
  handleOut: { x: number; y: number } | null // Control point for curve going OUT from this point
}

export default function TympanometryChart({ title, data, onChange }: TympanometryChartProps) {
  const [points, setPoints] = useState<BezierPoint[]>([])
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)

  // Clear selection before printing so control handles don't show
  useEffect(() => {
    const handleBeforePrint = () => setSelectedPointIndex(null)

    window.addEventListener('beforeprint', handleBeforePrint)
    return () => window.removeEventListener('beforeprint', handleBeforePrint)
  }, [])

  // Load data from prop
  useEffect(() => {
    if (data === '') {
      setPoints([])
      setSelectedPointIndex(null)
    } else {
      try {
        const parsed = JSON.parse(data)
        setPoints(parsed)
      } catch {
        // Invalid data, ignore
      }
    }
  }, [data])

  const width = 320
  const height = 160
  const marginLeft = 40
  const marginTop = 15
  const marginRight = 40
  const marginBottom = 25

  const chartWidth = width - marginLeft - marginRight
  const chartHeight = height - marginTop - marginBottom

  // Pressure range: +300 to -300 daPa
  const pressureMin = -300
  const pressureMax = 300

  // Compliance range: 0 to 5 ml
  const complianceMax = 5

  const getX = (pressure: number) => {
    const normalized = (pressure - pressureMin) / (pressureMax - pressureMin)
    return marginLeft + normalized * chartWidth
  }

  const getY = (compliance: number) => {
    const normalized = compliance / complianceMax
    return marginTop + chartHeight - normalized * chartHeight
  }

  const handleStageClick = (e: any) => {
    // Check if clicked on background (not a point or handle)
    if (e.target === e.target.getStage() || e.target.getClassName() === 'Rect') {
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

      // Create new point with default handles (30px symmetrical)
      const newPoint: BezierPoint = {
        x,
        y,
        handleIn: { x: x - 10, y },
        handleOut: { x: x + 10, y },
      }

      const newPoints = [...points, newPoint].sort((a, b) => a.x - b.x)
      setPoints(newPoints)
      onChange(JSON.stringify(newPoints))

      // Select the new point
      const newIndex = newPoints.findIndex((p) => p.x === x && p.y === y)
      setSelectedPointIndex(newIndex)
    }
  }

  const handlePointClick = (index: number, e: any) => {
    e.cancelBubble = true
    setSelectedPointIndex(index)
  }

  const handlePointDragEnd = (index: number, e: any) => {
    const newX = e.target.x()
    const newY = e.target.y()

    const newPoints = [...points]
    const point = newPoints[index]

    // Calculate delta
    const dx = newX - point.x
    const dy = newY - point.y

    // Move point and its handles
    point.x = newX
    point.y = newY
    if (point.handleIn) {
      point.handleIn.x += dx
      point.handleIn.y += dy
    }
    if (point.handleOut) {
      point.handleOut.x += dx
      point.handleOut.y += dy
    }

    setPoints(newPoints)
    onChange(JSON.stringify(newPoints))
  }

  const handleControlDragMove = (index: number, type: 'in' | 'out', e: any) => {
    const newX = e.target.x()
    const newY = e.target.y()
    const shiftPressed = e.evt?.shiftKey || false

    const newPoints = [...points]
    const point = newPoints[index]

    if (type === 'in' && point.handleIn) {
      point.handleIn.x = newX
      point.handleIn.y = newY

      // Mirror to out handle (symmetrical) UNLESS Shift is pressed
      if (point.handleOut && !shiftPressed) {
        const dx = point.x - newX
        const dy = point.y - newY
        point.handleOut.x = point.x + dx
        point.handleOut.y = point.y + dy
      }
    } else if (type === 'out' && point.handleOut) {
      point.handleOut.x = newX
      point.handleOut.y = newY

      // Mirror to in handle (symmetrical) UNLESS Shift is pressed
      if (point.handleIn && !shiftPressed) {
        const dx = point.x - newX
        const dy = point.y - newY
        point.handleIn.x = point.x + dx
        point.handleIn.y = point.y + dy
      }
    }

    setPoints(newPoints)
    onChange(JSON.stringify(newPoints))
  }

  const handleClear = () => {
    setPoints([])
    setSelectedPointIndex(null)
    onChange('')
  }

  // Pressure tick marks
  const pressureTicks = [-300, -200, -100, 0, +100, +200, +300]

  // Compliance tick marks
  const complianceTicks = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPointIndex === null) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        const newPoints = points.filter((_, i) => i !== selectedPointIndex)
        setPoints(newPoints)
        onChange(JSON.stringify(newPoints))
        setSelectedPointIndex(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPointIndex, points, onChange])

  return (
    <div className="border border-gray-400">
      {/* Chart */}
      <div className="relative bg-white cursor-crosshair">
        <Stage width={width} height={height} onClick={handleStageClick}>
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

            {/* ML label on right */}
            <Text
              x={marginLeft + chartWidth + 5}
              y={marginTop - 12}
              text="ML"
              fontSize={8}
              fontStyle="bold"
              fill="black"
            />

            {/* Title in top-left corner */}
            <Text
              x={5}
              y={3}
              text={title}
              fontSize={11}
              fontStyle="bold"
              fill="black"
            />

            {/* Draw Bézier curve using Line with bezier */}
            {points.length > 1 && (
              <Line
                points={points.flatMap((p, i) => {
                  if (i === 0) return [p.x, p.y]
                  const prev = points[i - 1]
                  const cp1 = prev.handleOut || { x: prev.x, y: prev.y }
                  const cp2 = p.handleIn || { x: p.x, y: p.y }
                  return [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y]
                })}
                stroke={title === "RT" ? '#EF4444' : '#3B82F6'}
                strokeWidth={2}
                bezier={true}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Draw control handles for selected point (cleared before printing) */}
            {selectedPointIndex !== null && points[selectedPointIndex] && (
              <>
                {/* Handle In */}
                {points[selectedPointIndex].handleIn && (
                  <>
                    <Line
                      points={[
                        points[selectedPointIndex].x,
                        points[selectedPointIndex].y,
                        points[selectedPointIndex].handleIn!.x,
                        points[selectedPointIndex].handleIn!.y,
                      ]}
                      stroke="#3B82F6"
                      strokeWidth={1}
                      dash={[4, 4]}
                    />
                    <Circle
                      x={points[selectedPointIndex].handleIn!.x}
                      y={points[selectedPointIndex].handleIn!.y}
                      radius={4}
                      fill="#3B82F6"
                      stroke="white"
                      strokeWidth={1}
                      draggable
                      onDragMove={(e) => handleControlDragMove(selectedPointIndex, 'in', e)}
                    />
                  </>
                )}

                {/* Handle Out */}
                {points[selectedPointIndex].handleOut && (
                  <>
                    <Line
                      points={[
                        points[selectedPointIndex].x,
                        points[selectedPointIndex].y,
                        points[selectedPointIndex].handleOut!.x,
                        points[selectedPointIndex].handleOut!.y,
                      ]}
                      stroke="#3B82F6"
                      strokeWidth={1}
                      dash={[4, 4]}
                    />
                    <Circle
                      x={points[selectedPointIndex].handleOut!.x}
                      y={points[selectedPointIndex].handleOut!.y}
                      radius={4}
                      fill="#3B82F6"
                      stroke="white"
                      strokeWidth={1}
                      draggable
                      onDragMove={(e) => handleControlDragMove(selectedPointIndex, 'out', e)}
                    />
                  </>
                )}
              </>
            )}

            {/* Draw anchor points */}
            {points.map((point, i) => (
              <Circle
                key={i}
                x={point.x}
                y={point.y}
                radius={selectedPointIndex === i ? 5 : 3}
                fill={selectedPointIndex === i ? '#3B82F6' : 'black'}
                stroke="white"
                strokeWidth={selectedPointIndex === i ? 2 : 1}
                draggable
                onClick={(e) => handlePointClick(i, e)}
                onDragEnd={(e) => handlePointDragEnd(i, e)}
              />
            ))}
          </Layer>
        </Stage>

        {/* Clear button */}
        <button
          onClick={handleClear}
          className="absolute px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded shadow-sm cursor-pointer no-print left-2 top-2 hover:bg-gray-50"
        >
          Clear
        </button>

        {/* Help text */}
        {selectedPointIndex !== null && (
          <div className="absolute px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded shadow-sm pointer-events-none -bottom-3 no-print left-2">
            Hold <kbd className="px-1 font-mono text-xs bg-gray-100 border border-gray-300 rounded">Shift</kbd> to break handle symmetry
          </div>
        )}
      </div>
    </div>
  )
}
