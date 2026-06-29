# 05_Data_Model｜数据模型与字段说明

## 1. 数据库说明

本项目使用 IndexedDB 作为本地数据库，并通过 Dexie.js 进行封装。

数据库名称：

```text
relationship_graph_db
```

## 2. 表清单

| 表名 | 说明 |
|---|---|
| persons | 人物 |
| relationships | 关系 |
| events | 互动事件 |
| tags | 标签 |
| settings | 应用设置 |

## 3. Person 人物表

### 3.1 字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | UUID |
| name | string | 是 | 姓名 |
| nickname | string | 否 | 昵称 |
| avatar | string | 否 | Base64 或图片 URL |
| relationType | string | 是 | 关系类型 |
| circle | string | 是 | 圈层 |
| intimacy | number | 是 | 亲密度 0-100 |
| trust | number | 是 | 信任度 0-100 |
| importance | number | 是 | 重要程度 1-5 |
| status | string | 是 | 关系状态 |
| emotionalTone | string | 是 | 情绪倾向 |
| tags | string[] | 是 | 标签 ID 或标签名 |
| contactInfo | string | 否 | 联系方式 |
| birthday | string | 否 | 生日 |
| metDate | string | 否 | 认识日期 |
| lastInteractionAt | string | 否 | 最近互动时间 |
| note | string | 否 | 备注 |
| isSelf | boolean | 是 | 是否为“我” |
| createdAt | string | 是 | 创建时间 |
| updatedAt | string | 是 | 更新时间 |

### 3.2 示例

```json
{
  "id": "p_001",
  "name": "小明",
  "nickname": "明明",
  "relationType": "朋友",
  "circle": "学校",
  "intimacy": 75,
  "trust": 80,
  "importance": 4,
  "status": "亲近",
  "emotionalTone": "正向",
  "tags": ["可靠", "老朋友"],
  "contactInfo": "",
  "birthday": "2000-01-01",
  "metDate": "2020-09-01",
  "lastInteractionAt": "2026-06-29T12:00:00.000Z",
  "note": "大学认识的朋友。",
  "isSelf": false,
  "createdAt": "2026-06-29T12:00:00.000Z",
  "updatedAt": "2026-06-29T12:00:00.000Z"
}
```

## 4. Relationship 关系表

### 4.1 字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | UUID |
| sourcePersonId | string | 是 | 起点人物 |
| targetPersonId | string | 是 | 终点人物 |
| type | string | 是 | 关系类型 |
| status | string | 是 | 关系状态 |
| intimacy | number | 是 | 亲密度 |
| trust | number | 是 | 信任度 |
| emotionalTone | string | 是 | 情绪倾向 |
| note | string | 否 | 备注 |
| createdAt | string | 是 | 创建时间 |
| updatedAt | string | 是 | 更新时间 |

### 4.2 示例

```json
{
  "id": "r_001",
  "sourcePersonId": "self",
  "targetPersonId": "p_001",
  "type": "朋友",
  "status": "亲近",
  "intimacy": 75,
  "trust": 80,
  "emotionalTone": "正向",
  "note": "",
  "createdAt": "2026-06-29T12:00:00.000Z",
  "updatedAt": "2026-06-29T12:00:00.000Z"
}
```

## 5. InteractionEvent 事件表

### 5.1 字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | UUID |
| personId | string | 是 | 关联人物 |
| title | string | 是 | 事件标题 |
| eventType | string | 是 | 事件类型 |
| eventDate | string | 是 | 事件日期 |
| emotionalTone | string | 是 | 情绪倾向 |
| affectRelationship | boolean | 是 | 是否影响关系 |
| intimacyChange | number | 是 | 亲密度变化 |
| trustChange | number | 是 | 信任度变化 |
| note | string | 否 | 备注 |
| createdAt | string | 是 | 创建时间 |
| updatedAt | string | 是 | 更新时间 |

### 5.2 示例

```json
{
  "id": "e_001",
  "personId": "p_001",
  "title": "一起吃饭",
  "eventType": "见面",
  "eventDate": "2026-06-29",
  "emotionalTone": "正向",
  "affectRelationship": true,
  "intimacyChange": 5,
  "trustChange": 0,
  "note": "聊得很开心。",
  "createdAt": "2026-06-29T12:00:00.000Z",
  "updatedAt": "2026-06-29T12:00:00.000Z"
}
```

## 6. TagItem 标签表

### 6.1 字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | UUID |
| name | string | 是 | 标签名 |
| color | string | 是 | 颜色 |
| createdAt | string | 是 | 创建时间 |

### 6.2 示例

```json
{
  "id": "tag_001",
  "name": "可靠",
  "color": "#86efac",
  "createdAt": "2026-06-29T12:00:00.000Z"
}
```

## 7. AppSettings 设置表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 固定为 default |
| appVersion | string | 是 | 应用版本 |
| initialized | boolean | 是 | 是否已初始化 |
| createdAt | string | 是 | 创建时间 |
| updatedAt | string | 是 | 更新时间 |

## 8. 默认配置

### 8.1 默认关系类型

```json
[
  "家人",
  "亲戚",
  "朋友",
  "好友",
  "同学",
  "同事",
  "上级",
  "下属",
  "前同事",
  "合作方",
  "网友",
  "游戏好友",
  "喜欢的人",
  "前任",
  "普通认识",
  "需要观察",
  "需要保持距离"
]
```

### 8.2 默认状态

```json
[
  "亲近",
  "正常",
  "疏远",
  "观察",
  "冲突",
  "断联",
  "重要"
]
```

### 8.3 默认情绪倾向

```json
[
  "正向",
  "中性",
  "负向",
  "复杂"
]
```

### 8.4 默认事件类型

```json
[
  "认识",
  "聊天",
  "见面",
  "聚会",
  "合作",
  "帮助",
  "争执",
  "冷淡",
  "和好",
  "礼物",
  "重要事件",
  "其他"
]
```

## 9. 数据校验

| 字段 | 规则 |
|---|---|
| name | 不可为空 |
| intimacy | 0-100 |
| trust | 0-100 |
| importance | 1-5 |
| tags | 数组 |
| createdAt | ISO 字符串 |
| updatedAt | ISO 字符串 |

## 10. 备份数据结构

```ts
export interface BackupData {
  persons: Person[]
  relationships: Relationship[]
  events: InteractionEvent[]
  tags: TagItem[]
  settings: AppSettings[]
  exportDate: string
  appVersion: string
}
```
