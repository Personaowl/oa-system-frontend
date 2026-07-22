<template>
  <div class="content-grid dashboard-page" v-loading="loading">
    <section class="dashboard-welcome panel">
      <div>
        <div class="dashboard-welcome-kicker">PERSONAL WORKSPACE</div>
        <h1>你好，{{ auth.state.profile?.name }}</h1>
        <p>组织、考勤、审批与公告数据已从后端同步。</p>
      </div>
      <div class="dashboard-health">
        <span>数据范围</span>
        <strong>{{ scopeLabel }}</strong>
        <small>{{ scope.scopeNote || '按当前账号权限展示' }}</small>
      </div>
    </section>

    <div class="stat-grid">
      <StatCard title="可见部门" :value="stats.departments" subtitle="当前权限范围" :icon="OfficeBuilding" color="var(--primary)" />
      <StatCard title="可见员工" :value="stats.employees" subtitle="当前权限范围" :icon="User" color="var(--primary-2)" />
      <StatCard :title="isReviewer ? '待我审批' : '我的待审批'" :value="stats.pendingApprovals" subtitle="请假 / 加班流程" :icon="Document" color="var(--accent)" />
      <StatCard title="今日考勤" :value="stats.attendanceToday" subtitle="今日考勤记录" :icon="Clock" color="var(--success)" />
    </div>

    <div class="two-col">
      <ChartPanel title="我的审批趋势" subtitle="近七天可见申请数量" :option="approvalOption" />
      <div class="panel section">
        <SectionTitle title="工作摘要" subtitle="来自各业务服务的实时状态。">
          <template #extra><el-button link type="primary" :icon="Refresh" @click="loadData">刷新</el-button></template>
        </SectionTitle>
        <div class="summary-list">
          <div class="summary-row"><span>当前身份</span><strong>{{ auth.state.profile?.role }}</strong></div>
          <div class="summary-row"><span>今日异常考勤</span><strong>{{ stats.abnormalToday }} 条</strong></div>
          <div class="summary-row"><span>已发布公告</span><strong>{{ stats.noticeCount }} 条</strong></div>
          <div class="summary-row"><span>未读公告</span><strong>{{ stats.unreadNoticeCount }} 条</strong></div>
        </div>
      </div>
    </div>

    <div class="two-col">
      <div class="panel section">
        <SectionTitle title="今日考勤" subtitle="当前数据范围内最近的考勤记录。" />
        <div class="quick-actions">
          <el-button type="primary" :icon="Calendar" @click="$router.push('/attendance')">考勤打卡</el-button>
          <el-button :icon="Document" @click="$router.push('/approval')">提交审批</el-button>
          <el-button :icon="Bell" @click="$router.push('/notice')">公告通知</el-button>
          <el-button v-if="canViewBoard" :icon="TrendCharts" @click="$router.push('/board')">查看看板</el-button>
        </div>
        <el-table class="compact-table" :data="attendanceRows" height="205" empty-text="今日暂无考勤记录">
          <el-table-column prop="employeeName" label="员工" width="120" />
          <el-table-column prop="departmentName" label="部门" width="120" />
          <el-table-column label="上班" width="105"><template #default="{ row }">{{ timeOnly(row.checkInTime) }}</template></el-table-column>
          <el-table-column label="下班" width="105"><template #default="{ row }">{{ timeOnly(row.checkOutTime) }}</template></el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><span class="status-pill" :class="pillClass(row.status)">{{ attendanceStatusText(row.status) }}</span></template>
          </el-table-column>
        </el-table>
      </div>
      <ChartPanel title="部门人员分布" subtitle="当前权限范围内组织结构" :option="deptOption" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { OfficeBuilding, User, Document, Clock, Calendar, Bell, TrendCharts, Refresh } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { getAttendanceScope, listAllAttendanceRecords } from '../api/attendance'
import { listDepartments } from '../api/organization'
import { listMyFlowRequests, listTodoFlowTasks } from '../api/flows'
import { getUnreadNoticeCount, listPublicNotices } from '../api/notices'
import StatCard from '../components/StatCard.vue'
import SectionTitle from '../components/SectionTitle.vue'
import ChartPanel from '../components/ChartPanel.vue'

const auth = useAuthStore()
const loading = ref(false)
const scope = reactive({ dataScope: 'SELF', scopeNote: '', departments: [], users: [] })
const departmentDetails = ref([])
const attendanceRows = ref([])
const myRequests = ref([])
const todoTasks = ref([])
const noticeTotal = ref(0)
const unreadNoticeCount = ref(0)
const isReviewer = computed(() => auth.hasPermission('flow:task:approve'))
const canViewBoard = computed(() => ['超级管理员', 'HR 人事', '部门主管'].includes(auth.role.value))

