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
        <el-button v-if="canManageRule" :icon="Calendar" @click="openScheduleDialog">排班日历</el-button>
        <el-button :icon="EditPen" @click="openCorrectionDialog">
          补卡申请
          <el-badge v-if="canViewTeam && pendingCorrections.length" :value="pendingCorrections.length" class="correction-badge" />
        </el-button>
        <el-button type="primary" :icon="Clock" :loading="punching" :disabled="!today.canCheckIn || !todaySchedule.workingDay" @click="doCheckIn">上班打卡</el-button>
        <el-button :icon="Finished" :loading="punching" :disabled="!today.canCheckOut || !todaySchedule.workingDay" @click="doCheckOut">下班打卡</el-button>
      </div>
    </div>

    <div class="attendance-stat-grid">
      <StatCard :title="canViewTeam ? '范围内记录' : '今日状态'" :value="canViewTeam ? summary.totalRecords : statusLabel(today.status)" :subtitle="canViewTeam ? scopeLabel : (today.workDate || '尚未获取')" :icon="Calendar" color="var(--primary)" />
      <StatCard title="本月迟到" :value="activeStatistics.lateCount || 0" :subtitle="canViewTeam ? '当前筛选范围统计' : '包含迟到且早退记录'" :icon="WarningFilled" color="var(--warning)" />
      <StatCard title="本月早退" :value="activeStatistics.earlyLeaveCount || 0" :subtitle="canViewTeam ? `涉及 ${summary.totalUsers || 0} 名员工` : '当前账号个人统计'" :icon="Timer" color="var(--success)" />
      <StatCard title="本月缺卡/旷工" :value="attendanceExceptionCount" subtitle="缺上班卡、缺下班卡及全天未打卡" :icon="CircleCloseFilled" color="var(--danger)" />
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
          <strong>{{ todaySchedule.workingDay ? `今日班次 · ${todaySchedule.shiftName || '标准班次'}` : (todaySchedule.holidayName || '今日休息') }}</strong>
          <span v-if="todaySchedule.workingDay">{{ shortTime(todaySchedule.workStart) }}–{{ shortTime(todaySchedule.workEnd) }}，{{ todaySchedule.lateThresholdMinutes }} 分钟宽限；超过 {{ scheduleLateBoundary }} 计为迟到。</span>
          <span v-else>工作日历已将今天设置为休息日，无需考勤打卡。</span>
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

    <el-dialog v-model="correctionDialogVisible" title="考勤补卡" width="780px" destroy-on-close>
      <el-tabs v-model="correctionTab">
        <el-tab-pane label="发起补卡" name="create">
          <el-alert title="补卡通过后会重新计算该工作日的迟到、早退和缺卡状态。" type="info" :closable="false" show-icon class="rule-alert" />
          <el-form label-position="top">
            <div class="correction-form-grid">
              <el-form-item label="工作日期" required>
                <el-date-picker v-model="correctionForm.workDate" value-format="YYYY-MM-DD" :disabled-date="disableFutureDate" placeholder="选择日期" style="width: 100%" />
              </el-form-item>
              <el-form-item label="补卡类型" required>
                <el-radio-group v-model="correctionForm.correctionType">
                  <el-radio-button value="CHECK_IN">补上班卡</el-radio-button>
                  <el-radio-button value="CHECK_OUT">补下班卡</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="实际打卡时间" required>
                <el-time-picker v-model="correctionForm.correctionTime" format="HH:mm" value-format="HH:mm:ss" placeholder="选择时间" style="width: 100%" />
              </el-form-item>
              <el-form-item label="补卡原因" required>
                <el-input v-model="correctionForm.reason" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="请说明未正常打卡的原因" />
              </el-form-item>
            </div>
          </el-form>
          <div class="dialog-actions">
            <el-button @click="correctionDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="submittingCorrection" @click="submitCorrection">提交审批</el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane :label="`我的申请（${myCorrections.length}）`" name="mine">
          <el-table :data="myCorrections" border empty-text="暂无补卡申请">
            <el-table-column prop="workDate" label="工作日期" width="115" />
            <el-table-column label="类型" width="105"><template #default="{ row }">{{ correctionTypeLabel(row.correctionType) }}</template></el-table-column>
            <el-table-column label="补卡时间" width="110"><template #default="{ row }">{{ String(row.correctionTime || '').slice(11, 16) }}</template></el-table-column>
            <el-table-column prop="reason" label="原因" min-width="160" show-overflow-tooltip />
            <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="correctionStatusType(row.status)">{{ correctionStatusLabel(row.status) }}</el-tag></template></el-table-column>
            <el-table-column prop="reviewComment" label="审批意见" min-width="130"><template #default="{ row }">{{ row.reviewComment || '—' }}</template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane v-if="canViewTeam" :label="`待我审批（${pendingCorrections.length}）`" name="pending">
          <el-table :data="pendingCorrections" border empty-text="暂无待审批补卡">
            <el-table-column prop="userName" label="员工" width="120" />
            <el-table-column prop="workDate" label="工作日期" width="115" />
            <el-table-column label="类型" width="105"><template #default="{ row }">{{ correctionTypeLabel(row.correctionType) }}</template></el-table-column>
            <el-table-column label="补卡时间" width="100"><template #default="{ row }">{{ String(row.correctionTime || '').slice(11, 16) }}</template></el-table-column>
            <el-table-column prop="reason" label="原因" min-width="150" show-overflow-tooltip />
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button link type="success" @click="reviewCorrection(row, 'APPROVE')">通过</el-button>
                <el-button link type="danger" @click="reviewCorrection(row, 'REJECT')">驳回</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <el-dialog v-model="scheduleDialogVisible" title="工作日历与人员排班" width="960px" destroy-on-close>
      <el-alert title="日历覆盖优先于默认双休；人员排班优先于默认班次。修改后仅影响尚未产生考勤记录的日期。" type="info" :closable="false" show-icon class="rule-alert" />
      <el-tabs v-model="scheduleTab">
        <el-tab-pane label="工作日历" name="calendar">
          <div class="schedule-editor-grid">
            <el-form label-position="top" class="schedule-editor-card">
              <el-form-item label="日期" required>
                <el-date-picker v-model="calendarForm.workDate" value-format="YYYY-MM-DD" placeholder="选择需要覆盖的日期" style="width: 100%" />
              </el-form-item>
              <el-form-item label="日期类型" required>
                <el-radio-group v-model="calendarForm.dayType">
                  <el-radio-button value="WORKDAY">调为工作日</el-radio-button>
                  <el-radio-button value="HOLIDAY">调为休息日</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="节假日 / 调休说明">
                <el-input v-model="calendarForm.holidayName" maxlength="100" placeholder="例如：国庆节、春节调休上班" />
              </el-form-item>
              <div class="dialog-actions">
                <el-button :disabled="!calendarForm.workDate" @click="removeCalendarDay">恢复默认</el-button>
                <el-button type="primary" :loading="savingSchedule" @click="saveCalendarDay">保存日期设置</el-button>
              </div>
            </el-form>
            <div>
              <div class="schedule-list-head">
                <strong>已设置日期</strong>
                <el-date-picker v-model="calendarMonth" type="month" value-format="YYYY-MM" placeholder="选择月份" style="width: 150px" @change="loadCalendar" />
              </div>
              <el-table :data="calendarOverrides" border max-height="330" empty-text="当前月份使用默认工作日规则">
                <el-table-column prop="workDate" label="日期" width="120" />
                <el-table-column label="类型" width="110">
                  <template #default="{ row }"><el-tag :type="row.dayType === 'HOLIDAY' ? 'success' : 'warning'">{{ row.dayType === 'HOLIDAY' ? '休息日' : '工作日' }}</el-tag></template>
                </el-table-column>
                <el-table-column prop="holidayName" label="说明"><template #default="{ row }">{{ row.holidayName || '调休上班' }}</template></el-table-column>
                <el-table-column label="操作" width="80"><template #default="{ row }"><el-button link type="primary" @click="editCalendarDay(row)">编辑</el-button></template></el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="班次设置" name="shifts">
          <div class="schedule-editor-grid">
            <el-form label-position="top" class="schedule-editor-card">
              <el-form-item label="班次名称" required><el-input v-model="shiftForm.name" maxlength="64" placeholder="例如：早班" /></el-form-item>
              <div class="rule-time-grid">
                <el-form-item label="上班时间" required><el-time-picker v-model="shiftForm.workStart" format="HH:mm" value-format="HH:mm:ss" style="width: 100%" /></el-form-item>
                <el-form-item label="下班时间" required><el-time-picker v-model="shiftForm.workEnd" format="HH:mm" value-format="HH:mm:ss" style="width: 100%" /></el-form-item>
              </div>
              <el-form-item label="迟到宽限"><el-input-number v-model="shiftForm.lateThresholdMinutes" :min="0" :max="180" style="width: 100%" /></el-form-item>
              <div class="shift-flags">
                <el-checkbox v-model="shiftForm.defaultShift">设为默认班次</el-checkbox>
                <el-switch v-model="shiftForm.enabled" active-text="启用" inactive-text="停用" />
              </div>
              <div class="dialog-actions">
                <el-button @click="resetShiftForm">新增模式</el-button>
                <el-button type="primary" :loading="savingSchedule" @click="saveShift">保存班次</el-button>
              </div>
            </el-form>
            <el-table :data="shifts" border max-height="390" empty-text="暂无班次">
              <el-table-column prop="name" label="班次" min-width="110" />
              <el-table-column label="时间" width="130"><template #default="{ row }">{{ shortTime(row.workStart) }}–{{ shortTime(row.workEnd) }}</template></el-table-column>
              <el-table-column prop="lateThresholdMinutes" label="宽限" width="75"><template #default="{ row }">{{ row.lateThresholdMinutes }} 分</template></el-table-column>
              <el-table-column label="属性" min-width="120"><template #default="{ row }"><el-tag v-if="row.defaultShift">默认</el-tag><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="80"><template #default="{ row }"><el-button link type="primary" @click="editShift(row)">编辑</el-button></template></el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="人员排班" name="assignments">
          <div class="assignment-form">
            <el-select v-model="assignmentForm.userId" filterable placeholder="选择员工">
              <el-option v-for="item in scope.users" :key="item.id" :value="item.id" :label="`${item.displayName}（${item.departmentName || '未分配'}）`" />
            </el-select>
            <el-select v-model="assignmentForm.shiftId" placeholder="选择班次">
              <el-option v-for="item in enabledShifts" :key="item.id" :value="item.id" :label="`${item.name} ${shortTime(item.workStart)}–${shortTime(item.workEnd)}`" />
            </el-select>
            <el-date-picker v-model="assignmentForm.dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" />
            <el-button type="primary" :loading="savingSchedule" @click="saveAssignment">安排班次</el-button>
          </div>
          <el-table :data="assignments" border max-height="360" empty-text="暂无人员排班">
            <el-table-column label="员工" min-width="150"><template #default="{ row }">{{ userName(row.userId) }}</template></el-table-column>
            <el-table-column label="班次" min-width="130"><template #default="{ row }">{{ shiftName(row.shiftId) }}</template></el-table-column>
            <el-table-column prop="startDate" label="开始日期" width="120" />
            <el-table-column prop="endDate" label="结束日期" width="120" />
            <el-table-column label="操作" width="80"><template #default="{ row }"><el-button link type="danger" @click="removeAssignment(row)">删除</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Calendar, CircleCloseFilled, Clock, EditPen, Finished, Setting, Timer, WarningFilled } from '@element-plus/icons-vue'
