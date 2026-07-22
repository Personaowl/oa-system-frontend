import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import ShellLayout from '../layouts/ShellLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import OrgView from '../views/OrgView.vue'
import AttendanceView from '../views/AttendanceView.vue'
import ApprovalView from '../views/ApprovalView.vue'
import NoticeView from '../views/NoticeView.vue'
import BoardView from '../views/BoardView.vue'
import AiKnowledgeView from '../views/AiKnowledgeView.vue'
import AiLogView from '../views/AiLogView.vue'
import PayrollView from '../views/PayrollView.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  {
    path: '/',
    component: ShellLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: DashboardView, meta: { title: '总览' } },
      { path: 'org', name: 'org', component: OrgView, meta: { title: '组织权限', roles: ['超级管理员', 'HR 人事'] } },
      { path: 'attendance', name: 'attendance', component: AttendanceView, meta: { title: '考勤打卡' } },
      { path: 'approval', name: 'approval', component: ApprovalView, meta: { title: '审批流程' } },
      { path: 'notice', name: 'notice', component: NoticeView, meta: { title: '公告通知' } },
      { path: 'board', name: 'board', component: BoardView, meta: { title: '数据看板', roles: ['超级管理员', 'HR 人事', '部门主管'] } },
      { path: 'ai-knowledge', name: 'ai-knowledge', component: AiKnowledgeView, meta: { title: '知识文档管理', roles: ['超级管理员'] } },
      { path: 'ai-logs', name: 'ai-logs', component: AiLogView, meta: { title: 'AI 问答日志', roles: ['超级管理员'] } },
      { path: 'payroll', name: 'payroll', component: PayrollView, meta: { title: '工资管理', roles: ['超级管理员', '部门主管'] } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.path !== '/login' && !auth.isAuthed.value) {
    return '/login'
  }
  if (to.path === '/login' && auth.isAuthed.value) {
    return '/dashboard'
  }
  if (to.meta.roles && !to.meta.roles.includes(auth.role.value)) {
    return '/dashboard'
  }
  return true
})

export default router
