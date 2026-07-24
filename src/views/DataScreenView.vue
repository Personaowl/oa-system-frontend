<template>
  <main class="data-screen">
    <div class="screen-ambient ambient-one"></div>
    <div class="screen-ambient ambient-two"></div>
    <div class="screen-grid-bg"></div>

    <header class="screen-header">
      <div class="screen-brand">
        <button class="icon-button" title="返回数据看板" @click="router.push('/board')">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <div>
          <span>PERSONA OFFICE · LIVE CENTER</span>
          <strong>智慧办公运营中心</strong>
        </div>
      </div>
      <div class="screen-title">
        <i></i>
        <div>
          <small>OA OPERATION DATA SCREEN</small>
          <h1>企业运营数据大屏</h1>
        </div>
        <i></i>
      </div>
      <div class="screen-tools">
        <div class="live-state"><span></span> 数据实时同步</div>
        <div class="screen-time"><strong>{{ timeText }}</strong><span>{{ dateText }}</span></div>
        <button class="icon-button" title="刷新数据" :class="{ spinning: loading }" @click="loadData">
          <el-icon><Refresh /></el-icon>
        </button>
        <button class="icon-button" :title="isFullscreen ? '退出全屏' : '进入全屏'" @click="toggleFullscreen">
          <el-icon><component :is="isFullscreen ? Aim : FullScreen" /></el-icon>
        </button>
      </div>
    </header>

    <section class="screen-summary">
      <div class="scope-copy">
        <span>{{ scopeLabel }}</span>
        <strong>{{ auth.state.profile?.department || '全组织' }}</strong>
        <small>{{ scope.scopeNote || '按照当前账号权限聚合展示' }}</small>
      </div>
      <div v-for="(item, index) in metricCards" :key="item.label" class="screen-metric" :style="{ '--delay': `${index * 80}ms`, '--tone': item.color, '--soft': item.soft }">
        <span class="metric-icon"><el-icon><component :is="item.icon" /></el-icon></span>
        <div>
          <small>{{ item.label }}</small>
          <strong>{{ item.value }}<em>{{ item.unit }}</em></strong>
          <span>{{ item.hint }}</span>
        </div>
        <i class="metric-wave"></i>
      </div>
    </section>

    <section class="visual-grid">
      <ScreenChart class="trend-panel" title="近七日考勤趋势" kicker="ATTENDANCE TREND" :badge="`健康度 ${healthScore}%`" :option="attendanceTrendOption" />
      <ScreenChart title="部门人员分布" kicker="ORGANIZATION MAP" :badge="`${departmentRows.length} 个部门`" :option="departmentOption" />
      <ScreenChart title="审批流转状态" kicker="WORKFLOW STATUS" :badge="`${flowRows.length} 条流程`" :option="approvalOption" />
      <ScreenChart title="今日出勤结构" kicker="TODAY ATTENDANCE" :badge="todayLabel" :option="todayAttendanceOption" />

      <section class="screen-panel ranking-panel">
        <header class="simple-panel-head">
          <div><span>DEPARTMENT RANK</span><h3>部门规模排行</h3></div>
          <em>TOP {{ Math.min(6, departmentRows.length) }}</em>
        </header>
        <div class="ranking-list">
          <div v-for="(department, index) in departmentRows.slice(0, 6)" :key="department.id" class="ranking-row">
            <span class="ranking-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="ranking-main">
              <div><strong>{{ department.name }}</strong><span>{{ department.people }} 人</span></div>
              <i><b :style="{ width: departmentPercent(department.people) + '%' }"></b></i>
            </div>
          </div>
          <el-empty v-if="!departmentRows.length" description="暂无部门数据" :image-size="62" />
        </div>
      </section>

      <section class="screen-panel notice-panel">
        <header class="simple-panel-head">
          <div><span>INFORMATION STREAM</span><h3>最新公告动态</h3></div>
          <em>{{ noticeTotal }} 条</em>
        </header>
        <div class="notice-stream">
          <article v-for="(notice, index) in noticeItems" :key="notice.id">
            <span class="notice-dot" :class="`tone-${index % 4}`"></span>
            <div><strong>{{ notice.title }}</strong><small>{{ notice.summary || '组织公告已更新，请及时查看' }}</small></div>
            <time>{{ shortDate(notice.publishedAt) }}</time>
          </article>
          <el-empty v-if="!noticeItems.length" description="暂无公告动态" :image-size="62" />
        </div>
      </section>

      <ScreenChart title="固定资产状态" kicker="ASSET LIFECYCLE" :badge="`${assetOverview.fixedAssetCount || 0} 件资产`" :option="assetStatusOption" />

      <section class="screen-panel collaboration-panel">
        <header class="simple-panel-head">
          <div><span>COLLABORATION &amp; INVENTORY</span><h3>协同空间与物资运行</h3></div>
          <em>{{ documentWorkspaces.length }} 个工作空间</em>
        </header>
        <div class="collaboration-body">
          <div class="collaboration-stats">
            <div><el-icon><FolderOpened /></el-icon><span>共享文档<strong>{{ documentCount }}</strong><small>部门知识持续沉淀</small></span></div>
            <div><el-icon><Present /></el-icon><span>用品种类<strong>{{ assetOverview.supplyKinds || 0 }}</strong><small>办公用品库存台账</small></span></div>
            <div :class="{ alert: assetOverview.lowStockKinds }"><el-icon><WarningFilled /></el-icon><span>库存预警<strong>{{ assetOverview.lowStockKinds || 0 }}</strong><small>低于或等于安全库存</small></span></div>
            <div><el-icon><Tickets /></el-icon><span>申领待办<strong>{{ assetOverview.pendingRequests || 0 }}</strong><small>当前权限范围内待处理</small></span></div>
          </div>
          <div class="workspace-overview">
            <div v-for="workspace in documentWorkspaces.slice(0, 5)" :key="workspace.departmentId" class="workspace-row">
              <span>{{ workspace.departmentName }}</span>
              <i><b :style="{ width: workspacePercent(workspace.documentCount) + '%' }"></b></i>
              <strong>{{ workspace.documentCount || 0 }} 篇</strong>
            </div>
            <el-empty v-if="!documentWorkspaces.length" description="暂无共享文档" :image-size="54" />
          </div>
        </div>
      </section>
    </section>

    <footer class="screen-footer">
      <span><i></i> 数据来源：用户、考勤、审批、公告、文档与资产服务</span>
      <strong>上次同步 {{ lastUpdatedText }}</strong>
      <span>每 60 秒自动刷新 <i></i></span>
    </footer>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Aim,
  ArrowLeft,
  Box,
  Calendar,
  DocumentChecked,
  FolderOpened,
  FullScreen,
  Present,
  Refresh,
  Tickets,
  WarningFilled,
  UserFilled
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { getAttendanceScope, listAllAttendanceRecords } from '../api/attendance'
import { listDoneFlowTasks, listMyFlowRequests, listTodoFlowTasks } from '../api/flows'
import { listPublicNotices } from '../api/notices'
import { getAssetOverview, listSupplies } from '../api/assets'
import { listDocumentWorkspaces } from '../api/documents'
import ScreenChart from '../components/ScreenChart.vue'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const now = ref(new Date())
const lastUpdated = ref(new Date())
const isFullscreen = ref(Boolean(document.fullscreenElement))
const scope = reactive({ dataScope: '', scopeNote: '', departments: [], users: [] })
const attendanceRecords = ref([])
const myRequests = ref([])
const todoTasks = ref([])
const doneTasks = ref([])
const noticeItems = ref([])
const noticeTotal = ref(0)
const assetOverview = reactive({ supplyKinds: 0, lowStockKinds: 0, pendingRequests: 0, fixedAssetCount: 0, inUseAssets: 0, idleAssets: 0 })
const supplies = ref([])
const documentWorkspaces = ref([])
const displayMetrics = reactive({ employees: 0, attendance: 0, pending: 0, assets: 0, documents: 0, lowStock: 0 })
let clockTimer
let refreshTimer
let numberAnimation

