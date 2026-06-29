# 08_Deployment_Guide：部署与 PWA 使用说明

## 部署目标

将关系图谱 PWA 部署到公网静态托管平台，让用户可以通过链接访问，并在手机上添加到主屏幕使用。

本项目是静态前端项目，不需要后端服务器。公网地址只托管 HTML、CSS、JavaScript、图标、manifest 和 service worker。人物、关系、事件、标签、备注和备份文件都不会上传到托管平台。

## 构建项目

```bash
npm install
npm run build
```

构建完成后，静态产物位于：

```text
dist
```

部署平台的输出目录请填写 `dist`。

## Vercel 部署

1. 将代码推送到 GitHub。
2. 打开 Vercel。
3. 点击 Import Project。
4. 选择对应 GitHub 仓库。
5. Framework Preset 选择 Vite。
6. Build Command 使用：

   ```bash
   npm run build
   ```

7. Output Directory 使用：

   ```text
   dist
   ```

8. 部署后打开公网地址。
9. 使用手机 Safari 或 Chrome 打开地址，并添加到主屏幕。

## Netlify 部署

1. 将代码推送到 GitHub。
2. 打开 Netlify。
3. 点击 Add new site。
4. 选择对应 GitHub 仓库。
5. Build Command 使用：

   ```bash
   npm run build
   ```

6. Publish directory 使用：

   ```text
   dist
   ```

7. 部署后打开公网地址并检查 PWA manifest、图标和 service worker。

## Cloudflare Pages 部署

1. 将代码推送到 GitHub。
2. 打开 Cloudflare Pages。
3. 创建 Pages 项目。
4. Framework preset 选择 Vite。
5. Build Command 使用：

   ```bash
   npm run build
   ```

6. Build output directory 使用：

   ```text
   dist
   ```

7. 部署完成后使用公网地址进行验收。

## GitHub Pages 注意事项

GitHub Pages 可以部署本项目，但如果仓库不是部署在根域名下，需要注意 Vite `base` 路径。

例如站点地址为：

```text
https://用户名.github.io/仓库名/
```

则可能需要在 `vite.config.ts` 中配置：

```ts
base: '/仓库名/'
```

同时需要检查 PWA 的 `start_url`、`scope`、manifest 和 icon 路径是否仍然正确。若不确定，优先使用 Vercel、Netlify 或 Cloudflare Pages。

## PWA 检查

构建后检查 `dist/` 中是否存在：

- `manifest.webmanifest`
- `sw.js`
- `workbox-*.js`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/maskable-icon-512.png`
- `favicon.svg`

运行本地预览：

```bash
npm run preview
```

打开预览地址后，在浏览器开发者工具 Application 面板检查：

- Manifest 是否存在
- Service Worker 是否注册
- 图标是否正常显示
- Storage / IndexedDB 中是否能看到 `relationship_graph_db`

## 添加到主屏幕

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

## 数据安全说明

关系图谱 PWA 的业务数据保存在用户当前设备的 IndexedDB 中。部署平台不会保存用户数据，service worker 只缓存应用壳子和静态资源，不读取、不上传 IndexedDB 数据。

用户需要注意：

- 清理浏览器数据可能导致数据丢失。
- 卸载 PWA 或删除站点数据前，应先导出 JSON 备份。
- 换设备时，应先在旧设备导出 JSON，再在新设备导入 JSON。

## 上线前检查

- [ ] `npm run build` 通过
- [ ] `npm run preview` 可打开
- [ ] `/graph` 可打开
- [ ] `/people` 可打开
- [ ] `/events` 可打开
- [ ] `/settings` 可打开
- [ ] manifest 正常
- [ ] service worker 正常
- [ ] icons 不 404
- [ ] IndexedDB 读写正常
- [ ] JSON 导出正常
- [ ] JSON 导入正常
- [ ] 移动端无横向溢出
- [ ] 设置页有数据备份和添加到主屏幕说明
