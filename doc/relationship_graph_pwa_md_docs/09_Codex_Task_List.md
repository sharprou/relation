# 09_Codex_Task_List｜Codex 分阶段开发任务

## 使用方式

不要一次性把全部任务交给 Codex。

推荐方式：

```text
先执行阶段 0。
完成并确认可运行后，再执行阶段 1。
每阶段都要求 Codex 说明修改文件和测试方法。
```

## 全局开发要求

- 使用 React + TypeScript + Vite。
- 使用 Tailwind CSS。
- 使用 IndexedDB + Dexie.js。
- 使用 React Flow 展示图谱。
- 使用 Zustand 管理必要状态。
- 使用 React Router 管理页面。
- 使用 vite-plugin-pwa 实现 PWA。
- 不接入后端。
- 不接入登录。
- 不上传用户数据。
- 不接广告。
- 不接支付。
- 每个阶段必须保证项目可运行。

---

## 阶段 0：项目初始化

### Codex 指令

```text
请创建一个 Vite + React + TypeScript 项目，项目名为 relationship-graph-pwa。

要求：
1. 配置 Tailwind CSS。
2. 安装 react-router-dom、zustand、dexie、@xyflow/react、lucide-react、dayjs、clsx。
3. 创建基础目录：
   - src/app
   - src/pages
   - src/components
   - src/features
   - src/db
   - src/types
   - src/utils
   - src/stores
4. 创建 App.tsx 和路由。
5. 创建四个页面：
   - GraphPage
   - PeoplePage
   - EventsPage
   - SettingsPage
6. 创建底部导航栏。
7. 确保 npm run dev 可以正常运行。

完成后请说明：
- 修改了哪些文件。
- 如何启动项目。
- 如何验证四个页面可以切换。
```

---

## 阶段 1：类型与数据库

### Codex 指令

```text
请为 relationship-graph-pwa 项目创建核心类型和 Dexie 数据库。

要求：
1. 在 src/types/index.ts 中定义：
   - Person
   - Relationship
   - InteractionEvent
   - TagItem
   - AppSettings
   - BackupData
2. 在 src/db/database.ts 中创建 Dexie 数据库。
3. 数据库包含：
   - persons
   - relationships
   - events
   - tags
   - settings
4. 创建 src/utils/id.ts，用于生成 UUID。
5. 创建 src/utils/date.ts，用于生成 ISO 时间字符串。
6. 确保项目可编译。

完成后请说明：
- 数据表结构。
- 如何在浏览器开发者工具查看 IndexedDB。
```

---

## 阶段 2：应用初始化与“我”节点

### Codex 指令

```text
请实现应用初始化逻辑。

要求：
1. 创建 src/features/app/initApp.ts。
2. 启动时检查 persons 表中是否存在 isSelf = true 的人物。
3. 如果不存在，创建默认“我”：
   - name: "我"
   - relationType: "自己"
   - circle: "自我"
   - intimacy: 100
   - trust: 100
   - importance: 5
   - status: "自己"
   - emotionalTone: "正向"
   - isSelf: true
4. 如果已经存在，不重复创建。
5. App 启动时调用 initApp。
6. “我”节点不可删除。

完成后请说明：
- 初始化逻辑位置。
- 如何清空 IndexedDB 测试首次初始化。
```

---

## 阶段 3：人物 CRUD

### Codex 指令

```text
请实现人物管理功能。

要求：
1. PeoplePage 展示人物列表。
2. 支持新增人物。
3. 支持编辑人物。
4. 支持删除人物。
5. 支持人物详情页或详情弹窗。
6. 人物字段包含：
   - name
   - nickname
   - relationType
   - circle
   - intimacy
   - trust
   - importance
   - status
   - emotionalTone
   - tags
   - contactInfo
   - birthday
   - metDate
   - note
7. 姓名必填。
8. 删除人物前二次确认。
9. “我”不可删除。
10. 数据保存到 IndexedDB，刷新后不丢失。

完成后请说明：
- 新增、编辑、删除入口。
- 表单校验规则。
- 如何测试刷新后数据仍存在。
```

---

## 阶段 4：关系自动创建与同步

### Codex 指令

```text
请实现关系数据逻辑。

要求：
1. 新增普通人物时，自动创建一条“我 → 人物”的 Relationship。
2. Relationship 字段包括：
   - sourcePersonId
   - targetPersonId
   - type
   - status
   - intimacy
   - trust
   - emotionalTone
   - note
3. 编辑人物的 relationType、status、intimacy、trust、emotionalTone 时，同步更新对应 Relationship。
4. 删除人物时，同步删除相关 Relationship。
5. 人物详情展示关系数据。

完成后请说明：
- 关系创建逻辑位置。
- 关系同步逻辑位置。
- 如何验证关系表数据。
```

