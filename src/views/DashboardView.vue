<template>
  <div class="workbench-page" v-loading="loading">
    <section class="workbench-hero">
      <div class="hero-copy">
        <div class="hero-kicker"><span></span> PERSONAL WORKSPACE</div>
        <h1>{{ greeting }}，{{ auth.state.profile?.name || '同事' }}</h1>
        <p>今天也要元气满满地完成工作。你的待办、考勤与最新公告都在这里。</p>
        <div class="hero-tags">
          <el-tag round effect="dark">{{ auth.state.profile?.role || '普通员工' }}</el-tag>
          <el-tag round effect="plain">{{ scopeLabel }}</el-tag>
          <el-tag round effect="plain" type="success">服务已同步</el-tag>
        </div>
      </div>
      <div class="hero-profile-panel">
        <div class="hero-identity">
          <el-avatar :size="72" :src="auth.state.profile?.avatar || ''">{{ avatarFallback }}</el-avatar>
          <div>
            <small>今日办公账号</small>
            <strong>{{ auth.state.profile?.name || '同事' }}</strong>
            <span>{{ auth.state.profile?.department || '未分配部门' }} · {{ auth.state.profile?.role || '普通员工' }}</span>
          </div>
        </div>
        <div class="hero-clock">
          <span><el-icon><Clock /></el-icon> 当前时间</span>
          <strong>{{ clockText }}</strong>
          <small>{{ fullDateText }}</small>
        </div>
      </div>
      <el-button class="hero-refresh" circle :icon="Refresh" :loading="loading" @click="loadData" />
    </section>

    <section class="focus-grid">
      <button v-for="item in focusCards" :key="item.label" class="focus-card" :class="item.tone" @click="router.push(item.path)">
        <span class="focus-icon"><el-icon><component :is="item.icon" /></el-icon></span>
        <span class="focus-copy"><small>{{ item.label }}</small><strong>{{ item.value }}</strong><em>{{ item.hint }}</em></span>
        <el-icon class="focus-arrow"><ArrowRight /></el-icon>
      </button>
    </section>

    <section class="panel quick-panel">
      <div class="quick-heading"><span>快捷入口</span><small>常用功能，一步直达</small></div>
      <div class="quick-launchers">
        <button v-for="action in quickActions" :key="action.label" class="quick-launcher" @click="handleQuickAction(action)">
          <span :class="['quick-icon', action.tone]"><el-icon><component :is="action.icon" /></el-icon></span>
          <strong>{{ action.label }}</strong><small>{{ action.description }}</small>
        </button>
      </div>
    </section>

    <section class="workbench-grid">
      <div class="panel workbench-section task-panel">
        <SectionTitle title="我的今日待办" subtitle="聚合审批与个人流程，让重要事项保持在视线内。">
          <template #extra><el-button link type="primary" @click="router.push('/approval')">查看全部 <el-icon><ArrowRight /></el-icon></el-button></template>
        </SectionTitle>
        <div v-if="taskItems.length" class="task-list">
          <button v-for="item in taskItems" :key="item.id" class="task-item" @click="router.push('/approval')">
            <span :class="['task-state', item.tone]"><el-icon><component :is="item.icon" /></el-icon></span>
            <span class="task-copy"><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
            <el-tag size="small" round :type="item.tagType">{{ item.status }}</el-tag>
          </button>
        </div>
        <el-empty v-else description="今天没有待处理审批，轻松一下吧" :image-size="88" />
      </div>

      <div class="panel workbench-section attendance-card">
        <SectionTitle title="今日状态" subtitle="个人出勤与当前工作节奏" />
        <div class="attendance-ring" :class="attendanceTone"><div><strong>{{ attendanceStatus }}</strong><span>{{ todayLabel }}</span></div></div>
        <div class="attendance-time-grid">
          <div><span>上班打卡</span><strong>{{ checkInTime }}</strong></div>
          <div><span>下班打卡</span><strong>{{ checkOutTime }}</strong></div>
        </div>
        <el-button type="primary" size="large" round :icon="Calendar" @click="router.push('/attendance')">进入考勤中心</el-button>
      </div>
    </section>

    <section class="panel workbench-section notice-strip">
      <SectionTitle title="最新公告" :subtitle="'还有 ' + stats.unreadNoticeCount + ' 条公告未读'">
        <template #extra><el-button link type="primary" @click="router.push('/notice')">公告中心 <el-icon><ArrowRight /></el-icon></el-button></template>
      </SectionTitle>
      <div class="notice-cards">
        <button v-for="(notice, index) in latestNotices" :key="notice.id" class="notice-preview" @click="router.push('/notice')">
          <span :class="['notice-index', 'tone-' + (index % 4)]">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="notice-copy"><strong>{{ notice.title }}</strong><small>{{ notice.summary || '点击查看公告详情' }}</small></span>
          <span class="notice-time">{{ shortDate(notice.publishedAt) }}</span>
        </button>
        <el-empty v-if="!latestNotices.length" description="暂无已发布公告" :image-size="72" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Bell, Calendar, ChatDotRound, Clock, Document, DocumentChecked, MagicStick, Refresh, TrendCharts } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { getAttendanceScope, listAllAttendanceRecords } from '../api/attendance'