import { checkIn, checkOut, createAttendanceCorrection, createAttendanceShift, createShiftAssignment, deleteCalendarOverride, deleteShiftAssignment, getAttendanceRule, getAttendanceScope, getAttendanceSummary, getMonthlyStatistics, getTodayStatus, getTodayWorkSchedule, listAttendanceRecords, listAttendanceShifts, listCalendarOverrides, listMyAttendanceCorrections, listPendingAttendanceCorrections, listShiftAssignments, reviewAttendanceCorrection, updateAttendanceRule, updateAttendanceShift, updateCalendarOverride } from '../api/attendance'
import { useAuthStore } from '../stores/auth'
import SectionTitle from '../components/SectionTitle.vue'
import StatCard from '../components/StatCard.vue'

const auth = useAuthStore()
const loading = ref(false)
const loadingRecords = ref(false)
const punching = ref(false)
const savingRule = ref(false)
const ruleDialogVisible = ref(false)
const correctionDialogVisible = ref(false)
const correctionTab = ref('create')
const submittingCorrection = ref(false)
const myCorrections = ref([])
const pendingCorrections = ref([])
const scheduleDialogVisible = ref(false)
const scheduleTab = ref('calendar')
const savingSchedule = ref(false)
const calendarOverrides = ref([])
const shifts = ref([])
const assignments = ref([])
const calendarMonth = ref(new Date().toISOString().slice(0, 7))
const records = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const dateRange = ref([])
const statusFilter = ref('')
const departmentFilter = ref('')
const userFilter = ref('')
const today = reactive({ workDate: '', checkInTime: null, checkOutTime: null, status: null, canCheckIn: false, canCheckOut: false })
const monthly = reactive({ totalRecords: 0, normalCount: 0, lateCount: 0, earlyLeaveCount: 0, missingCheckOutCount: 0, missingCheckInCount: 0, absentCount: 0 })
const summary = reactive({ totalRecords: 0, totalUsers: 0, normalCount: 0, lateCount: 0, earlyLeaveCount: 0, missingCheckOutCount: 0, missingCheckInCount: 0, absentCount: 0 })
const scope = reactive({ dataScope: 'SELF', scopeNote: '', departments: [], users: [] })
const rule = reactive({ workStart: '09:00:00', workEnd: '18:00:00', lateThresholdMinutes: 5, updatedAt: null })
const ruleForm = reactive({ workStart: '09:00:00', workEnd: '18:00:00', lateThresholdMinutes: 5 })
const todaySchedule = reactive({ workingDay: true, shiftName: '标准班次', workStart: '09:00:00', workEnd: '18:00:00', lateThresholdMinutes: 5, holidayName: null })
const correctionForm = reactive({ workDate: '', correctionType: 'CHECK_IN', correctionTime: '', reason: '' })
const calendarForm = reactive({ workDate: '', dayType: 'HOLIDAY', holidayName: '' })
const shiftForm = reactive({ id: '', name: '', workStart: '09:00:00', workEnd: '18:00:00', lateThresholdMinutes: 5, color: '#409eff', defaultShift: false, enabled: true })
const assignmentForm = reactive({ userId: '', shiftId: '', dateRange: [] })
const canManageRule = computed(() => auth.hasPermission('attendance:rule:update'))
const canViewTeam = computed(() => scope.dataScope !== 'SELF')
const activeStatistics = computed(() => canViewTeam.value ? summary : monthly)
const attendanceExceptionCount = computed(() =>
  Number(activeStatistics.value.missingCheckOutCount || 0)
  + Number(activeStatistics.value.missingCheckInCount || 0)
  + Number(activeStatistics.value.absentCount || 0))
