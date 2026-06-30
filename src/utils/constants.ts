import type { EmotionalTone } from '../types'

export const DEFAULT_RELATION_TYPES = [
  '家人',
  '亲戚',
  '恋人',
  '伴侣',
  '暧昧',
  'crush',
  '朋友',
  '好友',
  '闺蜜',
  '密友',
  '发小',
  '室友',
  '同学',
  '同事',
  '上级',
  '下属',
  '前同事',
  '合作方',
  '客户',
  '导师',
  '老师',
  '学生',
  '网友',
  '游戏好友',
  '喜欢的人',
  '前任',
  '前暧昧',
  '邻居',
  '普通认识',
  '需要观察',
  '需要保持距离',
  '其他',
] as const

export const DEFAULT_RELATION_STATUSES = [
  '亲近',
  '正常',
  '疏远',
  '观察',
  '冲突',
  '断联',
  '重要',
] as const

export const DEFAULT_EMOTIONAL_TONES = ['正向', '中性', '负向', '复杂'] as const satisfies readonly EmotionalTone[]

export const DEFAULT_EVENT_TYPES = [
  '认识',
  '聊天',
  '见面',
  '聚会',
  '合作',
  '帮助',
  '争执',
  '冷淡',
  '和好',
  '礼物',
  '重要事件',
  '其他',
] as const
