<template>
  <div class="content-grid attendance-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">考勤打卡</h1>
        <p class="page-subtitle">员工查看本人记录，部门主管查看负责部门，管理员查看全组织考勤。</p>
      </div>
      <div class="tool-row">
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
        <el-button v-if="canManageRule" :icon="Setting" @click="openRuleDialog">考勤规则</el-button>
        <el-button type="primary" :icon="Clock" :loading="punching" :disabled="!today.canCheckIn" @click="doCheckIn">上班打卡</el-button>
        <el-button :icon="Finished" :loading="punching" :disabled="!today.canCheckOut" @click="doCheckOut">下班打卡</el-button>
      </div>
    </div>

    <div class="three-col">
      <StatCard :title="canViewTeam ? '范围内记录' : '今日状态'" :value="canViewTeam ? summary.totalRecords : statusLabel(today.status)" :subtitle="canViewTeam ? scopeLabel : (today.workDate || '尚未获取')" :icon="Calendar" color="var(--primary)" />
      <StatCard title="本月迟到" :value="activeStatistics.lateCount || 0" :subtitle="canViewTeam ? '当前筛选范围统计' : '包含迟到且早退记录'" :icon="WarningFilled" color="var(--warning)" />
      <StatCard title="本月早退" :value="activeStatistics.earlyLeaveCount || 0" :subtitle="canViewTeam ? `涉及 ${summary.totalUsers || 0} 名员工` : '当前账号个人统计'" :icon="Timer" color="var(--success)" />
    </div>

    <div class="two-col attendance-main-grid">
      <section class="panel section attendance-record-panel">
        <SectionTitle title="考勤记录" :subtitle="scope.scopeNote || '记录由考勤服务按权限范围查询。'">
          <template #extra>
            <div class="attendance-filters">
              <el-select v-if="canViewTeam" v-model="departmentFilter" clearable placeholder="全部可见部门" class="attendance-org-filter" @change="changeDepartment">
                <el-option v-for="item in scope.departments" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
              <el-select v-if="canViewTeam" v-model="userFilter" clearable filterable placeholder="全部员工" class="attendance-user-filter" @change="searchRecords">
                <el-option v-for="item in visibleUsers" :key="item.id" :label="`${item.displayName}（${item.departmentName || '未分配部门'}）`" :value="item.id" />
              </el-select>
              <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" class="attendance-date-filter" @change="searchRecords" />
              <el-select v-model="statusFilter" clearable placeholder="全部状态" class="attendance-status-filter" @change="searchRecords">
                <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </div>
          </template>
        </SectionTitle>
        <div class="table-wrap">
          <el-table v-loading="loadingRecords" :data="records" border min-height="350" empty-text="暂无考勤记录">
            <el-table-column v-if="canViewTeam" prop="employeeName" label="员工" min-width="120">
              <template #default="{ row }"><div class="employee-cell"><strong>{{ row.employeeName || row.username || row.userId }}</strong><span>{{ row.username || '' }}</span></div></template>
            </el-table-column>
            <el-table-column v-if="canViewTeam" prop="departmentName" label="部门" min-width="110"><template #default="{ row }">{{ row.departmentName || '未分配' }}</template></el-table-column>
            <el-table-column prop="workDate" label="日期" width="115" />
            <el-table-column label="上班时间" min-width="145"><template #default="{ row }">{{ formatDateTime(row.checkInTime) }}</template></el-table-column>
            <el-table-column label="下班时间" min-width="145"><template #default="{ row }">{{ formatDateTime(row.checkOutTime) }}</template></el-table-column>
            <el-table-column label="状态" width="130"><template #default="{ row }"><span class="status-pill" :class="pillClass(row.status)">{{ statusLabel(row.status) }}</span></template></el-table-column>
            <el-table-column label="异常时长" min-width="130"><template #default="{ row }">{{ exceptionText(row) }}</template></el-table-column>
          </el-table>
        </div>
        <div class="attendance-pagination">
          <span>共 {{ total }} 条</span>
          <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="loadRecords" />
        </div>
      </section>

      <aside class="panel section today-panel">
        <SectionTitle title="我的今日打卡" subtitle="管理视图不会影响你自己的打卡操作。" />
        <div class="today-status-card" :class="{ 'is-complete': today.checkOutTime }">
          <span class="today-status-dot"></span>
          <div><strong>{{ statusLabel(today.status) }}</strong><p>{{ todayActionHint }}</p></div>
        </div>
        <el-timeline class="attendance-timeline">
          <el-timeline-item timestamp="上班打卡" placement="top" :type="today.checkInTime ? 'primary' : 'info'">{{ today.checkInTime ? formatDateTime(today.checkInTime) : '等待打卡' }}</el-timeline-item>
          <el-timeline-item timestamp="下班打卡" placement="top" :type="today.checkOutTime ? 'success' : 'info'">{{ today.checkOutTime ? formatDateTime(today.checkOutTime) : '等待打卡' }}</el-timeline-item>
        </el-timeline>
        <div class="attendance-rule-note">
          <strong>当前规则</strong>
          <span>标准班次 {{ shortTime(rule.workStart) }}–{{ shortTime(rule.workEnd) }}，{{ rule.lateThresholdMinutes }} 分钟宽限；超过 {{ lateBoundary }} 计为迟到。</span>
        </div>
      </aside>
    </div>

    <el-dialog v-model="ruleDialogVisible" title="设置考勤规则" width="460px" destroy-on-close>
      <el-alert title="仅影响保存后新产生的上班打卡；已经打卡的记录继续使用当时的规则快照。" type="info" :closable="false" show-icon class="rule-alert" />
      <el-form label-position="top">
        <div class="rule-time-grid">
          <el-form-item label="上班时间" required><el-time-picker v-model="ruleForm.workStart" format="HH:mm" value-format="HH:mm:ss" placeholder="选择上班时间" style="width: 100%" /></el-form-item>
          <el-form-item label="下班时间" required><el-time-picker v-model="ruleForm.workEnd" format="HH:mm" value-format="HH:mm:ss" placeholder="选择下班时间" style="width: 100%" /></el-form-item>
        </div>
        <el-form-item label="迟到宽限时间">
          <el-input-number v-model="ruleForm.lateThresholdMinutes" :min="0" :max="180" controls-position="right" style="width: 100%" />
          <div class="form-help">在上班时间后 {{ ruleForm.lateThresholdMinutes }} 分钟内打卡仍视为正常。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingRule" @click="saveRule">保存并生效</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Calendar, Clock, Finished, Setting, Timer, WarningFilled } from '@element-plus/icons-vue'