const scopeLabel = computed(() => {
  if (scope.dataScope === 'ALL_USERS') return '全组织'
  if (scope.dataScope === 'DEPARTMENT') return scope.departments.map((item) => item.name).join('、') || '负责部门'
  return '本人'
})
const visibleUsers = computed(() => {
  if (!departmentFilter.value) return scope.users
  return scope.users.filter((item) => String(item.departmentId) === String(departmentFilter.value))
})
const enabledShifts = computed(() => shifts.value.filter((item) => item.enabled))

const statusOptions = [
  { value: 'IN_PROGRESS', label: '工作中' },
  { value: 'IN_PROGRESS_LATE', label: '迟到，工作中' },
  { value: 'NORMAL', label: '正常' },
  { value: 'LEAVE', label: '已请假' },
  { value: 'LATE', label: '迟到' },
  { value: 'EARLY_LEAVE', label: '早退' },
  { value: 'LATE_AND_EARLY_LEAVE', label: '迟到且早退' },
  { value: 'MISSING_CHECK_IN', label: '缺上班卡' },
  { value: 'MISSING_CHECK_OUT', label: '缺下班卡' },
  { value: 'ABSENT', label: '旷工（全天未打卡）' }
]

const todayActionHint = computed(() => {
  if (!todaySchedule.workingDay) return todaySchedule.holidayName ? `${todaySchedule.holidayName}，无需打卡` : '今天是休息日，无需打卡'
  if (today.canCheckIn) return '今天还没有上班打卡'
  if (today.canCheckOut) return '上班打卡已完成，下班时记得签退'
  if (today.checkOutTime) return '今天的上下班打卡已经完成'
  return '今日暂无可执行的打卡操作'
})

