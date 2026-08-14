import { Circle, Group, Line, Rect, Text } from 'react-konva'
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
  const size = 6
  const hitAreaSize = 12 // Larger hit area for easier clicking

  const handleDragEnd = (e: any) => {
    if (onDragEnd) {
      onDragEnd(e.target.x(), e.target.y())
    }
  }

  const handleClick = (e: any) => {
    // Stop propagation to prevent stage click from firing
    e.cancelBubble = true
    if (onClick) {
      onClick()
    }
  }

  const commonProps = {
    x,
    y,
    onClick: handleClick,
    onTap: handleClick,
    draggable: true,
    onDragEnd: handleDragEnd,
  }

  switch (symbolType) {
    // Air Conduction - Right Unmasked (O)
    case 'ac-right-unmasked':
      return (
        <Group {...commonProps}>
          {/* Invisible hit area for easier clicking */}
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2} fill="transparent" />
          <Circle radius={size} stroke={color} strokeWidth={2} fill="transparent" />
          {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
        </Group>
      )

    // Air Conduction - Right Masked (Δ)
    case 'ac-right-masked':
      return (
        <Group {...commonProps}>
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2} fill="transparent" />
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

    // Air Conduction - Left Unmasked (X)
    case 'ac-left-unmasked':
      return (
        <Group {...commonProps}>
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2} fill="transparent" />
          <Line points={[-size, -size, size, size]} stroke={color} strokeWidth={2} />
          <Line points={[-size, size, size, -size]} stroke={color} strokeWidth={2} />
          {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
        </Group>
      )

    // Air Conduction - Left Masked (□)
    case 'ac-left-masked':
      return (
        <Group {...commonProps}>
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2} fill="transparent" />
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

    // Bone Conduction - Right Unmasked (<)
    case 'bc-right-unmasked':
      return (
        <Group {...commonProps}>
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2} fill="transparent" />
          <Line points={[size, -size, -size, 0, size, size]} stroke={color} strokeWidth={2} />
          {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
        </Group>
      )

    // Bone Conduction - Right Masked ([)
    case 'bc-right-masked':
      return (
        <Group {...commonProps}>
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2} fill="transparent" />
          <Line points={[-size, -size, -size, size]} stroke={color} strokeWidth={2} />
          <Line points={[-size, -size, -size + 4, -size]} stroke={color} strokeWidth={2} />
          <Line points={[-size, size, -size + 4, size]} stroke={color} strokeWidth={2} />
          {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
        </Group>
      )

    // Bone Conduction - Left Unmasked (>)
    case 'bc-left-unmasked':
      return (
        <Group {...commonProps}>
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2} fill="transparent" />
          <Line points={[-size, -size, size, 0, -size, size]} stroke={color} strokeWidth={2} />
          {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
        </Group>
      )

    // Bone Conduction - Left Masked (])
    case 'bc-left-masked':
      return (
        <Group {...commonProps}>
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2} fill="transparent" />
          <Line points={[size, -size, size, size]} stroke={color} strokeWidth={2} />
          <Line points={[size, -size, size - 4, -size]} stroke={color} strokeWidth={2} />
          <Line points={[size, size, size - 4, size]} stroke={color} strokeWidth={2} />
          {isSelected && <Circle radius={size + 3} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
        </Group>
      )

    // No Response - Right (O↓)
    case 'nr-right':
      return (
        <Group {...commonProps}>
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2 + 10} fill="transparent" />
          <Circle radius={size} stroke={color} strokeWidth={2} fill="transparent" />
          <Line points={[0, size + 2, 0, size + 10]} stroke={color} strokeWidth={2} />
          <Line points={[-3, size + 7, 0, size + 10, 3, size + 7]} stroke={color} strokeWidth={2} />
          {isSelected && <Circle radius={size + 8} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
        </Group>
      )

    // No Response - Left (X↓)
    case 'nr-left':
      return (
        <Group {...commonProps}>
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2 + 10} fill="transparent" />
          <Line points={[-size, -size, size, size]} stroke={color} strokeWidth={2} />
          <Line points={[-size, size, size, -size]} stroke={color} strokeWidth={2} />
          <Line points={[0, size + 2, 0, size + 10]} stroke={color} strokeWidth={2} />
          <Line points={[-3, size + 7, 0, size + 10, 3, size + 7]} stroke={color} strokeWidth={2} />
          {isSelected && <Circle radius={size + 8} stroke="#000" strokeWidth={1} dash={[3, 3]} />}
        </Group>
      )

    // Aided (A)
    case 'aided':
      return (
        <Group {...commonProps}>
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2} fill="transparent" />
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

    // Sound Field (S)
    case 'sound-field':
      return (
        <Group {...commonProps}>
          <Rect x={-hitAreaSize} y={-hitAreaSize} width={hitAreaSize * 2} height={hitAreaSize * 2} fill="transparent" />
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

    default:
      return null
  }
}