import { checkIn, checkOut, getAttendanceRule, getAttendanceScope, getAttendanceSummary, getMonthlyStatistics, getTodayStatus, listAttendanceRecords, updateAttendanceRule } from '../api/attendance'
import { useAuthStore } from '../stores/auth'
import SectionTitle from '../components/SectionTitle.vue'
import StatCard from '../components/StatCard.vue'

const auth = useAuthStore()
const loading = ref(false)
const loadingRecords = ref(false)
const punching = ref(false)
const savingRule = ref(false)
const ruleDialogVisible = ref(false)
const records = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const dateRange = ref([])
const statusFilter = ref('')
const departmentFilter = ref('')
const userFilter = ref('')
const today = reactive({ workDate: '', checkInTime: null, checkOutTime: null, status: null, canCheckIn: false, canCheckOut: false })
const monthly = reactive({ totalRecords: 0, normalCount: 0, lateCount: 0, earlyLeaveCount: 0, missingCheckOutCount: 0 })
const summary = reactive({ totalRecords: 0, totalUsers: 0, normalCount: 0, lateCount: 0, earlyLeaveCount: 0, missingCheckOutCount: 0 })
const scope = reactive({ dataScope: 'SELF', scopeNote: '', departments: [], users: [] })
const rule = reactive({ workStart: '09:00:00', workEnd: '18:00:00', lateThresholdMinutes: 5, updatedAt: null })
const ruleForm = reactive({ workStart: '09:00:00', workEnd: '18:00:00', lateThresholdMinutes: 5 })
const canManageRule = computed(() => auth.hasPermission('attendance:rule:update'))
const canViewTeam = computed(() => scope.dataScope !== 'SELF')
const activeStatistics = computed(() => canViewTeam.value ? summary : monthly)
const scopeLabel = computed(() => {
  if (scope.dataScope === 'ALL_USERS') return '全组织'
  if (scope.dataScope === 'DEPARTMENT') return scope.departments.map((item) => item.name).join('、') || '负责部门'
  return '本人'
})
const visibleUsers = computed(() => {
  if (!departmentFilter.value) return scope.users
  return scope.users.filter((item) => String(item.departmentId) === String(departmentFilter.value))
})