---

## 阶段 5：图谱基础版

### Codex 指令

```text
请实现 GraphPage 图谱基础版。

要求：
1. 使用 @xyflow/react。
2. “我”节点居中。
3. 普通人物节点围绕“我”圆形分布。
4. 每个普通人物和“我”之间有一条关系边。
5. 节点展示人物姓名、关系类型、亲密度。
6. 边的粗细按亲密度变化。
7. 节点颜色按 circle 区分。
8. 点击人物节点进入人物详情。
9. 支持拖拽、缩放和重置视图。
10. 没有人物时展示空状态。

完成后请说明：
- 节点数据如何生成。
- 边数据如何生成。
- 圆形布局算法位置。
```

---

## 阶段 6：事件记录

### Codex 指令

```text
请实现互动事件功能。

要求：
1. EventsPage 展示事件列表。
2. 支持新增事件。
3. 支持编辑事件。
4. 支持删除事件。
5. 人物详情页展示该人物事件时间线。
6. 事件字段包括：
   - title
   - personId
   - eventType
   - eventDate
   - emotionalTone
   - affectRelationship
   - intimacyChange
   - trustChange
   - note
7. 标题必填。
8. 保存事件后更新 Person.lastInteractionAt。
9. 如果 affectRelationship = true，则更新 Person 和 Relationship 的 intimacy/trust。
10. intimacy/trust 限制在 0-100。

完成后请说明：
- 事件影响关系的逻辑位置。
- 如何验证数值边界。
```

---

## 阶段 7：标签、搜索与筛选

### Codex 指令

```text
请实现标签、搜索和筛选功能。

要求：
1. 创建标签管理页。
2. 标签可新增、编辑、删除。
3. 人物表单可选择多个标签。
4. 删除标签时，从所有人物 tags 中移除。
5. PeoplePage 支持搜索：
   - name
   - nickname
   - relationType
   - circle
   - tags
   - note
6. PeoplePage 支持筛选：
   - relationType
   - circle
   - status
   - tags
7. GraphPage 支持相同筛选。
8. 提供清空筛选按钮。

完成后请说明：
- 标签数据如何存储。
- 搜索筛选逻辑位置。
```

---

## 阶段 8：JSON 备份导入

### Codex 指令

```text
请实现 JSON 导出和导入功能。

要求：
1. 创建 src/features/backup/backupService.ts。
2. 导出内容包含：
   - persons
   - relationships
   - events
   - tags
   - settings
   - exportDate
   - appVersion
3. 导出文件名格式：
   relationship_graph_backup_yyyyMMdd_HHmm.json
4. 设置页提供导出按钮。
5. 设置页提供导入按钮。
6. 导入前二次确认。
7. MVP 使用覆盖导入：
   清空当前数据 → 写入导入数据。
8. 导入失败时提示“文件格式错误，无法导入”。
9. 导入完成后检查并确保存在“我”节点。
10. 设置页提供清空全部数据功能，清空后重建“我”。

完成后请说明：
- 导出文件结构。
- 导入校验规则。
- 如何测试错误文件。
```

---

## 阶段 9：PWA 配置

### Codex 指令

```text
请将项目配置为 PWA。

要求：
1. 安装并配置 vite-plugin-pwa。
2. 配置 manifest：
   - name: 关系图谱
   - short_name: 关系图谱
   - display: standalone
   - theme_color: 柔和浅色
   - background_color: 白色
   - icons: 192 和 512
3. 配置 service worker 缓存基础资源。
4. 设置页增加“添加到主屏幕”说明。
5. 提供 iPhone Safari 添加到主屏幕的操作说明。
6. 确保 npm run build 正常。
7. 确保 npm run preview 可预览生产构建。

完成后请说明：
- PWA 配置文件。
- 如何在浏览器检查 manifest。
- 如何测试离线缓存。
```

---

## 阶段 10：部署文档与最终修复

### Codex 指令

```text
请补充部署说明并进行最终修复。

要求：
1. README 中写清楚：
   - 项目介绍
   - 安装依赖
   - 本地运行
   - 构建
   - 部署
   - 用户添加到主屏幕
   - 数据隐私说明
2. 检查移动端样式。
3. 检查空状态。
4. 检查危险操作二次确认。
5. 检查导入导出。
6. 检查图谱页面性能。
7. 不要引入后端、登录、广告、支付。

完成后请说明：
- 当前功能完成情况。
- 尚未完成的后续扩展。
- 推荐部署平台。
```
