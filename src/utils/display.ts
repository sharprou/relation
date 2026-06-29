const UNCATEGORIZED_LABELS = new Set(['未分类', '无分类', ''])

export function isUncategorizedLabel(value?: string): boolean {
  return UNCATEGORIZED_LABELS.has((value ?? '').trim())
}

export function displayCircle(circle?: string): string {
  const value = (circle ?? '').trim()
  if (isUncategorizedLabel(value)) return '普通圈'
  return value
}

export function displayOptionLabel(value: string): string {
  return isUncategorizedLabel(value) ? '普通圈' : value
}

export function cleanVisibleTags(tags: string[] = []): string[] {
  return tags.map((tag) => tag.trim()).filter((tag) => !isUncategorizedLabel(tag))
}

export function cleanFilterOptions(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => !isUncategorizedLabel(value))))
}