import { listMyFlowRequests, listTodoFlowTasks } from '../api/flows'
import { getUnreadNoticeCount, listPublicNotices } from '../api/notices'
import SectionTitle from '../components/SectionTitle.vue'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const scope = reactive({ dataScope: 'SELF', scopeNote: '', departments: [], users: [] })
const attendanceRows = ref([])
const myRequests = ref([])
const todoTasks = ref([])
const noticeTotal = ref(0)
const unreadNoticeCount = ref(0)
const latestNotices = ref([])
const currentTime = ref(new Date())
let clockTimer
const isReviewer = computed(() => auth.hasPermission('flow:task:approve'))
const canViewBoard = computed(() => ['超级管理员', 'HR 人事', '部门主管'].includes(auth.role.value))
const greeting = computed(() => {
  const hour = currentTime.value.getHours()
  return hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
})
const avatarFallback = computed(() => String(auth.state.profile?.name || auth.state.profile?.username || 'OA').trim().slice(0, 1).toUpperCase())
const clockText = computed(() => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(currentTime.value))
const fullDateText = computed(() => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(currentTime.value))
const todayLabel = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())
const scopeLabel = computed(() => ({ ALL_USERS: '全部组织', DEPARTMENT: '负责部门', SELF: '仅本人' }[scope.dataScope] || '当前账号'))
const currentAttendance = computed(() => attendanceRows.value.find((item) => String(item.userId) === String(auth.state.profile?.id)) || attendanceRows.value[0])
const stats = computed(() => ({
  pendingApprovals: isReviewer.value ? todoTasks.value.length : myRequests.value.filter((item) => item.status === 'PENDING').length,
  attendanceToday: attendanceRows.value.length,
  noticeCount: noticeTotal.value,
  unreadNoticeCount: unreadNoticeCount.value
}))
const focusCards = computed(() => [
  { label: isReviewer.value ? '待我审批' : '我的申请', value: stats.value.pendingApprovals, hint: '项需要关注', icon: DocumentChecked, path: '/approval', tone: 'violet' },
  { label: '未读公告', value: stats.value.unreadNoticeCount, hint: '共 ' + stats.value.noticeCount + ' 条公告', icon: Bell, path: '/notice', tone: 'orange' },
  { label: '今日考勤', value: stats.value.attendanceToday, hint: currentAttendance.value ? '状态已同步' : '等待今日打卡', icon: Clock, path: '/attendance', tone: 'cyan' },
  { label: canViewBoard.value ? '数据洞察' : 'AI 助手', value: canViewBoard.value ? scope.users.length : 'AI', hint: canViewBoard.value ? '名员工在统计范围' : '随时为你解答', icon: canViewBoard.value ? TrendCharts : MagicStick, path: canViewBoard.value ? '/board' : '/dashboard', tone: 'green' }
])
const quickActions = computed(() => [
  { label: '考勤打卡', description: '记录上下班', icon: Calendar, path: '/attendance', tone: 'blue' },
  { label: '发起审批', description: '请假与加班', icon: Document, path: '/approval', tone: 'purple' },
  { label: '公告通知', description: '阅读最新消息', icon: Bell, path: '/notice', tone: 'orange' },
  { label: 'AI 助手', description: '制度智能问答', icon: ChatDotRound, action: 'ai', tone: 'pink' },
  ...(canViewBoard.value ? [{ label: '数据看板', description: '组织运营分析', icon: TrendCharts, path: '/board', tone: 'green' }] : [])
])
const taskItems = computed(() => {
  const source = isReviewer.value ? todoTasks.value : myRequests.value.filter((item) => item.status === 'PENDING')
  return source.slice(0, 4).map((item, index) => ({
    id: item.id || index,
    title: item.title || item.requestTitle || flowTypeText(item.type || item.requestType) + '申请',
    description: item.applicantName ? item.applicantName + ' · ' + shortDate(item.createdAt) : '提交于 ' + shortDate(item.createdAt),
    status: isReviewer.value ? '待处理' : '审批中',
    icon: index % 2 ? Clock : DocumentChecked,
    tone: index % 2 ? 'amber' : 'blue',
    tagType: index % 2 ? 'warning' : 'primary'
  }))
})
const attendanceStatus = computed(() => attendanceStatusText(currentAttendance.value?.status))
const attendanceTone = computed(() => ['NORMAL', 'IN_PROGRESS', 'LEAVE'].includes(currentAttendance.value?.status) ? 'is-good' : currentAttendance.value ? 'is-alert' : 'is-empty')
const checkInTime = computed(() => timeOnly(currentAttendance.value?.checkInTime))
const checkOutTime = computed(() => timeOnly(currentAttendance.value?.checkOutTime))
async function safe(task, fallback, errors) { try { return await task } catch (error) { errors.push(error); return fallback } }
async function loadData() {
  loading.value = true
  const errors = []
  const today = localDate(new Date())
  try {
    const [scopeData, attendance, mine, notices, unread, todo] = await Promise.all([
      safe(getAttendanceScope(), { dataScope: 'SELF', scopeNote: '', departments: [], users: [] }, errors),
      safe(listAllAttendanceRecords({ startDate: today, endDate: today }), { items: [] }, errors),
      safe(listMyFlowRequests(), [], errors),
      safe(listPublicNotices({ page: 1, size: 4 }), { total: 0, records: [] }, errors),
      safe(getUnreadNoticeCount(), { unreadCount: 0 }, errors),
      isReviewer.value ? safe(listTodoFlowTasks(), [], errors) : Promise.resolve([])
    ])
    Object.assign(scope, scopeData || {})
    attendanceRows.value = attendance?.items || []
    myRequests.value = Array.isArray(mine) ? mine : []
    todoTasks.value = Array.isArray(todo) ? todo : []
    noticeTotal.value = Number(notices?.total || 0)
    latestNotices.value = notices?.records || notices?.items || notices?.list || []
    unreadNoticeCount.value = Number(unread?.unreadCount || 0)
    if (errors.length) ElMessage.warning('有 ' + errors.length + ' 项工作台数据暂时无法获取')
  } finally { loading.value = false }
}
function handleQuickAction(action) {
  if (action.action === 'ai') window.dispatchEvent(new CustomEvent('open-ai-assistant'))
  else if (action.path) router.push(action.path)
}
function localDate(date) { return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') }
function shortDate(value) {
  if (!value) return '刚刚'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date)
}
function timeOnly(value) {
  if (!value) return '--:--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value).slice(11, 16) : date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })
}
function flowTypeText(type) { return { LEAVE: '请假', OVERTIME: '加班' }[type] || '办公' }
function attendanceStatusText(status) { return { IN_PROGRESS: '工作中', NORMAL: '打卡正常', LEAVE: '今日请假', LATE: '今日迟到', EARLY_LEAVE: '今日早退', LATE_AND_EARLY_LEAVE: '考勤异常', MISSING_CHECK_OUT: '待下班打卡' }[status] || '等待打卡' }
onMounted(() => {
  loadData()
  clockTimer = window.setInterval(() => { currentTime.value = new Date() }, 1000)
})
onUnmounted(() => window.clearInterval(clockTimer))
</script>