const isReviewer = computed(() => auth.hasPermission('flow:task:approve'))
const scopeLabel = computed(() => ({ ALL_USERS: '全组织运营视图', DEPARTMENT: '负责部门运营视图', SELF: '个人数据视图' }[scope.dataScope] || '权限范围视图'))
const todayKey = computed(() => localDate(now.value))
const todayLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(now.value))
const timeText = computed(() => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now.value))
const dateText = computed(() => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).format(now.value))
const lastUpdatedText = computed(() => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(lastUpdated.value))
const recentDays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date(now.value)
  date.setDate(date.getDate() - (6 - index))
  return { key: localDate(date), label: `${date.getMonth() + 1}/${date.getDate()}` }
}))
const flowRows = computed(() => {
  const map = new Map()
  ;[...myRequests.value, ...todoTasks.value, ...doneTasks.value].forEach((item) => map.set(String(item.id), item))
  return [...map.values()]
})
const todayRecords = computed(() => attendanceRecords.value.filter((item) => item.workDate === todayKey.value))
const normalTodayCount = computed(() => todayRecords.value.filter((item) => ['NORMAL', 'IN_PROGRESS', 'LEAVE'].includes(item.status)).length)
const abnormalTodayCount = computed(() => Math.max(0, todayRecords.value.length - normalTodayCount.value))
const healthScore = computed(() => {
  const attendanceRate = todayRecords.value.length ? normalTodayCount.value / todayRecords.value.length * 100 : 100
  const finished = flowRows.value.filter((item) => ['APPROVED', 'REJECTED'].includes(item.status)).length
  const flowRate = flowRows.value.length ? finished / flowRows.value.length * 100 : 100
  return Math.round(attendanceRate * .62 + flowRate * .38)
})
const departmentRows = computed(() => scope.departments.map((department) => ({
  ...department,
  people: scope.users.filter((user) => String(user.departmentId) === String(department.id)).length
})).sort((a, b) => b.people - a.people))
const pendingCount = computed(() => isReviewer.value ? todoTasks.value.length : myRequests.value.filter((item) => item.status === 'PENDING').length)
const documentCount = computed(() => documentWorkspaces.value.reduce((sum, item) => sum + Number(item.documentCount || 0), 0))
const metricCards = computed(() => [
  { label: '在职员工', value: displayMetrics.employees, unit: '人', hint: '当前权限统计范围', icon: UserFilled, color: '#7080e8', soft: '#eef1ff' },
  { label: '今日出勤', value: displayMetrics.attendance, unit: '人', hint: `${normalTodayCount.value} 人状态正常`, icon: Calendar, color: '#48b9c8', soft: '#ebf9fb' },
  { label: '待办审批', value: displayMetrics.pending, unit: '项', hint: '需要及时跟进处理', icon: DocumentChecked, color: '#efa958', soft: '#fff5e9' },
  { label: '固定资产', value: displayMetrics.assets, unit: '件', hint: `${assetOverview.inUseAssets || 0} 件使用中`, icon: Box, color: '#9b75df', soft: '#f5efff' },
  { label: '共享文档', value: displayMetrics.documents, unit: '篇', hint: `${documentWorkspaces.value.length} 个部门空间`, icon: FolderOpened, color: '#48b789', soft: '#ebf8f2' },
  { label: '库存预警', value: displayMetrics.lowStock, unit: '项', hint: `${supplies.value.length} 种用品在线`, icon: WarningFilled, color: '#ec7890', soft: '#fff0f3' }
])

