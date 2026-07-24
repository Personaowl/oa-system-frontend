# OA 办公管理系统前端

基于 Vue 3、Vite、Element Plus 与 ECharts 的 OA 办公管理系统前端。项目面向前后端分离部署，提供登录、注册、账户设置、组织权限、考勤、审批、公告和数据看板等页面。

## 技术栈

- Vue 3
- Vite 5
- Vue Router 4
- Element Plus
- ECharts

## 功能

- 认证：企业账号登录、账号注册、登录态持久化、退出登录。
- 账户设置：修改用户名和密码；本地预览并保存头像。
- 工作台：角色菜单、固定侧边栏、实时日期时间、前端演示 AI 助手。
- 组织权限：部门与员工管理、角色说明、基于角色的菜单和路由访问控制。
- 业务页面：考勤打卡、审批流程、公告通知、数据看板与 ECharts 图表。
- 异常恢复：页面渲染异常时提供当前页面重新加载入口。

## 环境要求

- Node.js 18 或更高版本
- npm 9 或更高版本
- 可选：运行在 `http://localhost:8080` 的后端服务

## 本地运行

安装依赖并启动开发服务器：

```bash
npm install
npm run dev
```

默认访问地址：`http://127.0.0.1:5173/`。

构建与预览生产包：

```bash
npm run build
npm run preview
```

## 后端接口配置

开发服务器将 `/api` 代理到 `http://localhost:8080`。也可以复制 `.env.example` 为 `.env.local`，并设置后端地址：

```env
VITE_API_BASE_URL=http://localhost:8080
```

认证模块使用以下接口：

| 用途 | 方法 | 路径 |
| --- | --- | --- |
| 登录 | `POST` | `/api/v1/auth/login` |
| 注册 | `POST` | `/api/v1/auth/register` |
| 获取当前用户 | `GET` | `/api/v1/users/me` |
| 修改用户名或密码 | `PUT` | `/api/v1/users/me/account` |

公告模块已接入以下接口：

| 用途 | 方法 | 路径 |
| --- | --- | --- |
| 创建公告 | `POST` | `/api/v1/notices` |
| 更新公告 | `PUT` | `/api/v1/notices/{id}` |
| 删除公告 | `DELETE` | `/api/v1/notices/{id}` |
| 发布公告 | `POST` | `/api/v1/notices/{id}/publish` |
| 下线公告 | `POST` | `/api/v1/notices/{id}/offline` |
| 管理端列表与详情 | `GET` | `/api/v1/notices`、`/api/v1/notices/{id}` |
| 员工公告列表与详情 | `GET` | `/api/v1/notices/public`、`/api/v1/notices/public/{id}` |
| 标记已读与未读数 | `POST` / `GET` | `/api/v1/notices/{id}/read`、`/api/v1/notices/public/unread-count` |

登录与注册请求示例：

```json
{
  "username": "your-account",
  "password": "your-password"
}
```

登录成功后，前端从响应体或响应头读取 Token，并在后续账户更新请求中携带：

```http
Authorization: Bearer <token>
```

默认登录表单预填 `admin` / `123456`，实际可用账号以已启动后端中的数据为准。

## 项目结构

```text
picture/           # 品牌图标与静态图片
src/
  components/      # 图表、统计卡片与页面标题等通用组件
  layouts/         # 主工作台布局、账户设置、AI 助手
  router/          # 路由及角色访问控制
  stores/          # 认证状态与本地演示数据
  styles/          # 全局样式
  views/           # 登录、总览、组织、考勤、审批、公告、看板页面
```

## 说明

- 头像与部分界面演示数据存储在浏览器 `localStorage` 中。
- AI 助手为纯前端演示功能，未调用大模型或后端 AI 服务。
- `node_modules/`、`dist/` 和本地环境变量文件不会提交到 Git。
