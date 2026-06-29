# 关系图谱 PWA

关系图谱 PWA 是一个本地优先的个人关系记录工具。它帮助用户记录人物、关系、互动事件和标签，并通过图谱视图查看“我”和其他人物之间的关系网络。

项目是纯前端 PWA，不需要后端服务，不接入登录注册，不上传用户数据。业务数据保存在当前设备浏览器的 IndexedDB 中，用户可以通过 JSON 文件导出和导入备份。

## 技术栈

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Dexie.js
- IndexedDB
- React Flow / @xyflow/react
- vite-plugin-pwa

## 本地开发

```bash
npm install
npm run dev
```

启动后打开终端显示的本地地址，通常是 `http://127.0.0.1:5173/` 或 `http://localhost:5173/`。

## 构建

```bash
npm run build
```

构建产物会输出到 `dist/`。

## 本地预览

```bash
npm run preview
```

预览会使用 `dist/` 中的生产构建结果，适合检查 PWA manifest、service worker 和静态资源路径。

## 数据存储说明

- 数据保存在当前设备浏览器的 IndexedDB 中。
- 项目不会上传人物、关系、事件、标签、备注或备份文件。
- 更换设备、清理浏览器缓存、删除网站数据、卸载 PWA，可能导致本地数据丢失。
- 建议定期在设置页导出 JSON 备份。
- 换设备时，请先在旧设备导出 JSON，再在新设备打开应用并导入 JSON。

## PWA 使用说明

### iPhone / Safari

1. 使用 Safari 打开应用链接。
2. 点击底部分享按钮。
3. 选择“添加到主屏幕”。
4. 回到桌面后，可以像 App 一样打开“关系图谱”。

### Android / Chrome

1. 使用 Chrome 打开应用链接。
2. 点击右上角菜单。
3. 选择“添加到主屏幕”或“安装应用”。
4. 回到桌面后，可以像 App 一样打开“关系图谱”。

添加到主屏幕后，数据仍然只保存在当前设备本地，不会上传到服务器。

## 部署说明

这是静态前端项目，不需要后端服务器。可以部署到：

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

通用配置：

```text
Build Command: npm run build
Output Directory: dist
```

如果部署到 GitHub Pages 且站点不在根域名下，可能需要额外配置 Vite `base` 路径，并同步检查 PWA 的 `start_url`、`scope` 和图标路径。

## 功能范围

当前版本包含：

- 应用初始化和“我”节点
- 人物 CRUD
- 关系自动创建与同步
- 图谱视图
- 事件记录
- 标签、搜索和筛选
- JSON 备份导出 / 导入
- PWA manifest、service worker 和添加到主屏幕说明

当前版本不包含：

- 后端服务
- 登录注册
- 云同步
- 多人协作
- 广告
- 支付
- 统计 SDK
- AI 分析
