const CIRCLE_COLORS = ['#f39ab0', '#ffb19f', '#f7c4cf', '#9edac2', '#9fc7f2', '#f5d48b']

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