<style scoped>
.workbench-page{display:grid;gap:18px}.workbench-hero{position:relative;min-height:206px;padding:34px 38px;overflow:hidden;border-radius:24px;background:linear-gradient(118deg,#2547d8 0%,#5965ed 48%,#8a52e8 100%);box-shadow:0 24px 50px rgba(70,76,210,.24);color:#fff}.workbench-hero::before{position:absolute;inset:0;background:radial-gradient(circle at 16% 0%,rgba(255,255,255,.2),transparent 30%),linear-gradient(90deg,transparent 0 65%,rgba(255,255,255,.08));content:''}.hero-copy{position:relative;z-index:2;max-width:650px}.hero-kicker{display:flex;align-items:center;gap:9px;color:rgba(255,255,255,.74);font-size:11px;font-weight:800;letter-spacing:.14em}.hero-kicker span{width:26px;height:3px;border-radius:3px;background:#7ef2da}.hero-copy h1{margin:18px 0 9px;font-size:clamp(28px,3vw,40px);line-height:1.15}.hero-copy p{margin:0;color:rgba(255,255,255,.78);font-size:14px}.hero-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:23px}.hero-tags :deep(.el-tag){border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;backdrop-filter:blur(8px)}.hero-visual{position:absolute;z-index:1;top:50%;right:8%;width:190px;height:190px;transform:translateY(-50%)}.hero-core{position:absolute;top:58px;left:58px;display:grid;width:74px;height:74px;place-items:center;border:1px solid rgba(255,255,255,.42);border-radius:26px;background:rgba(255,255,255,.18);box-shadow:0 18px 38px rgba(33,29,117,.25);backdrop-filter:blur(8px);transform:rotate(12deg)}.hero-core .el-icon{color:#fff5a6;font-size:40px;transform:rotate(-12deg)}.hero-orbit{position:absolute;border:1px solid rgba(255,255,255,.24);border-radius:50%;animation:hero-spin 15s linear infinite}.orbit-one{inset:15px}.orbit-two{inset:-15px;border-style:dashed;animation-direction:reverse;animation-duration:22s}.hero-float{position:absolute;display:grid;width:38px;height:38px;place-items:center;border-radius:13px;background:rgba(255,255,255,.92);box-shadow:0 12px 25px rgba(31,37,116,.22);animation:hero-bob 3.6s ease-in-out infinite}.hero-float-one{top:6px;left:30px;color:#ff8a4c}.hero-float-two{right:2px;top:78px;color:#6847e6;animation-delay:-.9s}.hero-float-three{bottom:0;left:36px;color:#12a6bb;animation-delay:-1.7s}.hero-refresh{position:absolute;z-index:3;top:20px;right:20px;border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.12);color:#fff}
.focus-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.focus-card{--card-a:#6557ed;--card-b:#8b5cf6;position:relative;display:flex;align-items:center;min-width:0;min-height:126px;padding:20px;overflow:hidden;border:0;border-radius:20px;background:linear-gradient(135deg,var(--card-a),var(--card-b));box-shadow:0 14px 28px color-mix(in srgb,var(--card-a) 24%,transparent);color:#fff;cursor:pointer;text-align:left;transition:transform .25s ease,box-shadow .25s ease}.focus-card:hover{transform:translateY(-5px);box-shadow:0 20px 38px color-mix(in srgb,var(--card-a) 32%,transparent)}.focus-card::after{position:absolute;right:-20px;bottom:-40px;width:116px;height:116px;border:18px solid rgba(255,255,255,.1);border-radius:50%;content:''}.focus-card.orange{--card-a:#ff8d3f;--card-b:#ffb128}.focus-card.cyan{--card-a:#1baad1;--card-b:#3cc8c6}.focus-card.green{--card-a:#13a879;--card-b:#54cf8d}.focus-icon{display:grid;width:54px;height:54px;flex:0 0 54px;place-items:center;border:1px solid rgba(255,255,255,.24);border-radius:17px;background:rgba(255,255,255,.16)}.focus-icon .el-icon{font-size:29px}.focus-copy{min-width:0;margin-left:15px}.focus-copy small,.focus-copy strong,.focus-copy em{display:block}.focus-copy small{color:rgba(255,255,255,.78);font-size:12px}.focus-copy strong{margin:4px 0;font-size:31px;line-height:1}.focus-copy em{overflow:hidden;color:rgba(255,255,255,.74);font-size:11px;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.focus-arrow{position:absolute;top:18px;right:16px;opacity:.72}
.quick-panel{display:grid;grid-template-columns:160px 1fr;gap:20px;padding:24px 28px;border-radius:20px}.quick-heading{display:flex;flex-direction:column;justify-content:center;border-right:1px solid var(--border)}.quick-heading span{font-size:17px;font-weight:800}.quick-heading small{margin-top:7px;color:var(--muted)}.quick-launchers{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.quick-launcher{display:grid;justify-items:center;padding:4px 8px;border:0;background:transparent;color:var(--text);cursor:pointer}.quick-launcher:hover .quick-icon{transform:translateY(-5px) scale(1.05)}.quick-launcher strong{margin-top:9px;font-size:13px}.quick-launcher small{margin-top:3px;color:var(--muted);font-size:11px}.quick-icon{display:grid;width:58px;height:58px;place-items:center;border-radius:20px;box-shadow:0 10px 20px rgba(63,76,145,.16);color:#fff;transition:transform .25s ease}.quick-icon .el-icon{font-size:28px}.quick-icon.blue{background:linear-gradient(135deg,#4776ef,#6f55e8)}.quick-icon.purple{background:linear-gradient(135deg,#8b5cf6,#c05de5)}.quick-icon.orange{background:linear-gradient(135deg,#ff8b45,#ffbd3f)}.quick-icon.pink{background:linear-gradient(135deg,#f05a91,#fa79af)}.quick-icon.green{background:linear-gradient(135deg,#13aa81,#4fd197)}
.workbench-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,.72fr);gap:18px}.workbench-section{padding:22px 24px;border-radius:20px}.task-list{display:grid;gap:9px}.task-item{display:flex;align-items:center;width:100%;gap:12px;padding:12px;border:1px solid transparent;border-radius:14px;background:#f7f8fd;color:var(--text);cursor:pointer;text-align:left;transition:border-color .2s,transform .2s,background .2s}.task-item:hover{border-color:#cfd7ff;background:#f3f5ff;transform:translateX(3px)}.task-state{display:grid;width:40px;height:40px;flex:0 0 40px;place-items:center;border-radius:13px;background:#e8edff;color:#4c5ce5;font-size:20px}.task-state.amber{background:#fff0d7;color:#e98a17}.task-copy{min-width:0;flex:1}.task-copy strong,.task-copy small{display:block}.task-copy strong{font-size:13px}.task-copy small{margin-top:5px;color:var(--muted);font-size:11px}
.attendance-card{display:flex;flex-direction:column}.attendance-ring{width:136px;height:136px;margin:6px auto 15px;display:grid;place-items:center;border-radius:50%;background:conic-gradient(#5a63e9 0 72%,#e8eafe 72%)}.attendance-ring>div{display:grid;width:108px;height:108px;place-content:center;border-radius:50%;background:#fff;text-align:center;box-shadow:inset 0 0 0 1px #eef0fa}.attendance-ring strong,.attendance-ring span{display:block}.attendance-ring strong{font-size:17px}.attendance-ring span{margin-top:5px;color:var(--muted);font-size:11px}.attendance-ring.is-alert{background:conic-gradient(#f59e42 0 72%,#fff1df 72%)}.attendance-ring.is-empty{background:conic-gradient(#b6bfd2 0 36%,#edf0f5 36%)}.attendance-time-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:15px}.attendance-time-grid div{padding:11px;border-radius:12px;background:#f7f8fc;text-align:center}.attendance-time-grid span,.attendance-time-grid strong{display:block}.attendance-time-grid span{color:var(--muted);font-size:11px}.attendance-time-grid strong{margin-top:5px;font-size:16px;font-variant-numeric:tabular-nums}
.notice-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.notice-preview{display:flex;align-items:center;gap:12px;min-width:0;padding:13px;border:1px solid #edf0f6;border-radius:15px;background:#fafbfe;color:var(--text);cursor:pointer;text-align:left;transition:transform .2s,border-color .2s}.notice-preview:hover{transform:translateY(-2px);border-color:#cfd7ff}.notice-index{display:grid;width:38px;height:38px;flex:0 0 38px;place-items:center;border-radius:12px;background:#e8edff;color:#5361e9;font-size:11px;font-weight:800}.notice-index.tone-1{background:#fff0df;color:#ef8a22}.notice-index.tone-2{background:#e2f8f2;color:#159a74}.notice-index.tone-3{background:#f9e7f3;color:#d04b91}.notice-copy{min-width:0;flex:1}.notice-copy strong,.notice-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.notice-copy strong{font-size:13px}.notice-copy small{margin-top:5px;color:var(--muted);font-size:11px}.notice-time{color:#9aa5b5;font-size:11px;white-space:nowrap}
.workbench-hero{display:flex;align-items:center;justify-content:space-between;gap:36px;background:linear-gradient(120deg,#eef4ff 0%,#f4f2ff 52%,#f8f1ff 100%);box-shadow:0 18px 42px rgba(78,91,145,.13);color:#182842}
.workbench-hero::before{background:radial-gradient(circle at 12% 0%,rgba(137,174,255,.2),transparent 34%),radial-gradient(circle at 91% 18%,rgba(184,146,245,.16),transparent 30%)}
.workbench-hero::after{position:absolute;right:-42px;bottom:-85px;width:230px;height:230px;border:34px solid rgba(111,126,222,.055);border-radius:50%;content:''}
.hero-copy{max-width:680px}.hero-kicker{color:#73809a}.hero-kicker span{background:#6a7ce8}.hero-copy p{color:#6c7890}.hero-tags :deep(.el-tag){border-color:#d5dcf2;background:rgba(255,255,255,.68);color:#4a5874;backdrop-filter:blur(8px)}.hero-tags :deep(.el-tag:first-child){border-color:#cfd7fb;background:#e4e9ff;color:#4c5ed1}
.hero-profile-panel{position:relative;z-index:2;display:grid;width:min(440px,38%);min-width:350px;grid-template-columns:minmax(0,1fr) 148px;gap:12px;padding:14px;border:1px solid rgba(255,255,255,.9);border-radius:22px;background:rgba(255,255,255,.66);box-shadow:0 14px 32px rgba(81,92,141,.12);backdrop-filter:blur(14px)}
.hero-identity{display:flex;align-items:center;gap:13px;min-width:0}.hero-identity :deep(.el-avatar){display:inline-flex;align-items:center;justify-content:center;line-height:1;text-align:center;flex:0 0 72px;border:4px solid rgba(255,255,255,.9);background:linear-gradient(135deg,#7182e8,#a17be8);box-shadow:0 9px 22px rgba(86,101,190,.2);color:#fff;font-size:25px;font-weight:800}.hero-identity>div{min-width:0}.hero-identity small,.hero-identity strong,.hero-identity span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hero-identity small{color:#8490a7;font-size:10px}.hero-identity strong{margin:5px 0;color:#1d2d48;font-size:17px}.hero-identity span{color:#69768e;font-size:11px}
.hero-clock{display:flex;flex-direction:column;justify-content:center;padding-left:15px;border-left:1px solid #e0e5f1}.hero-clock span{display:flex;align-items:center;gap:5px;color:#748099;font-size:10px}.hero-clock strong{margin:6px 0 3px;color:#263857;font-size:24px;font-variant-numeric:tabular-nums;letter-spacing:.03em}.hero-clock small{color:#8a95a9;font-size:10px;line-height:1.4}.hero-refresh{border-color:#d8def1;background:rgba(255,255,255,.72);color:#6675d8}
.focus-card{--card-a:#eef0ff;--card-b:#f5f2ff;border:1px solid #e2e6f5;background:linear-gradient(135deg,var(--card-a),var(--card-b));box-shadow:0 12px 26px rgba(74,88,142,.09);color:#273752}.focus-card:hover{box-shadow:0 17px 34px rgba(74,88,142,.14)}.focus-card::after{border-color:rgba(96,107,202,.06)}.focus-card.orange{--card-a:#fff4e8;--card-b:#fff8ef;border-color:#f5e5cf}.focus-card.cyan{--card-a:#eaf8fb;--card-b:#f2fbfc;border-color:#d8edf1}.focus-card.green{--card-a:#eaf8f2;--card-b:#f2fbf7;border-color:#d9eee5}.focus-icon{border-color:rgba(255,255,255,.8);background:#7180e6;box-shadow:0 9px 18px rgba(91,107,213,.2);color:#fff}.focus-card.orange .focus-icon{background:#efa957;box-shadow:0 9px 18px rgba(229,156,69,.2)}.focus-card.cyan .focus-icon{background:#51b8c8;box-shadow:0 9px 18px rgba(51,157,176,.19)}.focus-card.green .focus-icon{background:#53b98e;box-shadow:0 9px 18px rgba(48,158,112,.18)}.focus-copy small{color:#748099}.focus-copy strong{color:#263650}.focus-copy em{color:#8490a5}.focus-arrow{color:#8a95aa}
@media(max-width:1050px){.workbench-hero{align-items:flex-start;flex-direction:column}.hero-profile-panel{width:100%;min-width:0;max-width:540px}}
@media(max-width:620px){.hero-profile-panel{grid-template-columns:1fr}.hero-clock{padding-top:12px;padding-left:0;border-top:1px solid #e0e5f1;border-left:0}.hero-clock strong{font-size:21px}}
@keyframes hero-spin{to{transform:rotate(360deg)}}@keyframes hero-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@media(max-width:1180px){.focus-grid{grid-template-columns:repeat(2,1fr)}.quick-launchers{grid-template-columns:repeat(3,1fr)}}@media(max-width:820px){.hero-visual{opacity:.38;right:-30px}.workbench-grid{grid-template-columns:1fr}.quick-panel{grid-template-columns:1fr}.quick-heading{padding-bottom:14px;border-right:0;border-bottom:1px solid var(--border)}.notice-cards{grid-template-columns:1fr}}@media(max-width:560px){.workbench-hero{padding:28px 22px}.focus-grid{grid-template-columns:1fr}.quick-launchers{grid-template-columns:repeat(2,1fr)}}@media(prefers-reduced-motion:reduce){.hero-orbit,.hero-float{animation:none}.focus-card,.quick-icon,.task-item,.notice-preview{transition:none}}
</style>