const axis = { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#8b97aa', fontSize: 10 } }
const attendanceTrendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['考勤记录', '异常记录'], right: 16, top: 5, itemWidth: 12, itemHeight: 7, textStyle: { color: '#718097', fontSize: 10 } },
  grid: { left: 18, right: 22, top: 46, bottom: 18, containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: recentDays.value.map((day) => day.label), ...axis },
  yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#e9eef7', type: 'dashed' } }, ...axis },
  series: [
    {
      name: '考勤记录', type: 'line', smooth: true, symbol: 'circle', symbolSize: 7,
      data: recentDays.value.map((day) => attendanceRecords.value.filter((item) => item.workDate === day.key).length),
      lineStyle: { width: 3, color: '#7182ea' }, itemStyle: { color: '#7182ea', borderColor: '#fff', borderWidth: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(113,130,234,.28)' }, { offset: 1, color: 'rgba(113,130,234,.02)' }] } }
    },
    {
      name: '异常记录', type: 'bar', barWidth: 12,
      data: recentDays.value.map((day) => attendanceRecords.value.filter((item) => item.workDate === day.key && !['NORMAL', 'IN_PROGRESS', 'LEAVE'].includes(item.status)).length),
      itemStyle: { color: '#f1aa59', borderRadius: [6, 6, 0, 0] }
    }
  ]
}))
const departmentOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { type: 'scroll', bottom: 4, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#718097', fontSize: 9 } },
  series: [{
    type: 'pie', center: ['50%', '43%'], radius: ['48%', '70%'], roseType: 'radius', padAngle: 2,
    label: { show: false }, itemStyle: { borderRadius: 7, borderColor: '#fff', borderWidth: 2 },
    data: departmentRows.value.slice(0, 8).map((item) => ({ value: item.people, name: item.name }))
  }]
}))
const approvalOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 4, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#718097', fontSize: 9 } },
  series: [{
    type: 'pie', center: ['50%', '43%'], radius: ['52%', '72%'], padAngle: 3,
    label: { show: true, position: 'center', formatter: `${flowRows.value.length}\n流程总数`, color: '#2c3d59', fontSize: 13, lineHeight: 20 },
    itemStyle: { borderRadius: 8 },
    data: [
      { value: flowRows.value.filter((item) => item.status === 'PENDING').length, name: '待审批', itemStyle: { color: '#f1aa59' } },
      { value: flowRows.value.filter((item) => item.status === 'APPROVED').length, name: '已通过', itemStyle: { color: '#48b789' } },
      { value: flowRows.value.filter((item) => item.status === 'REJECTED').length, name: '已驳回', itemStyle: { color: '#ec7890' } }
    ]
  }]
}))
const todayAttendanceOption = computed(() => ({
  tooltip: { trigger: 'item' },
  radar: {
    center: ['50%', '51%'], radius: '66%',
    indicator: [
      { name: '正常', max: Math.max(1, todayRecords.value.length) },
      { name: '迟到', max: Math.max(1, todayRecords.value.length) },
      { name: '早退', max: Math.max(1, todayRecords.value.length) },
      { name: '缺卡', max: Math.max(1, todayRecords.value.length) },
      { name: '工作中', max: Math.max(1, todayRecords.value.length) }
    ],
    axisName: { color: '#748198', fontSize: 10 },
    splitArea: { areaStyle: { color: ['rgba(239,243,252,.36)', 'rgba(248,250,255,.68)'] } },
    splitLine: { lineStyle: { color: '#dfe6f3' } }, axisLine: { lineStyle: { color: '#dfe6f3' } }
  },
  series: [{
    type: 'radar', symbolSize: 6,
    data: [{
      value: [
        todayRecords.value.filter((item) => ['NORMAL', 'LEAVE'].includes(item.status)).length,
        todayRecords.value.filter((item) => ['LATE', 'LATE_AND_EARLY_LEAVE'].includes(item.status)).length,
        todayRecords.value.filter((item) => ['EARLY_LEAVE', 'LATE_AND_EARLY_LEAVE'].includes(item.status)).length,
        todayRecords.value.filter((item) => ['MISSING_CHECK_IN', 'MISSING_CHECK_OUT'].includes(item.status)).length,
        todayRecords.value.filter((item) => item.status === 'IN_PROGRESS').length
      ],
      areaStyle: { color: 'rgba(89,184,207,.2)' }, lineStyle: { width: 2, color: '#59b8cf' }, itemStyle: { color: '#59b8cf' }
    }]
  }]
}))
const assetStatusOption = computed(() => {
  const idle = Number(assetOverview.idleAssets || 0)
  const inUse = Number(assetOverview.inUseAssets || 0)
  const other = Math.max(0, Number(assetOverview.fixedAssetCount || 0) - idle - inUse)
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 4, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#718097', fontSize: 9 } },
    series: [{
      type: 'pie', center: ['50%', '43%'], radius: ['48%', '70%'], padAngle: 3,
      label: { show: false }, itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      data: [
        { value: inUse, name: '使用中', itemStyle: { color: '#7182ea' } },
        { value: idle, name: '闲置可用', itemStyle: { color: '#48b789' } },
        { value: other, name: '维修/报废', itemStyle: { color: '#efa958' } }
      ]
    }]
  }
})

