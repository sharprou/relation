# 04_Tech_Spec｜技术开发文档

## 1. 技术选型

| 类型 | 技术 |
|---|---|
| 应用类型 | PWA |
| 开发系统 | Windows |
| 编辑器 | VS Code |
| 运行环境 | Node.js LTS |
| 前端框架 | React |
| 开发语言 | TypeScript |
| 构建工具 | Vite |
| 图谱组件 | React Flow |
| 本地数据库 | IndexedDB |
| 数据库封装 | Dexie.js |
| 路由 | React Router |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| PWA 插件 | vite-plugin-pwa |
| 部署方式 | 静态托管 |

## 2. 技术原则

1. 不接入后端服务器。
2. 不接入登录注册。
3. 不上传用户数据。
4. 数据默认存储在用户设备本地 IndexedDB。
5. 支持 JSON 导出导入。
6. 以移动端体验为优先。
7. 所有核心功能离线可用。
8. 项目结构清晰，方便 Codex 分阶段开发。

## 3. 项目结构

```text
relationship-graph-pwa/
├── docs/
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── router.tsx
│   ├── pages/
│   │   ├── GraphPage.tsx
│   │   ├── PeoplePage.tsx
│   │   ├── EventsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── components/
│   │   ├── layout/
│   │   ├── common/
│   │   └── form/
│   ├── features/
│   │   ├── people/
│   │   ├── relationships/
│   │   ├── events/
│   │   ├── tags/
│   │   ├── graph/
│   │   └── backup/
│   ├── db/
│   │   ├── database.ts
│   │   └── schema.ts
│   ├── stores/
│   ├── types/
│   ├── utils/
│   ├── styles/
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

## 4. 依赖建议

```bash
npm create vite@latest relationship-graph-pwa -- --template react-ts

cd relationship-graph-pwa

npm install react-router-dom zustand dexie @xyflow/react
npm install lucide-react clsx dayjs
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
```

说明：

- `@xyflow/react` 是 React Flow 的新包名。
- `dexie` 用于封装 IndexedDB。
- `zustand` 用于轻量状态管理。
- `vite-plugin-pwa` 用于生成 PWA 能力。

## 5. 数据层

### 5.1 IndexedDB

使用 IndexedDB 存储：

- persons
- relationships
- events
- tags
- settings

### 5.2 Dexie 表结构

```ts
import Dexie, { Table } from 'dexie'

export class RelationshipGraphDB extends Dexie {
  persons!: Table<Person, string>
  relationships!: Table<Relationship, string>
  events!: Table<InteractionEvent, string>
  tags!: Table<TagItem, string>
  settings!: Table<AppSettings, string>

  constructor() {
    super('relationship_graph_db')
    this.version(1).stores({
      persons: 'id, name, relationType, circle, isSelf, updatedAt',
      relationships: 'id, sourcePersonId, targetPersonId, type, status',
      events: 'id, personId, eventDate, eventType',
      tags: 'id, name',
      settings: 'id'
    })
  }
}
```

## 6. 数据类型

核心类型放在 `src/types/index.ts`。

```ts
export type EmotionalTone = '正向' | '中性' | '负向' | '复杂'

export interface Person {
  id: string
  name: string
  nickname?: string
  avatar?: string
  relationType: string
  circle: string
  intimacy: number
  trust: number
  importance: number
  status: string
  emotionalTone: EmotionalTone
  tags: string[]
  contactInfo?: string
  birthday?: string
  metDate?: string
  lastInteractionAt?: string
  note?: string
  isSelf: boolean
  createdAt: string
  updatedAt: string
}

export interface Relationship {
  id: string
  sourcePersonId: string
  targetPersonId: string
  type: string
  status: string
  intimacy: number
  trust: number
  emotionalTone: EmotionalTone
  note?: string
  createdAt: string
  updatedAt: string
}

export interface InteractionEvent {
  id: string
  personId: string
  title: string
  eventType: string
  eventDate: string
  emotionalTone: EmotionalTone
  affectRelationship: boolean
  intimacyChange: number
  trustChange: number
  note?: string
  createdAt: string
  updatedAt: string
}

export interface TagItem {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface AppSettings {
  id: string
  appVersion: string
  initialized: boolean
  createdAt: string
  updatedAt: string
}
```

## 7. 图谱实现

### 7.1 使用 React Flow

图谱页使用 React Flow 实现节点和连线。

节点：

- selfNode
- personNode

边：

- relationshipEdge

### 7.2 节点布局

MVP 使用圆形布局。

```ts
export function calculateCircularLayout(persons: Person[]) {
  const center = { x: 0, y: 0 }
  const others = persons.filter(p => !p.isSelf)

  return others.map((person, index) => {
    const angle = (index / Math.max(others.length, 1)) * Math.PI * 2
    const intimacyFactor = (100 - person.intimacy) / 100
    const radius = 180 + intimacyFactor * 140

    return {
      id: person.id,
      position: {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      }
    }
  })
}
```

### 7.3 视觉映射

```ts
export function getEdgeWidth(intimacy: number) {
  if (intimacy >= 80) return 4
  if (intimacy >= 50) return 2.5
  return 1.2
}
```

## 8. PWA 配置

### 8.1 vite-plugin-pwa

`vite.config.ts` 中配置：

```ts
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
  manifest: {
    name: '关系图谱',
    short_name: '关系图谱',
    description: '本地关系图谱记录工具',
    theme_color: '#f5f0ff',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,png,svg,ico}']
  }
})
```

## 9. 备份导入

### 9.1 导出

导出 JSON：

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

### 9.2 导入

导入策略：

```text
读取 JSON
↓
校验格式
↓
二次确认
↓
清空 IndexedDB
↓
写入新数据
↓
检查“我”节点
↓
刷新页面数据
```

## 10. 环境准备

Windows 需要安装：

- VS Code
- Node.js LTS
- Git
- Chrome / Edge

推荐 VS Code 插件：

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- GitLens

## 11. 运行命令

```bash
npm install
npm run dev
npm run build
npm run preview
```

## 12. 部署命令

构建：

```bash
npm run build
```

构建产物：

```text
dist/
```

将 `dist/` 部署到：

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

## 13. 安全与隐私

- 不上传用户数据。
- 不收集埋点。
- 不接广告。
- 不接第三方登录。
- 导出文件由用户自行保存。
- 删除、清空、导入覆盖前必须二次确认。

## 14. 性能建议

- 图谱默认最多展示 100 个节点。
- 超过 100 个节点时提示使用筛选。
- 人物列表使用懒加载或虚拟列表。
- 图谱节点尽量简洁。
- 避免复杂动画。
- 数据导入导出使用异步处理。