const statusOptions = [
  { value: 'IN_PROGRESS', label: '工作中' },
  { value: 'IN_PROGRESS_LATE', label: '迟到，工作中' },
  { value: 'NORMAL', label: '正常' },
  { value: 'LATE', label: '迟到' },
  { value: 'EARLY_LEAVE', label: '早退' },
  { value: 'LATE_AND_EARLY_LEAVE', label: '迟到且早退' },
  { value: 'MISSING_CHECK_OUT', label: '缺下班卡' }
]

const todayActionHint = computed(() => {
  if (today.canCheckIn) return '今天还没有上班打卡'
  if (today.canCheckOut) return '上班打卡已完成，下班时记得签退'
  if (today.checkOutTime) return '今天的上下班打卡已经完成'
  return '今日暂无可执行的打卡操作'
})

const lateBoundary = computed(() => {
  const [hours, minutes] = String(rule.workStart || '09:00').split(':').map(Number)
  const total = hours * 60 + minutes + Number(rule.lateThresholdMinutes || 0)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
})

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function currentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const end = new Date(year, month + 1, 0).getDate()
  return { startDate, endDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(end).padStart(2, '0')}` }
}

function statusLabel(status) {
  return statusOptions.find((item) => item.value === status)?.label || '未打卡'
}

function shortTime(value) {
  return String(value || '--:--').slice(0, 5)
}

function formatDateTime(value) {
  if (!value) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date(value))
}

function pillClass(status) {
  if (status === 'NORMAL') return 'is-success'
  if (['LATE', 'EARLY_LEAVE', 'LATE_AND_EARLY_LEAVE', 'IN_PROGRESS_LATE'].includes(status)) return 'is-warning'
  if (status === 'MISSING_CHECK_OUT') return 'is-danger'
  return 'is-info'
}

function exceptionText(row) {
  const parts = []
  if (row.lateMinutes) parts.push(`迟到 ${row.lateMinutes} 分钟`)
  if (row.earlyLeaveMinutes) parts.push(`早退 ${row.earlyLeaveMinutes} 分钟`)
  return parts.join('，') || '无'
}

async function loadRecords() {
  loadingRecords.value = true
  try {
    const data = await listAttendanceRecords({
      page: page.value,
      size: pageSize,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
      status: statusFilter.value,
      userId: userFilter.value,
      departmentId: departmentFilter.value
    })
    records.value = data?.items || []
    total.value = Number(data?.total || 0)
  } catch (error) {
    ElMessage.error(error.message || '考勤记录加载失败')
  } finally {
    loadingRecords.value = false
  }
}

async function loadSummary() {
  if (!canViewTeam.value) return
  const range = dateRange.value?.length === 2
    ? { startDate: dateRange.value[0], endDate: dateRange.value[1] }
    : currentMonthRange()
  const data = await getAttendanceSummary({
    ...range,
    targetUserId: userFilter.value,
    departmentId: departmentFilter.value
  })
  Object.assign(summary, data || {})
}

async function loadAll() {
  loading.value = true
  try {
    const scopeData = await getAttendanceScope()
    Object.assign(scope, scopeData || {})
    const [todayData, monthlyData, ruleData] = await Promise.all([getTodayStatus(), getMonthlyStatistics(currentMonth()), getAttendanceRule()])
    Object.assign(today, todayData || {})
    Object.assign(monthly, monthlyData || {})
    Object.assign(rule, ruleData || {})
    await Promise.all([loadRecords(), loadSummary()])
  } catch (error) {
    ElMessage.error(error.message || '考勤数据加载失败')
  } finally {
    loading.value = false
  }
}

function openRuleDialog() {
  Object.assign(ruleForm, {
    workStart: rule.workStart || '09:00:00',
    workEnd: rule.workEnd || '18:00:00',
    lateThresholdMinutes: Number(rule.lateThresholdMinutes ?? 5)
  })
  ruleDialogVisible.value = true
}

async function saveRule() {
  if (!ruleForm.workStart || !ruleForm.workEnd) {
    ElMessage.warning('请选择上班和下班时间')
    return
  }
  if (ruleForm.workEnd <= ruleForm.workStart) {
    ElMessage.warning('下班时间必须晚于上班时间')
    return
  }
  savingRule.value = true
  try {
    const updated = await updateAttendanceRule({ ...ruleForm })
    Object.assign(rule, updated || ruleForm)
    ruleDialogVisible.value = false
    ElMessage.success('考勤规则已更新')
  } catch (error) {
    ElMessage.error(error.message || '考勤规则保存失败')
  } finally { savingRule.value = false }
}

async function searchRecords() {
  page.value = 1
  try {
    await Promise.all([loadRecords(), loadSummary()])
  } catch (error) {
    ElMessage.error(error.message || '考勤统计加载失败')
  }
}

function changeDepartment() {
  if (userFilter.value && !visibleUsers.value.some((item) => String(item.id) === String(userFilter.value))) {
    userFilter.value = ''
  }
  searchRecords()
}

async function doCheckIn() {
  punching.value = true
  try {
    const result = await checkIn()
    ElMessage.success(result?.late ? `上班打卡成功，迟到 ${result.lateMinutes} 分钟` : '上班打卡成功')
    await loadAll()
  } catch (error) {
    ElMessage.warning(error.message || '上班打卡失败')
  } finally { punching.value = false }
}

async function doCheckOut() {
  punching.value = true
  try {
    const result = await checkOut()
    ElMessage.success(result?.earlyLeave ? `下班打卡成功，早退 ${result.earlyLeaveMinutes} 分钟` : '下班打卡成功')
    await loadAll()
  } catch (error) {
    ElMessage.warning(error.message || '下班打卡失败')
  } finally { punching.value = false }
}

onMounted(loadAll)
</script>

<style scoped>
.attendance-main-grid { align-items: start; grid-template-columns: minmax(0, 1.7fr) minmax(280px, .7fr); }
.attendance-filters { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.attendance-org-filter { width: 150px; }
.attendance-user-filter { width: 220px; }
.attendance-date-filter { width: 250px; }
.attendance-status-filter { width: 145px; }
.table-wrap { width: 100%; overflow-x: auto; }
.employee-cell { display: flex; flex-direction: column; gap: 2px; }
.employee-cell strong { color: var(--text); font-size: 13px; }
.employee-cell span { color: var(--muted); font-size: 11px; }
.attendance-pagination { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; color: var(--muted); font-size: 13px; }
.today-status-card { display: flex; align-items: center; gap: 13px; padding: 16px; margin-bottom: 24px; border: 1px solid #dbeafe; border-radius: 12px; background: #f4f8ff; }
.today-status-card.is-complete { border-color: #bbf7d0; background: #f0fdf4; }
.today-status-card strong { color: var(--text); font-size: 16px; }
.today-status-card p { margin: 4px 0 0; color: var(--muted); font-size: 12px; }
.today-status-dot { width: 10px; height: 10px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 0 5px rgb(59 130 246 / 12%); }
.is-complete .today-status-dot { background: #22c55e; box-shadow: 0 0 0 5px rgb(34 197 94 / 12%); }
.attendance-timeline { padding: 2px 4px; }
.attendance-rule-note { display: flex; flex-direction: column; gap: 5px; padding: 13px 15px; border-radius: 10px; background: var(--panel-soft, #f8fafc); }
.attendance-rule-note strong { font-size: 13px; }
.attendance-rule-note span { color: var(--muted); font-size: 12px; line-height: 1.6; }
.rule-alert { margin-bottom: 20px; }
.rule-time-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-help { margin-top: 6px; color: var(--muted); font-size: 12px; line-height: 1.5; }
@media (max-width: 1000px) { .attendance-main-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) {
  .attendance-filters { width: 100%; justify-content: stretch; }
  .attendance-org-filter, .attendance-user-filter, .attendance-date-filter, .attendance-status-filter { flex: 1 1 180px; width: 100%; }
  .rule-time-grid { grid-template-columns: 1fr; gap: 0; }
}
</style>
