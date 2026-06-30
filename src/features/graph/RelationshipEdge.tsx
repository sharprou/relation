import { useState, type CSSProperties } from 'react'
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'
import type { Relationship } from '../../types'
import { getRelationshipEdgeStyle, type GraphLineMetric } from './graphStyle'
import type { GraphPoint } from './graphLayout'

interface RelationshipEdgeData {
  relationship: Relationship
  isPrimary: boolean
  lineMetric: GraphLineMetric
  centerPosition: GraphPoint
  visibleNodeCount?: number
  visibleEdgeCount?: number
  showLabel?: boolean
}

function normalize(point: GraphPoint): GraphPoint {
  const length = Math.hypot(point.x, point.y)
  if (length < 0.001) return { x: 1, y: 0 }
  return { x: point.x / length, y: point.y / length }
}

function distancePointToSegment(point: GraphPoint, start: GraphPoint, end: GraphPoint): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared < 0.001) return Math.hypot(point.x - start.x, point.y - start.y)

  const progress = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
  const projection = {
    x: start.x + progress * dx,
    y: start.y + progress * dy,
  }

  return Math.hypot(point.x - projection.x, point.y - projection.y)
}

function stableSign(value: string): 1 | -1 {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash)
  }

  return Math.abs(hash) % 2 === 0 ? 1 : -1
}

function getQuadraticPoint(start: GraphPoint, control: GraphPoint, end: GraphPoint, progress: number): GraphPoint {
  const reverse = 1 - progress

  return {
    x: reverse * reverse * start.x + 2 * reverse * progress * control.x + progress * progress * end.x,
    y: reverse * reverse * start.y + 2 * reverse * progress * control.y + progress * progress * end.y,
  }
}

function getCenterClearance(visibleNodeCount: number): number {
  if (visibleNodeCount <= 4) return 106
  if (visibleNodeCount <= 8) return 118
  if (visibleNodeCount <= 12) return 130
  return 145
}

function getSecondaryCurveOffset(visibleNodeCount: number, nearCenter: boolean): number {
  const baseOffset = visibleNodeCount <= 4 ? 80 : visibleNodeCount <= 8 ? 115 : visibleNodeCount <= 12 ? 145 : 170
  return nearCenter ? Math.min(190, baseOffset + 24) : baseOffset
}

function getControlPoint(
  id: string,
  source: GraphPoint,
  target: GraphPoint,
  center: GraphPoint,
  isPrimary: boolean,
  visibleNodeCount: number,
): GraphPoint {
  const mid = {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  }
  const lineVector = {
    x: target.x - source.x,
    y: target.y - source.y,
  }
  const normal = normalize({ x: -lineVector.y, y: lineVector.x })

  if (isPrimary) {
    const bend = 14 * stableSign(id)
    return {
      x: mid.x + normal.x * bend,
      y: mid.y + normal.y * bend,
    }
  }

  const fromCenterToMid = {
    x: mid.x - center.x,
    y: mid.y - center.y,
  }
  const nearCenter = distancePointToSegment(center, source, target) < getCenterClearance(visibleNodeCount)
  const outward = Math.hypot(fromCenterToMid.x, fromCenterToMid.y) < 28
    ? { x: normal.x * stableSign(id), y: normal.y * stableSign(id) }
    : normalize(fromCenterToMid)
  const offset = getSecondaryCurveOffset(visibleNodeCount, nearCenter)

  return {
    x: mid.x + outward.x * offset,
    y: mid.y + outward.y * offset,
  }
}

export default function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  data,
  style,
  selected = false,
}: EdgeProps) {
  const edgeData = data as unknown as RelationshipEdgeData | undefined
  const [hovered, setHovered] = useState(false)

  if (!edgeData) {
    return (
      <BaseEdge
        id={id}
        path={`M ${sourceX},${sourceY} L ${targetX},${targetY}`}
        markerEnd={markerEnd}
        style={style}
      />
    )
  }

  const { relationship, isPrimary, lineMetric, centerPosition, visibleNodeCount = 0, showLabel = true } = edgeData
  const source = { x: sourceX, y: sourceY }
  const target = { x: targetX, y: targetY }
  const control = getControlPoint(id, source, target, centerPosition, isPrimary, visibleNodeCount)
  const path = `M ${source.x},${source.y} Q ${control.x},${control.y} ${target.x},${target.y}`
  const labelPoint = getQuadraticPoint(source, control, target, 0.5)
  const baseStyle = getRelationshipEdgeStyle(relationship, { metric: lineMetric, isPrimary })
  const shouldShowLabel = !isPrimary && (showLabel || hovered || selected)
  const edgeStyle: CSSProperties = {
    ...style,
    ...baseStyle,
    opacity: hovered ? Math.min(1, baseStyle.opacity + 0.18) : baseStyle.opacity,
    strokeWidth: hovered ? baseStyle.strokeWidth + 0.45 : baseStyle.strokeWidth,
    filter: isPrimary
      ? 'drop-shadow(0 2px 5px rgba(218,116,139,0.18))'
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
            className="nodrag nopan pointer-events-none rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-ink/58 shadow-[0_8px_18px_rgba(218,116,139,0.08)] ring-1 ring-rose/10 backdrop-blur"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelPoint.x}px, ${labelPoint.y}px)`,
              opacity: showLabel ? 1 : 0.94,
            }}
          >
            {relationship.type}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  )
}
