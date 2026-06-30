import type { Relationship } from '../../types'

const CIRCLE_COLORS = ['#f39ab0', '#ffb19f', '#f7c4cf', '#9edac2', '#9fc7f2', '#f5d48b']

export type GraphLineMetric = 'intimacy' | 'trust'

interface RelationshipEdgeStyleOptions {
  metric: GraphLineMetric
  isPrimary: boolean
}

export interface GraphLegendItem {
  color: string
  label: string
}

export function getCircleColor(circle: string): string {
  let hash = 0
  for (let index = 0; index < circle.length; index += 1) {
    hash = circle.charCodeAt(index) + ((hash << 5) - hash)
  }

  return CIRCLE_COLORS[Math.abs(hash) % CIRCLE_COLORS.length]
}

export function getEdgeWidth(intimacy: number): number {
  if (intimacy >= 80) return 3.2
  if (intimacy >= 50) return 2.7
  return 2.2
}

export function getSecondaryEdgeWidth(intimacy: number): number {
  if (intimacy >= 80) return 1.8
  if (intimacy >= 50) return 1.55
  return 1.35
}

function getIntimacyStroke(value: number): string {
  if (value >= 80) return '#f5a375'
  if (value >= 60) return '#ef8fae'
  if (value >= 40) return '#e8bfc8'
  if (value >= 20) return '#dfcbd1'
  return '#eadde1'
}

function getTrustStroke(value: number): string {
  if (value >= 80) return '#8bd8c4'
  if (value >= 50) return '#9fc7f2'
  return '#d7dbe6'
}

function getMetricStroke(relationship: Relationship, metric: GraphLineMetric): string {
  return metric === 'trust'
    ? getTrustStroke(relationship.trust)
    : getIntimacyStroke(relationship.intimacy)
}

export function getEdgeStroke(status: string, emotionalTone: string, intimacy: number): string {
  if (status === '冲突') return '#ef8fa4'
  if (status === '断联') return '#d8cdd0'
  if (emotionalTone === '负向') return '#efa4ae'
  if (intimacy >= 80) return '#f5a375'
  if (intimacy >= 60) return '#ef8fae'
  return '#e8bfc8'
}

export function getSecondaryEdgeStroke(status: string, emotionalTone: string, intimacy: number): string {
  if (status === '冲突') return '#f1a9b8'
  if (status === '断联' || status === '暂停') return '#ded2d6'
  if (emotionalTone === '负向') return '#eeb2ba'
  if (intimacy >= 80) return '#f2bd91'
  if (intimacy >= 60) return '#f0a7ba'
  return '#b8d7f7'
}

export function getEdgeDashArray(status: string): string | undefined {
  if (status === '冲突' || status === '断联') return '6 6'
  return undefined
}

export function getRelationshipEdgeStyle(relationship: Relationship, options: RelationshipEdgeStyleOptions) {
  const baseStroke = getMetricStroke(relationship, options.metric)
  const statusStroke = relationship.status === '冲突' || relationship.status === '断联'
    ? getEdgeStroke(relationship.status, relationship.emotionalTone, relationship.intimacy)
    : baseStroke

  return {
    stroke: statusStroke,
    strokeWidth: options.isPrimary ? getEdgeWidth(relationship.intimacy) : getSecondaryEdgeWidth(relationship.intimacy),
    strokeDasharray: getEdgeDashArray(relationship.status),
    strokeLinecap: 'round' as const,
    opacity: options.isPrimary ? 0.88 : 0.58,
  }
}

export function getRelationshipLegendItems(metric: GraphLineMetric): GraphLegendItem[] {
  if (metric === 'trust') {
    return [
      { color: '#8bd8c4', label: '80-100 高信任' },
      { color: '#9fc7f2', label: '50-79 稳定' },
      { color: '#d7dbe6', label: '0-49 待建立' },
    ]
  }

  return [
    { color: '#f5a375', label: '80-100 很亲近' },
    { color: '#ef8fae', label: '60-79 亲近' },
    { color: '#e8bfc8', label: '40-59 熟悉' },
    { color: '#dfcbd1', label: '20-39 较淡' },
    { color: '#eadde1', label: '0-19 很淡' },
  ]
}