const scheduleLateBoundary = computed(() => {
  const [hours, minutes] = String(todaySchedule.workStart || '09:00').split(':').map(Number)
  const total = hours * 60 + minutes + Number(todaySchedule.lateThresholdMinutes || 0)
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
  if (['NORMAL', 'LEAVE'].includes(status)) return 'is-success'
  if (['LATE', 'EARLY_LEAVE', 'LATE_AND_EARLY_LEAVE', 'IN_PROGRESS_LATE'].includes(status)) return 'is-warning'
  if (['MISSING_CHECK_IN', 'MISSING_CHECK_OUT', 'ABSENT'].includes(status)) return 'is-danger'
  return 'is-info'
}

function exceptionText(row) {
  const parts = []
  if (row.lateMinutes) parts.push(`迟到 ${row.lateMinutes} 分钟`)
  if (row.earlyLeaveMinutes) parts.push(`早退 ${row.earlyLeaveMinutes} 分钟`)
  if (row.status === 'MISSING_CHECK_IN') parts.push('缺上班卡')
  if (row.status === 'MISSING_CHECK_OUT') parts.push('缺下班卡')
  if (row.status === 'ABSENT') parts.push('全天未打卡')
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
    const [todayData, monthlyData, ruleData, scheduleData] = await Promise.all([
      getTodayStatus(), getMonthlyStatistics(currentMonth()), getAttendanceRule(), getTodayWorkSchedule()
    ])
    Object.assign(today, todayData || {})
    Object.assign(monthly, monthlyData || {})
    Object.assign(rule, ruleData || {})
    Object.assign(todaySchedule, scheduleData || {})
    await Promise.all([loadRecords(), loadSummary(), loadCorrections()])
  } catch (error) {
    ElMessage.error(error.message || '考勤数据加载失败')
  } finally {
    loading.value = false
  }
}

