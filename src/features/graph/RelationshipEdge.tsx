import { useState, type CSSProperties } from 'react'
import { BaseEdge, EdgeLabelRenderer, Position, type EdgeProps } from '@xyflow/react'
import type { Relationship } from '../../types'
import { getRelationshipEdgeStyle, type GraphLineMetric } from './graphStyle'

interface RelationshipEdgeData {
  relationship: Relationship
  isPrimary: boolean
  lineMetric: GraphLineMetric
  showLabel?: boolean
  sourceRadius?: number
  targetRadius?: number
}

function getNodeCenterFromHandle(
  point: { x: number; y: number },
  handlePosition: Position,
  radius: number,
) {
  if (handlePosition === Position.Left) return { x: point.x + radius, y: point.y }
  if (handlePosition === Position.Right) return { x: point.x - radius, y: point.y }
  if (handlePosition === Position.Top) return { x: point.x, y: point.y + radius }
  if (handlePosition === Position.Bottom) return { x: point.x, y: point.y - radius }

  return point
}

export default function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  style,
  selected = false,
}: EdgeProps) {
  const edgeData = data as unknown as RelationshipEdgeData | undefined
  const [hovered, setHovered] = useState(false)
  const sourceCenter = getNodeCenterFromHandle(
    { x: sourceX, y: sourceY },
    sourcePosition,
    edgeData?.sourceRadius ?? 37,
  )
  const targetCenter = getNodeCenterFromHandle(
    { x: targetX, y: targetY },
    targetPosition,
    edgeData?.targetRadius ?? 37,
  )
  const path = `M ${sourceCenter.x},${sourceCenter.y} L ${targetCenter.x},${targetCenter.y}`
  const labelPoint = {
    x: (sourceCenter.x + targetCenter.x) / 2,
    y: (sourceCenter.y + targetCenter.y) / 2,
  }

  if (!edgeData) {
    return (
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={style}
      />
    )
  }

  const { relationship, isPrimary, lineMetric, showLabel = true } = edgeData
  const baseStyle = getRelationshipEdgeStyle(relationship, { metric: lineMetric, isPrimary })
  const shouldShowLabel = !isPrimary && (showLabel || hovered || selected)
  const edgeStyle: CSSProperties = {
    ...style,
    ...baseStyle,
    opacity: hovered ? Math.min(1, baseStyle.opacity + 0.18) : baseStyle.opacity,
    strokeWidth: hovered ? baseStyle.strokeWidth + 0.45 : baseStyle.strokeWidth,
    filter: isPrimary
      ? 'drop-shadow(0 2px 5px rgba(218,116,139,0.16))'
      : 'drop-shadow(0 2px 4px rgba(124,83,96,0.10))',
    transition: 'stroke 180ms ease, opacity 180ms ease, stroke-width 180ms ease',
  }

  return (
    <g
      className={isPrimary ? 'relationship-edge relationship-edge-primary' : 'relationship-edge relationship-edge-secondary'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={edgeStyle}
        interactionWidth={isPrimary ? 20 : 16}
      />
      {shouldShowLabel ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-black text-ink/62 shadow-[0_8px_18px_rgba(218,116,139,0.12)] ring-1 ring-rose/12 backdrop-blur"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelPoint.x}px, ${labelPoint.y}px)`,
              opacity: showLabel ? 1 : 0.94,
              zIndex: hovered || selected ? 30 : 16,
            }}
          >
            {relationship.type}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  )
}
