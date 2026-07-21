# OA 办公管理系统前端

基于 Vue 3、Element Plus 和 ECharts 实现的 OA 办公管理系统前端演示项目，面向 JavaEE 企业级开发课程的前后端分离项目交付。

当前版本使用浏览器本地演示数据，已具备登录、角色权限、组织管理、考勤、审批、公告和数据看板等完整页面与交互流程；后续可将本地数据层替换为 Spring Cloud 网关接口。

## 技术栈

- Vue 3
- Vite 5
- Vue Router 4
- Element Plus
- ECharts

## 功能模块

- 登录与会话：演示账号登录、路由守卫、本地令牌持久化、退出登录。
- 组织权限：部门与员工 CRUD、工号校验、RBAC 角色说明、按角色隐藏菜单与拦截页面访问。
- 考勤打卡：上班/下班打卡、当日记录、重复打卡拦截、考勤状态展示。
- 审批流程：请假/加班申请、待办与已办列表、主管审批、员工仅查看个人申请。
- 公告通知：公告列表、按部门可见范围过滤、管理员和 HR 发布公告。
- 数据看板：部门人数、审批占比、考勤趋势等 ECharts 图表。

## 演示账号

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `123456` | 超级管理员 |
| `hr` | `123456` | HR 人事 |
| `manager` | `123456` | 部门主管 |
| `employee` | `123456` | 普通员工 |

## 本地运行

建议使用 Node.js 18 或更高版本。

```bash
npm install
npm run dev
```

开发服务器默认地址：`http://127.0.0.1:5173/`

构建生产包：

```bash
npm run build
npm run preview
```

## 项目结构

```text
src/
  components/      # 通用卡片、图表、标题组件
  layouts/         # 系统主布局与导航菜单
  router/          # 路由和角色守卫
  stores/          # 登录状态与本地演示数据
  views/           # 登录、总览、组织、考勤、审批、公告、看板页面
```

## 后端对接建议

当前 `src/stores/auth.js` 与 `src/stores/oa.js` 为本地演示数据层。对接后端时，将其中的登录、部门、员工、考勤、审批、公告方法替换为对网关 RESTful 接口的请求即可。

建议由网关统一处理 Token 校验和跨域，前端在请求拦截器中携带 JWT：

```http
Authorization: Bearer <token>
```

## 交付说明

- `node_modules/` 与 `dist/` 已通过 `.gitignore` 排除。
- 本项目已推送到 GitHub 的 `dev` 分支。
