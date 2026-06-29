# 关系图谱 PWA 项目文档包

## 项目定位

本项目是一款 **PWA 本地关系图谱工具**。

用户可以通过网页链接打开应用，并将其添加到手机主屏幕。应用像软件一样从桌面图标打开，但本质是 PWA Web App。

## 核心方案

- 开发系统：Windows
- 应用类型：PWA
- 前端框架：React + TypeScript
- 构建工具：Vite
- 图谱展示：React Flow
- 本地数据库：IndexedDB
- 数据库封装：Dexie.js
- 样式方案：Tailwind CSS
- 状态管理：Zustand
- PWA 支持：vite-plugin-pwa
- 部署方式：静态网页托管
- 数据存储：用户设备本地
- 后端服务器：不需要
- 账号系统：不需要
- 上架商店：不需要

## 使用方式

朋友使用流程：

```text
打开你发的链接
↓
使用 Safari / Chrome 打开
↓
添加到主屏幕
↓
桌面出现“关系图谱”图标
↓
以后像软件一样打开
```

## 数据原则

公网地址只负责分发应用文件，不保存用户关系数据。

用户数据包括：

- 人物
- 关系
- 事件
- 标签
- 备注
- 图谱布局

这些都保存在用户自己的手机或电脑浏览器本地 IndexedDB 中。

## 文档目录

```text
docs/
├── 00_Project_Brief.md
├── 01_PRD.md
├── 02_Function_Spec.md
├── 03_UI_UX_Spec.md
├── 04_Tech_Spec.md
├── 05_Data_Model.md
├── 06_Dev_Plan.md
├── 07_Test_Plan.md
├── 08_Deployment_Guide.md
├── 09_Codex_Task_List.md
└── 10_Iteration_Log.md
```

## 推荐开发顺序

1. 创建 Vite + React + TypeScript 项目。
2. 接入 Tailwind CSS。
3. 接入 Dexie.js 和 IndexedDB。
4. 完成人物 CRUD。
5. 完成关系数据。
6. 完成 React Flow 图谱。
7. 完成事件记录。
8. 完成 JSON 导入导出。
9. 接入 vite-plugin-pwa。
10. 部署到静态托管平台。
