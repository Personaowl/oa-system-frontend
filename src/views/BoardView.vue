<template>
  <div class="board-page" v-loading="loading">
    <section class="board-banner">
      <div>
        <span class="board-eyebrow">ORGANIZATION INSIGHTS</span>
        <h1>组织数据看板</h1>
        <p>聚焦组织运行效率，从考勤健康、审批效率和人员结构发现趋势。</p>
      </div>
      <div class="board-banner-actions">
        <el-tag round effect="dark">{{ scopeLabel }}</el-tag>
        <el-button round :icon="Refresh" :loading="loading" @click="loadData">刷新数据</el-button>
      </div>
      <div class="banner-grid" aria-hidden="true"></div>
    </section>

    <section class="stat-grid board-stats">
      <StatCard title="统计员工" :value="stats.employees" :subtitle="scope.scopeNote || '当前管理范围'" :icon="UserFilled" color="#5965e9" />
      <StatCard title="考勤健康度" :value="stats.attendanceRate + '%'" subtitle="近七天正常考勤占比" :icon="CircleCheckFilled" color="#16b88a" />
      <StatCard title="审批完成率" :value="stats.approvalRate + '%'" subtitle="可见流程处理效率" :icon="Finished" color="#f19a38" />
      <StatCard title="异常考勤" :value="stats.abnormalAttendance" subtitle="迟到 / 早退 / 缺卡" :icon="WarningFilled" color="#ec5b70" />
    </section>

    <section class="analytics-grid">
      <div class="analytics-wide"><ChartPanel title="近七日考勤趋势" subtitle="每日记录总量与异常数量对比" :option="attendanceOption" /></div>
      <ChartPanel title="审批流转结构" subtitle="当前范围内的流程状态占比" :option="approvalPieOption" />
      <ChartPanel title="部门人员分布" subtitle="组织规模横向对比" :option="departmentOption" />
      <div class="panel insight-panel">
        <SectionTitle title="运营洞察" subtitle="根据当前数据自动生成摘要" />
        <div class="insight-score">
          <el-progress type="dashboard" :percentage="healthScore" :width="128" :stroke-width="12" color="#5b63e9">
            <template #default="{ percentage }"><strong>{{ percentage }}</strong><span>综合健康度</span></template>
          </el-progress>
        </div>
        <div class="insight-list">
          <div><span class="dot green"></span><p><strong>{{ bestDepartment?.name || '暂无部门' }}</strong><small>当前统计范围人员最多</small></p></div>
          <div><span class="dot orange"></span><p><strong>{{ stats.pendingApprovals }} 项待办</strong><small>建议及时处理审批任务</small></p></div>
          <div><span class="dot blue"></span><p><strong>{{ noticeTotal }} 条公告</strong><small>组织信息持续同步中</small></p></div>
        </div>
      </div>
    </section>

    <section class="panel department-panel">
      <SectionTitle title="部门运行概览" :subtitle="scope.scopeNote || '当前权限范围内的组织数据'">
        <template #extra><el-tag round type="info">共 {{ departmentRows.length }} 个部门</el-tag></template>
      </SectionTitle>
      <el-table :data="departmentRows" empty-text="当前范围暂无部门数据" stripe>
        <el-table-column label="部门" min-width="160">
          <template #default="{ row }"><div class="dept-name"><span>{{ initials(row.name) }}</span><strong>{{ row.name }}</strong></div></template>
        </el-table-column>
        <el-table-column label="负责人" min-width="160"><template #default="{ row }">{{ row.managers.join('、') || '未指定' }}</template></el-table-column>
        <el-table-column prop="people" label="人数" width="100" />
        <el-table-column label="人员占比" min-width="220">
          <template #default="{ row }"><el-progress :percentage="employeeTotal ? Math.round((row.people / employeeTotal) * 100) : 0" :stroke-width="9" color="#6570ea" /></template>
        </el-table-column>
        <el-table-column label="运行状态" width="120"><template #default><el-tag round type="success">运行良好</el-tag></template></el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheckFilled, Finished, Refresh, UserFilled, WarningFilled } from '@element-plus/icons-vue'
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
const scopeLabel = computed(() => ({ ALL_USERS: '全组织视图', DEPARTMENT: '部门视图', SELF: '个人视图' }[scope.dataScope] || '权限视图'))
const recentDays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (6 - index))
  return { key: localDate(date), label: (date.getMonth() + 1) + '/' + date.getDate() }
}))
const departmentRows = computed(() => scope.departments.map((department) => {
  const detail = departmentDetails.value.find((item) => String(item.id) === String(department.id))
  return { ...department, people: scope.users.filter((user) => String(user.departmentId) === String(department.id)).length, managers: detail?.managerNames || (scope.dataScope === 'DEPARTMENT' ? [auth.state.profile?.name].filter(Boolean) : []) }
}))
const bestDepartment = computed(() => [...departmentRows.value].sort((a, b) => b.people - a.people)[0])
const visibleFlows = computed(() => {
  const map = new Map()
  ;[...myRequests.value, ...todoTasks.value, ...doneTasks.value].forEach((item) => map.set(String(item.id), item))
  return [...map.values()]
})
const stats = computed(() => {
  const totalAttendance = attendanceRecords.value.length
  const normalAttendance = attendanceRecords.value.filter((item) => ['NORMAL', 'IN_PROGRESS', 'LEAVE'].includes(item.status)).length
  const finishedFlows = visibleFlows.value.filter((item) => ['APPROVED', 'REJECTED'].includes(item.status)).length
  return {
    employees: scope.users.length,
    abnormalAttendance: totalAttendance - normalAttendance,
    attendanceRate: totalAttendance ? Math.round(normalAttendance / totalAttendance * 100) : 100,
    approvalRate: visibleFlows.value.length ? Math.round(finishedFlows / visibleFlows.value.length * 100) : 100,
    pendingApprovals: todoTasks.value.length
  }
})
const healthScore = computed(() => Math.round(stats.value.attendanceRate * .58 + stats.value.approvalRate * .42))
const chartAxis = { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#8b96aa' } }
const attendanceOption = computed(() => ({
  tooltip: { trigger: 'axis' }, legend: { data: ['考勤记录', '异常'], right: 8, top: 2 },
  grid: { left: 25, right: 18, top: 45, bottom: 15, containLabel: true },
  xAxis: { type: 'category', data: recentDays.value.map((item) => item.label), ...chartAxis },
  yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf0f7', type: 'dashed' } }, ...chartAxis },
  series: [
    { name: '考勤记录', type: 'bar', barWidth: 20, data: recentDays.value.map((day) => attendanceRecords.value.filter((item) => item.workDate === day.key).length), itemStyle: { color: '#6570ea', borderRadius: [7, 7, 0, 0] } },
    { name: '异常', type: 'line', smooth: true, symbolSize: 8, data: recentDays.value.map((day) => attendanceRecords.value.filter((item) => item.workDate === day.key && !['NORMAL', 'IN_PROGRESS', 'LEAVE'].includes(item.status)).length), lineStyle: { width: 3, color: '#f29b42' }, itemStyle: { color: '#f29b42' }, areaStyle: { color: 'rgba(242,155,66,.12)' } }
  ]
}))
const approvalPieOption = computed(() => ({
  tooltip: { trigger: 'item' }, legend: { bottom: 2, icon: 'circle' },
  series: [{ type: 'pie', center: ['50%', '45%'], radius: ['48%', '70%'], padAngle: 3, itemStyle: { borderRadius: 8 },
    label: { show: true, position: 'center', formatter: visibleFlows.value.length + '\n流程总数', fontSize: 14, lineHeight: 22, color: '#24334b' },
    data: [
      { value: visibleFlows.value.filter((item) => item.status === 'PENDING').length, name: '待审批', itemStyle: { color: '#f2a13f' } },
      { value: visibleFlows.value.filter((item) => item.status === 'APPROVED').length, name: '已通过', itemStyle: { color: '#22b889' } },
      { value: visibleFlows.value.filter((item) => item.status === 'REJECTED').length, name: '已驳回', itemStyle: { color: '#ed6278' } }
    ]
  }]
}))
const departmentOption = computed(() => ({
  tooltip: { trigger: 'axis' }, grid: { left: 12, right: 18, top: 10, bottom: 8, containLabel: true },
  xAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf0f7', type: 'dashed' } }, ...chartAxis },
  yAxis: { type: 'category', data: departmentRows.value.slice(0, 6).map((item) => item.name), ...chartAxis },
  series: [{ type: 'bar', barWidth: 14, data: departmentRows.value.slice(0, 6).map((item, index) => ({ value: item.people, itemStyle: { color: ['#6570ea', '#8d67e8', '#21b6c7', '#26b98a', '#f2a13f', '#ed6278'][index % 6], borderRadius: [0, 7, 7, 0] } })) }]
}))
async function safe(task, fallback, errors) { try { return await task } catch (error) { errors.push(error); return fallback } }
async function loadData() {
  loading.value = true
  const errors = []
  try {
    const [scopeData, attendance, mine, todo, done, notices, departments] = await Promise.all([
      safe(getAttendanceScope(), { dataScope: '', scopeNote: '', departments: [], users: [] }, errors),
      safe(listAllAttendanceRecords({ startDate: recentDays.value[0].key, endDate: recentDays.value[6].key }), { items: [] }, errors),
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
    if (errors.length) ElMessage.warning('有 ' + errors.length + ' 项看板数据暂时无法获取')
  } finally { loading.value = false }
}
function localDate(date) { return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') }
function initials(name) { return String(name || '部门').slice(0, 1) }
onMounted(loadData)
</script>

<style scoped>
.board-page{display:grid;gap:18px}.board-banner{position:relative;display:flex;align-items:center;justify-content:space-between;min-height:148px;padding:28px 32px;overflow:hidden;border-radius:22px;background:linear-gradient(125deg,#192c58,#293f79 56%,#335aa0);box-shadow:0 18px 38px rgba(29,52,101,.2);color:#fff}.board-banner>div:not(.banner-grid){position:relative;z-index:2}.board-eyebrow{color:#77e3d1;font-size:11px;font-weight:800;letter-spacing:.16em}.board-banner h1{margin:10px 0 7px;font-size:30px}.board-banner p{margin:0;color:rgba(255,255,255,.7);font-size:13px}.board-banner-actions{display:flex;align-items:center;gap:10px}.board-banner-actions :deep(.el-tag){border-color:rgba(255,255,255,.24);background:rgba(255,255,255,.12);color:#fff}.board-banner-actions :deep(.el-button){border-color:rgba(255,255,255,.2);background:#fff;color:#263d74}.banner-grid{position:absolute;z-index:1;inset:0 0 0 55%;opacity:.18;background-image:linear-gradient(rgba(255,255,255,.28) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.28) 1px,transparent 1px);background-size:24px 24px;transform:skewX(-14deg)}.analytics-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:18px}.analytics-wide{grid-column:1}.analytics-grid :deep(.chart-panel){min-height:360px;border-radius:20px}.analytics-grid :deep(.chart-box){height:280px}.insight-panel{padding:20px 22px;border-radius:20px}.insight-score{display:grid;place-items:center;margin:0 auto 4px}.insight-score strong,.insight-score span{display:block}.insight-score strong{font-size:25px}.insight-score span{margin-top:2px;color:var(--muted);font-size:10px}.insight-list{display:grid;gap:7px}.insight-list>div{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;background:#f7f9fd}.insight-list p{margin:0}.insight-list strong,.insight-list small{display:block}.insight-list strong{font-size:12px}.insight-list small{margin-top:3px;color:var(--muted);font-size:10px}.dot{width:9px;height:9px;flex:0 0 9px;border-radius:50%}.dot.green{background:#1fb889;box-shadow:0 0 0 5px rgba(31,184,137,.12)}.dot.orange{background:#f2a13f;box-shadow:0 0 0 5px rgba(242,161,63,.12)}.dot.blue{background:#6570ea;box-shadow:0 0 0 5px rgba(101,112,234,.12)}.department-panel{padding:22px 24px;border-radius:20px}.dept-name{display:flex;align-items:center;gap:10px}.dept-name span{display:grid;width:34px;height:34px;place-items:center;border-radius:11px;background:linear-gradient(135deg,#e5e9ff,#f1e9ff);color:#5c63dc;font-weight:800}.dept-name strong{font-size:13px}.department-panel :deep(.el-table){border-radius:14px;overflow:hidden}.department-panel :deep(.el-table th.el-table__cell){background:#f5f7fc;color:#6d7890}.board-stats :deep(.metric-card){border-radius:19px}@media(max-width:1050px){.analytics-grid{grid-template-columns:1fr}.analytics-wide{grid-column:auto}}@media(max-width:720px){.board-banner{align-items:flex-start;flex-direction:column;gap:20px}.board-banner-actions{width:100%;justify-content:space-between}}
</style>