function departmentPercent(value) {
  const max = departmentRows.value[0]?.people || 1
  return Math.max(value ? 12 : 0, Math.round(value / max * 100))
}
function workspacePercent(value) {
  const max = Math.max(1, ...documentWorkspaces.value.map((item) => Number(item.documentCount || 0)))
  return Math.max(value ? 12 : 0, Math.round(Number(value || 0) / max * 100))
}
function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function shortDate(value) {
  if (!value) return '刚刚'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value).slice(5, 10) : new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date)
}
async function safe(task, fallback, errors) {
  try { return await task } catch (error) { errors.push(error); return fallback }
}
function animateMetricValues(target) {
  window.cancelAnimationFrame(numberAnimation)
  const start = { ...displayMetrics }
  const beganAt = performance.now()
  const duration = 760
  const step = (timestamp) => {
    const progress = Math.min(1, (timestamp - beganAt) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    Object.keys(target).forEach((key) => { displayMetrics[key] = Math.round(start[key] + (target[key] - start[key]) * eased) })
    if (progress < 1) numberAnimation = window.requestAnimationFrame(step)
  }
  numberAnimation = window.requestAnimationFrame(step)
}
async function loadData() {
  if (loading.value) return
  loading.value = true
  const errors = []
  try {
    const [scopeData, attendance, mine, todo, done, notices, assets, supplyRows, workspaces] = await Promise.all([
      safe(getAttendanceScope(), { dataScope: '', scopeNote: '', departments: [], users: [] }, errors),
      safe(listAllAttendanceRecords({ startDate: recentDays.value[0].key, endDate: recentDays.value[6].key }), { items: [] }, errors),
      safe(listMyFlowRequests(), [], errors),
      isReviewer.value ? safe(listTodoFlowTasks(), [], errors) : Promise.resolve([]),
      isReviewer.value ? safe(listDoneFlowTasks(), [], errors) : Promise.resolve([]),
      safe(listPublicNotices({ page: 1, size: 5 }), { total: 0, records: [] }, errors),
      safe(getAssetOverview(), {}, errors),
      safe(listSupplies(), [], errors),
      safe(listDocumentWorkspaces(), [], errors)
    ])
    Object.assign(scope, scopeData || {})
    attendanceRecords.value = attendance?.items || []
    myRequests.value = Array.isArray(mine) ? mine : []
    todoTasks.value = Array.isArray(todo) ? todo : []
    doneTasks.value = Array.isArray(done) ? done : []
    noticeItems.value = notices?.records || notices?.items || notices?.list || []
    noticeTotal.value = Number(notices?.total || noticeItems.value.length)
    Object.assign(assetOverview, assets || {})
    supplies.value = Array.isArray(supplyRows) ? supplyRows : []
    documentWorkspaces.value = Array.isArray(workspaces) ? workspaces : []
    lastUpdated.value = new Date()
    animateMetricValues({
      employees: scope.users.length,
      attendance: todayRecords.value.length,
      pending: pendingCount.value,
      assets: Number(assetOverview.fixedAssetCount || 0),
      documents: documentCount.value,
      lowStock: Number(assetOverview.lowStockKinds || 0)
    })
    if (errors.length) ElMessage.warning(`有 ${errors.length} 项大屏数据暂时无法获取`)
  } finally {
    loading.value = false
  }
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    ElMessage.warning('当前浏览器不支持全屏展示')
  }
}
function syncFullscreenState() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

