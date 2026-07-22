<template>
  <div class="content-grid board-page" v-loading="loading">
    <div class="page-head">
      <div>
        <h1 class="page-title">数据看板</h1>
        <p class="page-subtitle">按当前账号权限展示近七天组织、考勤、审批与公告数据。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="loadData">刷新数据</el-button>
    </div>

    <div class="stat-grid">
      <StatCard title="可见部门" :value="stats.departments" :subtitle="scope.scopeNote || '当前权限范围'" :icon="OfficeBuilding" color="var(--primary)" />
      <StatCard title="异常考勤" :value="stats.abnormalAttendance" subtitle="近七天迟到 / 早退 / 缺卡" :icon="WarningFilled" color="var(--warning)" />
      <StatCard title="审批待办" :value="stats.pendingApprovals" subtitle="分配给我的待办" :icon="Clock" color="var(--accent)" />
      <StatCard title="已发布公告" :value="stats.noticeCount" subtitle="当前可查看公告" :icon="Bell" color="var(--primary-2)" />
    </div>

    <div class="two-col">
      <ChartPanel title="考勤趋势" subtitle="近七天考勤记录与异常走势" :option="attendanceOption" />
      <ChartPanel title="我的审批状态" subtitle="当前账号可见的审批单据" :option="approvalPieOption" />
    </div>

    <div class="panel section">
      <SectionTitle title="部门数据明细" :subtitle="scope.scopeNote || '当前权限范围内的部门与人员统计。'" />
      <el-table :data="departmentRows" border empty-text="当前范围暂无部门数据">
        <el-table-column prop="name" label="部门" />
        <el-table-column label="负责人" min-width="150">
          <template #default="{ row }">{{ row.managers.join('、') || '未指定' }}</template>
        </el-table-column>
        <el-table-column prop="people" label="人数" width="100" />
        <el-table-column label="范围内占比" min-width="180">
          <template #default="{ row }"><el-progress :percentage="employeeTotal ? Math.round((row.people / employeeTotal) * 100) : 0" /></template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Bell, Clock, OfficeBuilding, Refresh, WarningFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { getAttendanceScope, listAllAttendanceRecords } from '../api/attendance'
import { listDepartments } from '../api/organization'
import { listDoneFlowTasks, listMyFlowRequests, listTodoFlowTasks } from '../api/flows'
import { listPublicNotices } from '../api/notices'
import StatCard from '../components/StatCard.vue'
import SectionTitle from '../components/SectionTitle.vue'
import ChartPanel from '../components/ChartPanel.vue'

const auth = useAuthStore()
const loading = ref(false)
const scope = reactive({ dataScope: '', scopeNote: '', departments: [], users: [] })
const departmentDetails = ref([])
const attendanceRecords = ref([])
const myRequests = ref([])
const todoTasks = ref([])
const doneTasks = ref([])
const noticeTotal = ref(0)
const employeeTotal = computed(() => scope.users.length)
const isReviewer = computed(() => auth.hasPermission('flow:task:approve'))

const recentDays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (6 - index))
  return { key: localDate(date), label: `${date.getMonth() + 1}/${date.getDate()}` }
}))

const departmentRows = computed(() => scope.departments.map((department) => {
  const detail = departmentDetails.value.find((item) => String(item.id) === String(department.id))
  return {
    ...department,
    people: scope.users.filter((user) => String(user.departmentId) === String(department.id)).length,
    managers: detail?.managerNames || (scope.dataScope === 'DEPARTMENT' ? [auth.state.profile?.name].filter(Boolean) : [])
  }
}))

const visibleFlows = computed(() => {
  const map = new Map()
  ;[...myRequests.value, ...todoTasks.value, ...doneTasks.value].forEach((item) => map.set(String(item.id), item))
  return [...map.values()]
})

const stats = computed(() => ({
  departments: scope.departments.length,
  abnormalAttendance: attendanceRecords.value.filter((item) => !['NORMAL', 'IN_PROGRESS'].includes(item.status)).length,
  pendingApprovals: todoTasks.value.length,
  noticeCount: noticeTotal.value
}))

const attendanceOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['考勤记录', '异常'] },
  grid: { left: 30, right: 20, top: 40, bottom: 20, containLabel: true },
  xAxis: { type: 'category', data: recentDays.value.map((item) => item.label) },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    { name: '考勤记录', type: 'bar', data: recentDays.value.map((day) => attendanceRecords.value.filter((item) => item.workDate === day.key).length), itemStyle: { color: '#2563eb' } },
    { name: '异常', type: 'line', data: recentDays.value.map((day) => attendanceRecords.value.filter((item) => item.workDate === day.key && !['NORMAL', 'IN_PROGRESS'].includes(item.status)).length), smooth: true, itemStyle: { color: '#d97706' } }
  ]
}))

const approvalPieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { top: 20 },
  series: [{
    type: 'pie', radius: ['40%', '68%'], label: { show: false }, labelLine: { show: false },
    data: [
      { value: visibleFlows.value.filter((item) => item.status === 'PENDING').length, name: '待审批' },
      { value: visibleFlows.value.filter((item) => item.status === 'APPROVED').length, name: '已通过' },
      { value: visibleFlows.value.filter((item) => item.status === 'REJECTED').length, name: '已驳回' }
    ]
  }]
}))

async function safe(task, fallback, errors) {
  try { return await task } catch (error) { errors.push(error); return fallback }
}

async function loadData() {
  loading.value = true
  const errors = []
  const startDate = recentDays.value[0].key
  const endDate = recentDays.value[6].key
  try {
    const [scopeData, attendance, mine, todo, done, notices, departments] = await Promise.all([
      safe(getAttendanceScope(), { dataScope: '', scopeNote: '', departments: [], users: [] }, errors),
      safe(listAllAttendanceRecords({ startDate, endDate }), { items: [] }, errors),
      safe(listMyFlowRequests(), [], errors),
      isReviewer.value ? safe(listTodoFlowTasks(), [], errors) : Promise.resolve([]),
      isReviewer.value ? safe(listDoneFlowTasks(), [], errors) : Promise.resolve([]),
      safe(listPublicNotices({ page: 1, size: 1 }), { total: 0 }, errors),
      auth.hasPermission('sys:dept:list') ? safe(listDepartments(), [], errors) : Promise.resolve([])
    ])
    Object.assign(scope, scopeData || {})
    attendanceRecords.value = attendance?.items || []
    myRequests.value = Array.isArray(mine) ? mine : []
    todoTasks.value = Array.isArray(todo) ? todo : []
    doneTasks.value = Array.isArray(done) ? done : []
    noticeTotal.value = Number(notices?.total || 0)
    departmentDetails.value = Array.isArray(departments) ? departments : []
    if (errors.length) ElMessage.warning(`有 ${errors.length} 项看板数据暂时无法获取`)
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

onMounted(loadData)
</script>
