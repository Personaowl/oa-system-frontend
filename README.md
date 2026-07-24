# OA 办公管理系统前端

基于 Vue 3、Vite、Element Plus、ECharts 和 Tiptap 构建的企业 OA 管理前端。系统通过统一网关连接后端微服务，并根据登录用户的动态 RBAC 权限控制菜单、路由和操作按钮。

后端仓库：[Personaowl/oa-system-backend](https://github.com/Personaowl/oa-system-backend)

## 技术栈

- Vue 3.5
- Vite 5
- Vue Router 4
- Element Plus
- ECharts 5
- Tiptap 3
- Fetch API、Server-Sent Events

## 页面与功能

- 工作台：个人欢迎区、时间信息、待办审批、公告、考勤和运营摘要。
- 组织管理：部门管理、多负责人选择、员工档案及 Excel 导出。
- 动态 RBAC：创建角色、修改角色、分配功能权限和数据范围。
- 薪资管理：13A—20C 职级、基础薪资、绩效工资和扣除工资。
- 考勤管理：上下班打卡、工时、异常状态、规则、班次、工作日历、补卡及导出。
- 审批流程：请假/加班申请、待办审批、已办记录、撤回和全文检索。
- 公告通知：公告管理、员工阅读、置顶、未读状态和全文检索。
- AI 助手：会话管理、逐字流式输出、Markdown 展示和 RAG 知识问答。
- AI 管理：知识文档导入、处理状态和问答命中日志。
- 共享空间：部门文档创建、查看和富文本编辑。
- 资产管理：办公用品申领、库存、固定资产及审批状态。
- 数据展示：日常数据看板和独立动态数据大屏。
- 账户设置：本地头像上传和密码修改。

## 环境要求

- Node.js 18+
- npm 9+
- 已启动的 OA 后端网关，默认地址为 `http://localhost:8080`

## 安装与启动

```bash
npm install
npm run dev
```

默认访问地址：

```text
http://localhost:5173
```

生产构建与本地预览：

```bash
npm run build
npm run preview
```

## 后端地址

项目默认通过 `.env` 或 `.env.local` 配置网关地址：

```env
VITE_API_BASE_URL=http://localhost:8080
```

所有业务请求均通过网关的 `/api/v1` 路径访问。登录成功后，前端保存 JWT，并自动在后续请求中携带：

```http
Authorization: Bearer <token>
```

## 演示账号

后端执行 `sql/08-demo-organization-data.sql` 后可使用以下账号，密码均为 `123456`：

| 账号 | 身份 | 典型权限 |
| --- | --- | --- |
| `mty-admin` | 超级管理员 | 全部组织与业务管理权限 |
| `mty-hr` | HR 人事 | 人员、薪资和全局考勤数据 |
| `mty-manager` | 部门主管 | 本部门员工、考勤和审批 |
| `mty-employee` | 普通员工 | 个人考勤、申请、公告和文档 |

登录页面不会预填账号或密码。

## 权限机制

前端不再依赖写死的角色名称：

- 菜单和路由根据后端返回的权限编码显示。
- 页面按钮根据操作权限控制。
- 后端负责最终鉴权，前端隐藏功能只用于改善交互体验。
- 角色权限调整后，相关用户重新登录即可获取最新权限。
- 数据范围分为全部数据、本部门数据和仅本人数据。

## 项目结构

```text
picture/               品牌图片
src/
  api/                 各微服务请求封装
  components/          图表、统计卡片和通用标题
  layouts/             主框架、导航、账户设置和 AI 助手
  router/              页面路由与权限守卫
  stores/              登录态和当前用户状态
  styles/              全局样式
  utils/               Markdown 与本地存储工具
  views/               各业务页面
```

## 主要路由

| 路径 | 页面 |
| --- | --- |
| `/dashboard` | 工作台 |
| `/org/departments` | 部门管理 |
| `/org/employees` | 员工管理 |
| `/rbac` | 角色权限 |
| `/salary` | 薪资管理 |
| `/attendance` | 考勤打卡 |
| `/approval` | 审批流程 |
| `/notice` | 公告通知 |
| `/workspace` | 共享空间 |
| `/assets` | 资产管理 |
| `/board` | 数据看板 |
| `/screen` | 数据大屏 |
| `/ai-knowledge` | 知识文档管理 |
| `/ai-logs` | AI 问答日志 |

## 常见问题

### 5173 端口被占用

```powershell
Get-NetTCPConnection -LocalPort 5173
Stop-Process -Id <PID>
```

### 页面空白或接口返回 401

清除浏览器中旧的登录信息后重新登录，并确认网关和对应业务服务已注册到 Nacos。

### 前端能够隐藏按钮，是否等于安全鉴权

不等于。前端权限只控制显示和路由体验，所有敏感操作仍由后端权限校验和数据范围校验保护。

## 构建验证

提交前至少执行：

```bash
npm run build
```

构建产物位于 `dist/`，该目录不提交到 Git。