function calendarMonthRange() {
  const [year, month] = String(calendarMonth.value || currentMonth()).split('-').map(Number)
  const end = new Date(year, month, 0).getDate()
  return {
    startDate: `${year}-${String(month).padStart(2, '0')}-01`,
    endDate: `${year}-${String(month).padStart(2, '0')}-${String(end).padStart(2, '0')}`
  }
}

async function loadCalendar() {
  if (!calendarMonth.value) calendarMonth.value = currentMonth()
  calendarOverrides.value = await listCalendarOverrides(calendarMonthRange())
}

async function loadScheduleAdmin() {
  const [shiftData, assignmentData] = await Promise.all([
    listAttendanceShifts(), listShiftAssignments()
  ])
  shifts.value = shiftData || []
  assignments.value = assignmentData || []
  await loadCalendar()
}

async function openScheduleDialog() {
  scheduleTab.value = 'calendar'
  scheduleDialogVisible.value = true
  try {
    await loadScheduleAdmin()
  } catch (error) {
    ElMessage.error(error.message || '排班数据加载失败')
  }
}

function editCalendarDay(row) {
  Object.assign(calendarForm, {
    workDate: row.workDate,
    dayType: row.dayType,
    holidayName: row.holidayName || ''
  })
}

async function saveCalendarDay() {
  if (!calendarForm.workDate) {
    ElMessage.warning('请选择日期')
    return
  }
  if (calendarForm.dayType === 'HOLIDAY' && !calendarForm.holidayName.trim()) {
    ElMessage.warning('休息日需要填写节假日或调休说明')
    return
  }
  savingSchedule.value = true
  try {
    await updateCalendarOverride(calendarForm.workDate, {
      dayType: calendarForm.dayType,
      holidayName: calendarForm.holidayName.trim() || null
    })
    calendarMonth.value = calendarForm.workDate.slice(0, 7)
    ElMessage.success('工作日历已更新')
    await Promise.all([loadCalendar(), refreshTodaySchedule()])
  } catch (error) {
    ElMessage.error(error.message || '工作日历保存失败')
  } finally { savingSchedule.value = false }
}

