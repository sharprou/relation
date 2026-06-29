const CIRCLE_COLORS = ['#9bb8a7', '#8fb7c7', '#e8b7bd', '#d8a48f', '#c9b8df', '#e4c96f']

export function getCircleColor(circle: string): string {
  let hash = 0
  for (let index = 0; index < circle.length; index += 1) {
    hash = circle.charCodeAt(index) + ((hash << 5) - hash)
  }

  return CIRCLE_COLORS[Math.abs(hash) % CIRCLE_COLORS.length]
}

export function getEdgeWidth(intimacy: number): number {
  if (intimacy >= 80) return 4
  if (intimacy >= 50) return 2.5
  return 1.2
}

export function getEdgeStroke(status: string, emotionalTone: string): string {
  if (status === '冲突') return '#d8755f'
  if (status === '断联') return '#a8a29e'
  if (emotionalTone === '负向') return '#d8755f'
  if (emotionalTone === '正向') return '#7cae91'
  return '#8fb7c7'
}

export function getEdgeDashArray(status: string): string | undefined {
  if (status === '冲突' || status === '断联') return '6 6'
  return undefined
}