onMounted(() => {
  loadData()
  clockTimer = window.setInterval(() => { now.value = new Date() }, 1000)
  refreshTimer = window.setInterval(loadData, 60000)
  document.addEventListener('fullscreenchange', syncFullscreenState)
})
onUnmounted(() => {
  window.clearInterval(clockTimer)
  window.clearInterval(refreshTimer)
  window.cancelAnimationFrame(numberAnimation)
  document.removeEventListener('fullscreenchange', syncFullscreenState)
})
</script>

<style scoped>
.data-screen{position:relative;min-height:100vh;overflow:hidden;padding:18px 22px 12px;background:linear-gradient(145deg,#f3f7ff 0%,#f8f7ff 48%,#f2fbf8 100%);color:#263754}.screen-grid-bg{position:absolute;inset:0;opacity:.38;background-image:linear-gradient(rgba(106,126,190,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(106,126,190,.055) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(to bottom,#000,transparent 82%);pointer-events:none}.screen-ambient{position:absolute;border-radius:50%;filter:blur(2px);pointer-events:none;animation:ambient-float 9s ease-in-out infinite}.ambient-one{top:-180px;left:14%;width:420px;height:420px;background:radial-gradient(circle,rgba(125,146,239,.18),transparent 70%)}.ambient-two{right:-130px;bottom:-180px;width:430px;height:430px;background:radial-gradient(circle,rgba(76,194,155,.14),transparent 70%);animation-delay:-4s}
.screen-header{position:relative;z-index:2;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;min-height:74px;padding:8px 14px 13px;border-bottom:1px solid rgba(199,210,232,.75)}.screen-header::after{position:absolute;bottom:-1px;left:50%;width:360px;height:2px;background:linear-gradient(90deg,transparent,#7889e9,transparent);content:'';transform:translateX(-50%);animation:title-glow 2.8s ease-in-out infinite}.screen-brand,.screen-tools{display:flex;align-items:center;gap:12px}.screen-brand>div{display:grid}.screen-brand span,.screen-title small{color:#8997ae;font-size:9px;font-weight:800;letter-spacing:.15em}.screen-brand strong{margin-top:4px;font-size:14px}.screen-title{display:flex;align-items:center;gap:18px;text-align:center}.screen-title i{width:64px;height:1px;background:linear-gradient(90deg,transparent,#8695e9)}.screen-title i:last-child{background:linear-gradient(90deg,#8695e9,transparent)}.screen-title h1{margin:3px 0 0;font-size:25px;letter-spacing:.1em}.screen-tools{justify-content:flex-end}.icon-button{display:grid;width:36px;height:36px;flex:0 0 36px;place-items:center;border:1px solid #dce4f3;border-radius:12px;background:rgba(255,255,255,.72);box-shadow:0 7px 18px rgba(72,88,142,.08);color:#6675d5;cursor:pointer;transition:transform .2s,box-shadow .2s}.icon-button:hover{box-shadow:0 10px 24px rgba(72,88,142,.14);transform:translateY(-2px)}.icon-button.spinning .el-icon{animation:spin 1s linear infinite}.live-state{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;background:#eaf8f2;color:#3f9c78;font-size:10px}.live-state span{width:7px;height:7px;border-radius:50%;background:#49b88b;box-shadow:0 0 0 5px rgba(73,184,139,.12);animation:live-pulse 1.8s infinite}.screen-time{display:grid;text-align:right}.screen-time strong{font-size:18px;font-variant-numeric:tabular-nums}.screen-time span{color:#8a97aa;font-size:9px}
.screen-summary{position:relative;z-index:1;display:grid;grid-template-columns:1.15fr repeat(5,1fr);gap:12px;margin:15px 0}.scope-copy{display:flex;min-width:0;flex-direction:column;justify-content:center;padding:17px 20px;border:1px solid #dce4f3;border-radius:20px;background:linear-gradient(135deg,rgba(234,239,255,.9),rgba(246,243,255,.88));box-shadow:0 12px 30px rgba(74,88,142,.09)}.scope-copy span{color:#7180da;font-size:10px;font-weight:800;letter-spacing:.08em}.scope-copy strong{margin:7px 0 5px;font-size:18px}.scope-copy small{overflow:hidden;color:#8995a8;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.screen-metric{position:relative;display:flex;align-items:center;min-width:0;gap:12px;overflow:hidden;padding:15px;border:1px solid #e1e7f2;border-radius:20px;background:linear-gradient(135deg,var(--soft),rgba(255,255,255,.86));box-shadow:0 12px 30px rgba(74,88,142,.08);animation:metric-in .65s var(--delay) both}.metric-icon{position:relative;z-index:1;display:grid;width:44px;height:44px;flex:0 0 44px;place-items:center;border-radius:15px;background:var(--tone);box-shadow:0 9px 18px color-mix(in srgb,var(--tone) 24%,transparent);color:#fff}.metric-icon .el-icon{font-size:22px}.screen-metric>div{position:relative;z-index:1;min-width:0}.screen-metric small,.screen-metric strong,.screen-metric>div>span{display:block}.screen-metric small{color:#79869b;font-size:10px}.screen-metric strong{margin:3px 0;color:#263754;font-size:25px;font-variant-numeric:tabular-nums;line-height:1}.screen-metric strong em{margin-left:2px;color:#7c899d;font-size:10px;font-style:normal;font-weight:500}.screen-metric>div>span{overflow:hidden;color:#98a3b5;font-size:8px;text-overflow:ellipsis;white-space:nowrap}.metric-wave{position:absolute;right:-32px;bottom:-50px;width:105px;height:105px;border:15px solid color-mix(in srgb,var(--tone) 8%,transparent);border-radius:50%}
.visual-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:13px}.visual-grid>:nth-child(1){grid-column:span 6}.visual-grid>:nth-child(2),.visual-grid>:nth-child(3){grid-column:span 3}.visual-grid>:nth-child(n+4){grid-column:span 4}.visual-grid :deep(.screen-chart){height:250px}.screen-panel{position:relative;min-width:0;overflow:hidden;border:1px solid rgba(214,224,242,.88);border-radius:22px;background:rgba(255,255,255,.78);box-shadow:0 16px 42px rgba(72,88,142,.1);backdrop-filter:blur(18px);animation:panel-in .72s .18s both}.simple-panel-head{display:flex;align-items:center;justify-content:space-between;padding:17px 20px 10px}.simple-panel-head span{color:#99a4b7;font-size:9px;font-weight:800;letter-spacing:.16em}.simple-panel-head h3{margin:4px 0 0;font-size:15px}.simple-panel-head em{padding:5px 9px;border-radius:999px;background:#f1f4ff;color:#6372d8;font-size:9px;font-style:normal;font-weight:700}
.ranking-list{display:grid;gap:8px;padding:5px 20px 16px}.ranking-row{display:flex;align-items:center;gap:10px}.ranking-index{display:grid;width:28px;height:28px;flex:0 0 28px;place-items:center;border-radius:9px;background:#f0f3fb;color:#7c89a0;font-size:9px;font-weight:800}.ranking-row:nth-child(-n+3) .ranking-index{background:#e9edff;color:#6372db}.ranking-main{min-width:0;flex:1}.ranking-main>div{display:flex;align-items:center;justify-content:space-between}.ranking-main strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.ranking-main span{color:#8290a5;font-size:9px}.ranking-main>i{display:block;height:5px;margin-top:5px;overflow:hidden;border-radius:5px;background:#edf1f7}.ranking-main b{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#7485e9,#9a78e6);animation:bar-grow .9s .35s both;transform-origin:left}
.notice-stream{display:grid;padding:2px 20px 14px}.notice-stream article{display:grid;grid-template-columns:8px minmax(0,1fr) auto;align-items:center;gap:9px;padding:10px 0;border-bottom:1px solid #edf1f6}.notice-stream article:last-child{border-bottom:0}.notice-dot{width:7px;height:7px;border-radius:50%;background:#7182ea;box-shadow:0 0 0 5px rgba(113,130,234,.1)}.notice-dot.tone-1{background:#4dbb94;box-shadow:0 0 0 5px rgba(77,187,148,.1)}.notice-dot.tone-2{background:#efa958;box-shadow:0 0 0 5px rgba(239,169,88,.1)}.notice-dot.tone-3{background:#9b75df;box-shadow:0 0 0 5px rgba(155,117,223,.1)}.notice-stream article>div{min-width:0}.notice-stream strong,.notice-stream small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.notice-stream strong{font-size:11px}.notice-stream small{margin-top:3px;color:#929daf;font-size:8px}.notice-stream time{color:#9ba5b6;font-size:8px}
.screen-footer{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:11px 5px 0;color:#8a97aa;font-size:9px}.screen-footer span{display:flex;align-items:center;gap:7px}.screen-footer i{width:5px;height:5px;border-radius:50%;background:#7080e8}.screen-footer strong{color:#748198;font-weight:600}
@keyframes ambient-float{50%{transform:translate(28px,18px) scale(1.05)}}@keyframes title-glow{50%{opacity:.35;width:260px}}@keyframes live-pulse{50%{box-shadow:0 0 0 8px rgba(73,184,139,0)}}@keyframes metric-in{from{opacity:0;transform:translateY(-12px) scale(.97)}to{opacity:1;transform:none}}@keyframes panel-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}@keyframes bar-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes spin{to{transform:rotate(360deg)}}
.screen-summary{grid-template-columns:1.15fr repeat(6,1fr)}
.visual-grid>:nth-child(8){grid-column:span 8}
.collaboration-body{display:grid;grid-template-columns:1.05fr 1fr;gap:16px;padding:2px 20px 18px}.collaboration-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.collaboration-stats>div{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:13px;background:#f5f7fc}.collaboration-stats .el-icon{width:32px;height:32px;flex:0 0 32px;border-radius:10px;background:#e9edff;color:#6979df;font-size:16px}.collaboration-stats>div:nth-child(2) .el-icon{background:#e8f8f2;color:#3eaa82}.collaboration-stats>div:nth-child(3) .el-icon{background:#eef8fb;color:#45a7bd}.collaboration-stats>div:nth-child(4) .el-icon{background:#fff4e7;color:#df9848}.collaboration-stats>div.alert{background:#fff1f3}.collaboration-stats>div.alert .el-icon{background:#ffe1e7;color:#df617a}.collaboration-stats span,.collaboration-stats strong,.collaboration-stats small{display:block}.collaboration-stats span{color:#8793a6;font-size:9px}.collaboration-stats strong{margin:2px 0;color:#293a57;font-size:20px}.collaboration-stats small{color:#9ca6b6;font-size:8px}.workspace-overview{display:grid;align-content:center;gap:9px}.workspace-row{display:grid;grid-template-columns:90px minmax(0,1fr) 38px;align-items:center;gap:8px;font-size:9px}.workspace-row>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.workspace-row>i{height:6px;overflow:hidden;border-radius:6px;background:#edf1f7}.workspace-row b{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#7182ea,#4dbb94);animation:bar-grow .9s .35s both;transform-origin:left}.workspace-row strong{text-align:right;color:#718097;font-size:9px}
@media(max-width:1350px){.visual-grid>:nth-child(1){grid-column:span 8}.visual-grid>:nth-child(2){grid-column:span 4}.visual-grid>:nth-child(3),.visual-grid>:nth-child(n+4){grid-column:span 6}.visual-grid>:nth-child(8){grid-column:span 12}.screen-title i{display:none}}
@media(max-width:1050px){.screen-summary{grid-template-columns:repeat(3,1fr)}.scope-copy{grid-row:span 2}}
@media(max-width:900px){.data-screen{overflow:auto}.screen-header{grid-template-columns:1fr auto}.screen-title{grid-column:1/-1;grid-row:1;text-align:left}.screen-brand{grid-row:2}.screen-tools{grid-row:2}.screen-summary{grid-template-columns:repeat(2,1fr)}.scope-copy{grid-column:1/-1;grid-row:auto}.visual-grid>*{grid-column:1/-1!important}.live-state{display:none}}
@media(max-width:600px){.data-screen{padding:12px}.screen-brand>div,.screen-time{display:none}.screen-title h1{font-size:20px}.screen-summary{grid-template-columns:1fr}.screen-metric{min-height:78px}.screen-tools{gap:7px}.screen-footer{align-items:flex-start;flex-direction:column;gap:5px}}
@media(prefers-reduced-motion:reduce){.screen-ambient,.screen-header::after,.live-state span,.screen-metric,.screen-panel,.ranking-main b{animation:none}}
</style>