async function removeCalendarDay() {
  if (!calendarForm.workDate) return
  try {
    await ElMessageBox.confirm('恢复后该日期将按默认周一至周五工作、周末休息判断。', '恢复默认日历', { type: 'warning' })
    await deleteCalendarOverride(calendarForm.workDate)
    Object.assign(calendarForm, { workDate: '', dayType: 'HOLIDAY', holidayName: '' })
    ElMessage.success('已恢复默认工作日规则')
    await Promise.all([loadCalendar(), refreshTodaySchedule()])
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '恢复失败')
  }
}

function resetShiftForm() {
  Object.assign(shiftForm, {
    id: '', name: '', workStart: '09:00:00', workEnd: '18:00:00',
    lateThresholdMinutes: 5, color: '#409eff', defaultShift: false, enabled: true
  })
}

function editShift(row) {
  Object.assign(shiftForm, { ...row })
}

async function saveShift() {
  if (!shiftForm.name.trim() || !shiftForm.workStart || !shiftForm.workEnd) {
    ElMessage.warning('请完整填写班次名称和时间')
    return
  }
  if (shiftForm.workEnd <= shiftForm.workStart) {
    ElMessage.warning('下班时间必须晚于上班时间')
    return
  }
  savingSchedule.value = true
  try {
    const payload = {
      name: shiftForm.name.trim(),
      workStart: shiftForm.workStart,
      workEnd: shiftForm.workEnd,
      lateThresholdMinutes: Number(shiftForm.lateThresholdMinutes || 0),
      color: shiftForm.color || '#409eff',
      defaultShift: Boolean(shiftForm.defaultShift),
      enabled: Boolean(shiftForm.enabled)
    }
    if (shiftForm.id) await updateAttendanceShift(shiftForm.id, payload)
    else await createAttendanceShift(payload)
    ElMessage.success('班次已保存')
    resetShiftForm()
    shifts.value = await listAttendanceShifts()
    await refreshTodaySchedule()
  } catch (error) {
    ElMessage.error(error.message || '班次保存失败')
  } finally { savingSchedule.value = false }
}

async function saveAssignment() {
  if (!assignmentForm.userId || !assignmentForm.shiftId || assignmentForm.dateRange?.length !== 2) {
    ElMessage.warning('请选择员工、班次和排班日期范围')
    return
  }
  savingSchedule.value = true
  try {
    await createShiftAssignment({
      userId: assignmentForm.userId,
      shiftId: assignmentForm.shiftId,
      startDate: assignmentForm.dateRange[0],
      endDate: assignmentForm.dateRange[1]
    })
    Object.assign(assignmentForm, { userId: '', shiftId: '', dateRange: [] })
    assignments.value = await listShiftAssignments()
    ElMessage.success('人员排班已保存')
    await refreshTodaySchedule()
  } catch (error) {
    ElMessage.error(error.message || '人员排班保存失败')
  } finally { savingSchedule.value = false }
}

async function removeAssignment(row) {
  try {
    await ElMessageBox.confirm(`确认删除 ${userName(row.userId)} 的这段排班吗？`, '删除排班', { type: 'warning' })
    await deleteShiftAssignment(row.id)
    assignments.value = await listShiftAssignments()
    ElMessage.success('排班已删除')
    await refreshTodaySchedule()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '删除排班失败')
  }
}

function userName(userId) {
  const user = scope.users.find((item) => String(item.id) === String(userId))
  return user ? `${user.displayName}（${user.departmentName || '未分配'}）` : userId
}

function shiftName(shiftId) {
  return shifts.value.find((item) => String(item.id) === String(shiftId))?.name || shiftId
}

