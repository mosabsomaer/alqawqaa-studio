import { Circle, Group, Line, Path, Rect, Text } from 'react-konva'
import type { SymbolType } from './AudiometryToolbar'

interface AudiometrySymbolProps {
  x: number
  y: number
  symbolType: SymbolType
  isSelected?: boolean
  onClick?: () => void
  onDragEnd?: (x: number, y: number) => void
}

const getSymbolColor = (symbolType: SymbolType): string => {
  if (symbolType.includes('right') || symbolType === 'nr-right') return '#EF4444' // Red
  if (symbolType.includes('left') || symbolType === 'nr-left') return '#3B82F6' // Blue
  if (symbolType === 'aided') return '#10B981' // Green
  if (symbolType === 'sound-field') return '#F59E0B' // Orange
  return '#000000'
}

export default function AudiometrySymbol({
  x,
  y,
  symbolType,
  isSelected = false,
  onClick,
  onDragEnd,
}: AudiometrySymbolProps) {
  const color = getSymbolColor(symbolType)
  const size = 8

  const handleDragEnd = (e: any) => {
    if (onDragEnd) {
      onDragEnd(e.target.x(), e.target.y())
    }
  }

  const commonProps = {
    x,
    y,
    onClick,
    onTap: onClick,
    draggable: true,
    onDragEnd: handleDragEnd,
  }

  // Air Conduction - Right Unmasked (O)
  if (symbolType === 'ac-right-unmasked') {
    return (
      <Group {...commonProps}>
        <Circle radius={size} stroke={color} strokeWidth={2} fill="transparent" />
        {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  // Air Conduction - Right Masked (Δ)
  if (symbolType === 'ac-right-masked') {
    return (
      <Group {...commonProps}>
        <Line
          points={[0, -size, -size, size, size, size, 0, -size]}
          stroke={color}
          strokeWidth={2}
          closed
          fill="transparent"
        />
        {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  // Air Conduction - Left Unmasked (X)
  if (symbolType === 'ac-left-unmasked') {
    return (
      <Group {...commonProps}>
        <Line points={[-size, -size, size, size]} stroke={color} strokeWidth={2} />
        <Line points={[-size, size, size, -size]} stroke={color} strokeWidth={2} />
        {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  // Air Conduction - Left Masked (□)
  if (symbolType === 'ac-left-masked') {
    return (
      <Group {...commonProps}>
        <Rect
          x={-size}
          y={-size}
          width={size * 2}
          height={size * 2}
          stroke={color}
          strokeWidth={2}
          fill="transparent"
        />
        {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  // Bone Conduction - Right Unmasked (<)
  if (symbolType === 'bc-right-unmasked') {
    return (
      <Group {...commonProps}>
        <Line points={[size, -size, -size, 0, size, size]} stroke={color} strokeWidth={2} />
        {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  // Bone Conduction - Right Masked ([)
  if (symbolType === 'bc-right-masked') {
    return (
      <Group {...commonProps}>
        <Line points={[-size, -size, -size, size]} stroke={color} strokeWidth={2} />
        <Line points={[-size, -size, -size + 4, -size]} stroke={color} strokeWidth={2} />
        <Line points={[-size, size, -size + 4, size]} stroke={color} strokeWidth={2} />
        {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  // Bone Conduction - Left Unmasked (>)
  if (symbolType === 'bc-left-unmasked') {
    return (
      <Group {...commonProps}>
        <Line points={[-size, -size, size, 0, -size, size]} stroke={color} strokeWidth={2} />
        {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  // Bone Conduction - Left Masked (])
  if (symbolType === 'bc-left-masked') {
    return (
      <Group {...commonProps}>
        <Line points={[size, -size, size, size]} stroke={color} strokeWidth={2} />
        <Line points={[size, -size, size - 4, -size]} stroke={color} strokeWidth={2} />
        <Line points={[size, size, size - 4, size]} stroke={color} strokeWidth={2} />
        {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  // No Response - Right (O↓)
  if (symbolType === 'nr-right') {
    return (
      <Group {...commonProps}>
        <Circle radius={size} stroke={color} strokeWidth={2} fill="transparent" />
        <Line points={[0, size + 2, 0, size + 10]} stroke={color} strokeWidth={2} />
        <Line points={[-3, size + 7, 0, size + 10, 3, size + 7]} stroke={color} strokeWidth={2} />
        {isSelected && <Circle radius={size + 8} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  // No Response - Left (X↓)
  if (symbolType === 'nr-left') {
    return (
      <Group {...commonProps}>
        <Line points={[-size, -size, size, size]} stroke={color} strokeWidth={2} />
        <Line points={[-size, size, size, -size]} stroke={color} strokeWidth={2} />
        <Line points={[0, size + 2, 0, size + 10]} stroke={color} strokeWidth={2} />
        <Line points={[-3, size + 7, 0, size + 10, 3, size + 7]} stroke={color} strokeWidth={2} />
        {isSelected && <Circle radius={size + 8} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  // Aided (A)
  if (symbolType === 'aided') {
    return (
      <Group {...commonProps}>
        <Text
          text="A"
          fontSize={16}
          fontStyle="bold"
          fill={color}
          offsetX={5}
          offsetY={8}
        />
        {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  // Sound Field (S)
  if (symbolType === 'sound-field') {
    return (
      <Group {...commonProps}>
        <Text
          text="S"
          fontSize={16}
          fontStyle="bold"
          fill={color}
          offsetX={5}
          offsetY={8}
        />
        {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
      </Group>
    )
  }

  return null
}