const stats = computed(() => ({
  departments: scope.departments.length,
  employees: scope.users.length,
  pendingApprovals: isReviewer.value ? todoTasks.value.length : myRequests.value.filter((item) => item.status === 'PENDING').length,
  attendanceToday: attendanceRows.value.length,
  abnormalToday: attendanceRows.value.filter((item) => !['NORMAL', 'IN_PROGRESS'].includes(item.status)).length,
  noticeCount: noticeTotal.value,
  unreadNoticeCount: unreadNoticeCount.value
}))

const scopeLabel = computed(() => ({ ALL_USERS: '全部组织', DEPARTMENT: '负责部门', SELF: '仅本人' }[scope.dataScope] || '当前账号'))

const departmentRows = computed(() => scope.departments.map((department) => {
  const detail = departmentDetails.value.find((item) => String(item.id) === String(department.id))
  return {
    ...department,
    people: scope.users.filter((user) => String(user.departmentId) === String(department.id)).length,
    managers: detail?.managerNames || (scope.dataScope === 'DEPARTMENT' ? [auth.state.profile?.name].filter(Boolean) : [])
  }
}))

const deptOption = computed(() => ({
  tooltip: { trigger: 'item' },
  grid: { left: 30, right: 18, top: 24, bottom: 20, containLabel: true },
  xAxis: { type: 'category', data: departmentRows.value.map((item) => item.name), axisLabel: { interval: 0, rotate: 18 } },
  yAxis: { type: 'value', minInterval: 1 },
  series: [{ type: 'bar', data: departmentRows.value.map((item) => item.people), barWidth: 28, itemStyle: { borderRadius: [8, 8, 0, 0], color: '#2563eb' } }]
}))

const recentDays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (6 - index))
  return { key: localDate(date), label: `${date.getMonth() + 1}/${date.getDate()}` }
}))

const visibleFlows = computed(() => {
  const map = new Map()
  ;[...myRequests.value, ...todoTasks.value].forEach((item) => map.set(String(item.id), item))
  return [...map.values()]
})

const approvalOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 30, right: 18, top: 24, bottom: 20, containLabel: true },
  xAxis: { type: 'category', data: recentDays.value.map((item) => item.label) },
  yAxis: { type: 'value', minInterval: 1 },
  series: [{
    name: '申请数', type: 'line', smooth: true, symbolSize: 8,
    data: recentDays.value.map((day) => visibleFlows.value.filter((item) => String(item.createdAt || '').slice(0, 10) === day.key).length),
    lineStyle: { width: 3, color: '#2563eb' }, itemStyle: { color: '#2563eb' }, areaStyle: { color: 'rgba(37, 99, 235, 0.12)' }
  }]
}))

async function safe(task, fallback, errors) {
  try { return await task } catch (error) { errors.push(error); return fallback }
}

async function loadData() {
  loading.value = true
  const errors = []
  const today = localDate(new Date())
  try {
    const tasks = [
      safe(getAttendanceScope(), { dataScope: 'SELF', scopeNote: '', departments: [], users: [] }, errors),
      safe(listAllAttendanceRecords({ startDate: today, endDate: today }), { items: [] }, errors),
      safe(listMyFlowRequests(), [], errors),
      safe(listPublicNotices({ page: 1, size: 1 }), { total: 0 }, errors),
      safe(getUnreadNoticeCount(), { unreadCount: 0 }, errors),
      isReviewer.value ? safe(listTodoFlowTasks(), [], errors) : Promise.resolve([]),
      auth.hasPermission('sys:dept:list') ? safe(listDepartments(), [], errors) : Promise.resolve([])
    ]
    const [scopeData, attendance, mine, notices, unread, todo, departments] = await Promise.all(tasks)
    Object.assign(scope, scopeData || {})
    attendanceRows.value = attendance?.items || []
    myRequests.value = Array.isArray(mine) ? mine : []
    todoTasks.value = Array.isArray(todo) ? todo : []
    noticeTotal.value = Number(notices?.total || 0)
    unreadNoticeCount.value = Number(unread?.unreadCount || 0)
    departmentDetails.value = Array.isArray(departments) ? departments : []
    if (errors.length) ElMessage.warning(`有 ${errors.length} 项工作台数据暂时无法获取`)
  } finally {
    loading.value = false
  }
}

function localDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function timeOnly(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value).slice(11, 19) : date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })
}

function attendanceStatusText(status) {
  return { IN_PROGRESS: '已上班', NORMAL: '正常', LATE: '迟到', EARLY_LEAVE: '早退', LATE_AND_EARLY_LEAVE: '迟到且早退', MISSING_CHECK_OUT: '缺下班卡' }[status] || status || '未知'
}

function pillClass(status) {
  if (status === 'NORMAL') return 'is-success'
  if (status === 'IN_PROGRESS') return 'is-info'
  return 'is-warning'
}

onMounted(loadData)
</script>