async function refreshTodaySchedule() {
  Object.assign(todaySchedule, await getTodayWorkSchedule())
}

async function loadCorrections() {
  myCorrections.value = await listMyAttendanceCorrections()
  if (canViewTeam.value) {
    pendingCorrections.value = await listPendingAttendanceCorrections()
  } else {
    pendingCorrections.value = []
  }
}

async function openCorrectionDialog() {
  correctionTab.value = 'create'
  correctionDialogVisible.value = true
  try { await loadCorrections() } catch (error) { ElMessage.error(error.message || '补卡数据加载失败') }
}

function disableFutureDate(date) {
  return date.getTime() > Date.now() || [0, 6].includes(date.getDay())
}

function correctionTypeLabel(type) {
  return type === 'CHECK_OUT' ? '下班补卡' : '上班补卡'
}

function correctionStatusLabel(status) {
  return ({ PENDING: '待审批', APPROVED: '已通过', REJECTED: '已驳回' })[status] || status
}

function correctionStatusType(status) {
  return ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' })[status] || 'info'
}

async function submitCorrection() {
  if (!correctionForm.workDate || !correctionForm.correctionTime || !correctionForm.reason.trim()) {
    ElMessage.warning('请完整填写补卡日期、时间和原因')
    return
  }
  submittingCorrection.value = true
  try {
    await createAttendanceCorrection({ ...correctionForm, reason: correctionForm.reason.trim() })
    Object.assign(correctionForm, { workDate: '', correctionType: 'CHECK_IN', correctionTime: '', reason: '' })
    ElMessage.success('补卡申请已提交')
    correctionTab.value = 'mine'
    await loadCorrections()
  } catch (error) {
    ElMessage.error(error.message || '补卡申请提交失败')
  } finally { submittingCorrection.value = false }
}

async function reviewCorrection(row, decision) {
  try {
    let comment = ''
    if (decision === 'REJECT') {
      const result = await ElMessageBox.prompt('请填写驳回原因', '驳回补卡', {
        confirmButtonText: '确认驳回',
        cancelButtonText: '取消',
        inputValidator: (value) => Boolean(value?.trim()) || '驳回原因不能为空'
      })
      comment = result.value.trim()
    } else {
      await ElMessageBox.confirm(`确认通过 ${row.userName || '该员工'} 的${correctionTypeLabel(row.correctionType)}申请吗？`, '审批补卡', { type: 'warning' })
    }
    await reviewAttendanceCorrection(row.id, { decision, comment })
    ElMessage.success(decision === 'APPROVE' ? '补卡已通过并回写考勤' : '补卡已驳回')
    await Promise.all([loadCorrections(), loadRecords(), loadSummary()])
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '补卡审批失败')
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
.attendance-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
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
.correction-badge { margin-left: 8px; }
.correction-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.correction-form-grid .el-form-item:last-child { grid-column: 1 / -1; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.schedule-editor-grid { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(420px, 1.4fr); gap: 20px; align-items: start; }
.schedule-editor-card { padding: 18px; border: 1px solid var(--line, #e5e7eb); border-radius: 12px; background: var(--panel-soft, #f8fafc); }
.schedule-list-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.shift-flags { display: flex; align-items: center; justify-content: space-between; margin: 4px 0 18px; }
.assignment-form { display: grid; grid-template-columns: 1.2fr 1fr 1.5fr auto; gap: 10px; margin-bottom: 16px; }
@media (max-width: 1000px) {
  .attendance-main-grid { grid-template-columns: 1fr; }
  .attendance-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .attendance-stat-grid { grid-template-columns: 1fr; }
  .attendance-filters { width: 100%; justify-content: stretch; }
  .attendance-org-filter, .attendance-user-filter, .attendance-date-filter, .attendance-status-filter { flex: 1 1 180px; width: 100%; }
  .rule-time-grid, .correction-form-grid { grid-template-columns: 1fr; gap: 0; }
  .correction-form-grid .el-form-item:last-child { grid-column: auto; }
  .schedule-editor-grid, .assignment-form { grid-template-columns: 1fr; }
}
</style>
