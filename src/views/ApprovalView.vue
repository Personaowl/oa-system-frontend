<template>
  <div class="content-grid approval-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">审批流程</h1>
        <p class="page-subtitle">提交请假或加班申请，实时查看审批进度与待办任务。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadData">刷新</el-button>
        <el-button type="primary" :icon="DocumentAdd" @click="openCreateDialog">新建申请</el-button>
      </div>
    </div>

    <div class="approval-overview">
      <button class="overview-card reviewer" @click="activeTab = isReviewer ? 'todo' : 'mine'">
        <span class="overview-icon"><el-icon><component :is="isReviewer ? DocumentChecked : Select" /></el-icon></span>
        <span class="overview-copy">
          <small>{{ isReviewer ? '审批工作台' : '已完成申请' }}</small>
          <strong>{{ isReviewer ? todoTasks.length : myDoneCount }}</strong>
          <em>{{ isReviewer ? '项任务等待你处理' : '项申请已有审批结果' }}</em>
        </span>
        <span class="overview-action">{{ isReviewer ? '立即处理' : '查看记录' }} <el-icon><ArrowRight /></el-icon></span>
      </button>
      <button class="overview-card mine" @click="activeTab = 'mine'">
        <span class="overview-icon"><el-icon><UserFilled /></el-icon></span>
        <span class="overview-copy">
          <small>我的申请</small>
          <strong>{{ myRequests.length }}</strong>
          <em>{{ myPendingCount }} 项审批中，{{ myDoneCount }} 项已完成</em>
        </span>
        <span class="overview-action">查看全部 <el-icon><ArrowRight /></el-icon></span>
      </button>
    </div>

    <div class="panel section approval-main">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="我的申请" name="mine">
          <el-table v-loading="loading" :data="myRequests" border max-height="520" empty-text="暂无申请记录">
            <el-table-column prop="requestType" label="类型" width="105">
              <template #default="{ row }"><el-tag size="small" effect="plain">{{ typeText(row.requestType) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="申请时间" min-width="210">
              <template #default="{ row }">{{ formatDateTime(row.startTime) }} 至 {{ formatDateTime(row.endTime) }}</template>
            </el-table-column>
            <el-table-column label="时长" width="105">
              <template #default="{ row }">{{ durationText(row) }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="申请原因" min-width="180" show-overflow-tooltip />
            <el-table-column label="审批人" width="140">
              <template #default="{ row }">{{ row.currentApproverName || row.decidedByName || userText(row.currentApproverId || row.decidedBy) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="105">
              <template #default="{ row }"><el-tag size="small" :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="提交时间" width="165">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column prop="approvalComment" label="审批意见" min-width="150">
              <template #default="{ row }">{{ row.approvalComment || '—' }}</template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="145">
              <template #default="{ row }">
                <el-button link type="primary" @click="openDetail(row)">详情</el-button>
                <el-button v-if="row.status === 'PENDING'" link type="danger" @click="withdrawRequest(row)">撤回</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane v-if="isReviewer" :label="`待我审批（${todoTasks.length}）`" name="todo">
          <el-table v-loading="loading" :data="todoTasks" border max-height="520" empty-text="暂无待审批任务">
            <el-table-column label="申请人" width="140">
              <template #default="{ row }">{{ row.applicantName || userText(row.applicantId) }}</template>
            </el-table-column>
            <el-table-column label="类型" width="105">
              <template #default="{ row }"><el-tag size="small" effect="plain">{{ typeText(row.requestType) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="申请时间" min-width="220">
              <template #default="{ row }">{{ formatDateTime(row.startTime) }} 至 {{ formatDateTime(row.endTime) }}</template>
            </el-table-column>
            <el-table-column label="时长" width="105">
              <template #default="{ row }">{{ durationText(row) }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="申请原因" min-width="180" show-overflow-tooltip />
            <el-table-column label="提交时间" width="165">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="150">
              <template #default="{ row }">
                <el-button link @click="openDetail(row)">详情</el-button>
                <el-button link type="primary" @click="openReviewDialog(row, 'APPROVE')">同意</el-button>
                <el-button link type="danger" @click="openReviewDialog(row, 'REJECT')">驳回</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane v-if="isReviewer" label="我的已办" name="done">
          <el-table v-loading="loading" :data="doneTasks" border max-height="520" empty-text="暂无已处理任务">
            <el-table-column label="申请人" width="140">
              <template #default="{ row }">{{ row.applicantName || userText(row.applicantId) }}</template>
            </el-table-column>
            <el-table-column label="类型" width="105">
              <template #default="{ row }">{{ typeText(row.requestType) }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="申请原因" min-width="180" show-overflow-tooltip />
            <el-table-column label="处理结果" width="105">
              <template #default="{ row }"><el-tag size="small" :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="approvalComment" label="审批意见" min-width="180">
              <template #default="{ row }">{{ row.approvalComment || '—' }}</template>
            </el-table-column>
            <el-table-column label="处理时间" width="165">
              <template #default="{ row }">{{ formatDateTime(row.decidedAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="85">
              <template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="全文检索" name="search">
          <div class="flow-search-box">
            <div class="flow-search-filters">
              <el-input v-model="searchForm.keyword" clearable :prefix-icon="Search" placeholder="检索审批标题和申请原因" @keyup.enter="searchFlows" />
              <el-select v-model="searchForm.requestType" clearable placeholder="全部类型">
                <el-option label="请假申请" value="LEAVE" />
                <el-option label="加班申请" value="OVERTIME" />
              </el-select>
              <el-select v-model="searchForm.status" clearable placeholder="全部状态">
                <el-option label="待审批" value="PENDING" />
                <el-option label="已通过" value="APPROVED" />
                <el-option label="已驳回" value="REJECTED" />
                <el-option label="已撤回" value="WITHDRAWN" />
              </el-select>
              <el-date-picker v-model="searchForm.createdRange" type="datetimerange" range-separator="至" start-placeholder="提交起始" end-placeholder="提交结束" />
            </div>
            <div class="flow-search-actions">
              <el-button type="primary" :icon="Search" :loading="searching" @click="searchFlows">Elasticsearch 检索</el-button>
              <el-button :icon="RefreshLeft" @click="resetFlowSearch">重置</el-button>
              <el-button v-if="isAdmin" plain :icon="Connection" :loading="reindexing" @click="rebuildFlowIndex">重建索引</el-button>
              <span>共 {{ searchTotal }} 条，仅显示当前账号有权查看的数据</span>
            </div>
          </div>
          <el-table v-loading="searching" :data="searchResults" border max-height="520" empty-text="暂无匹配的审批记录">
            <el-table-column label="审批标题" width="150">
              <template #default="{ row }"><strong v-html="highlightHtml(row.highlightedTitle, row.title)"></strong></template>
            </el-table-column>
            <el-table-column label="申请内容" min-width="250">
              <template #default="{ row }"><span class="search-content" v-html="highlightHtml(row.highlightedContent, row.contentSnippet || '—')"></span></template>
            </el-table-column>
            <el-table-column label="申请时间" min-width="220">
              <template #default="{ row }">{{ formatDateTime(row.startTime) }} 至 {{ formatDateTime(row.endTime) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="105">
              <template #default="{ row }"><el-tag size="small" :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="提交时间" width="165">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="createVisible" title="新建申请" width="560px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <el-form-item label="申请类型" prop="type">
          <el-select v-model="createForm.type" style="width: 100%">
            <el-option label="请假申请" value="LEAVE" />
            <el-option label="加班申请" value="OVERTIME" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="createForm.type === 'LEAVE'" label="请假类型" prop="leaveType">
          <el-select v-model="createForm.leaveType" style="width: 100%">
            <el-option label="事假" value="PERSONAL" />
            <el-option label="病假" value="SICK" />
            <el-option label="年假" value="ANNUAL" />
            <el-option label="调休" value="COMPENSATORY" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="加班补偿方式" prop="overtimeCompensation">
          <el-radio-group v-model="createForm.overtimeCompensation">
            <el-radio-button value="COMPENSATORY">调休</el-radio-button>
            <el-radio-button value="PAY">加班费</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <div class="time-grid">
          <el-form-item label="开始时间" prop="startTime">
            <el-date-picker v-model="createForm.startTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="选择开始时间" style="width: 100%" />
          </el-form-item>
          <el-form-item label="结束时间" prop="endTime">
            <el-date-picker v-model="createForm.endTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="选择结束时间" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="auto-approver-tip">
          <el-icon><Select /></el-icon>
          <div><strong>审批人将自动确定</strong><span>优先提交给申请人所在部门负责人；未配置时由系统管理员接收。</span></div>
        </div>
        <el-form-item label="申请原因" prop="reason">
          <el-input v-model="createForm.reason" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="请说明申请原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitRequest">提交申请</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reviewVisible" :title="reviewForm.decision === 'APPROVE' ? '同意申请' : '驳回申请'" width="500px" destroy-on-close>
      <div v-if="reviewTarget" class="review-summary">
        <strong>{{ reviewTarget.applicantName || userText(reviewTarget.applicantId) }} · {{ typeText(reviewTarget.requestType) }}</strong>
        <span>{{ reviewTarget.reason }}</span>
      </div>
      <el-form label-position="top">
        <el-form-item :label="reviewForm.decision === 'REJECT' ? '审批意见（必填）' : '审批意见'">
          <el-input v-model="reviewForm.comment" type="textarea" :rows="4" maxlength="500" show-word-limit :placeholder="reviewForm.decision === 'APPROVE' ? '可填写审批意见' : '建议填写驳回原因'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button :type="reviewForm.decision === 'APPROVE' ? 'primary' : 'danger'" :loading="reviewing" @click="submitReview">
          确认{{ reviewForm.decision === 'APPROVE' ? '同意' : '驳回' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="申请详情" width="620px" destroy-on-close>
      <div v-loading="detailLoading">
        <el-descriptions v-if="detailRequest" :column="2" border>
          <el-descriptions-item label="申请人">{{ detailRequest.applicantName || userText(detailRequest.applicantId) }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag :type="statusTag(detailRequest.status)">{{ statusText(detailRequest.status) }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="申请类型">{{ typeText(detailRequest.requestType) }}</el-descriptions-item>
          <el-descriptions-item label="具体类别">{{ optionText(detailRequest) }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDateTime(detailRequest.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatDateTime(detailRequest.endTime) }}</el-descriptions-item>
          <el-descriptions-item label="时长">{{ durationText(detailRequest) }}</el-descriptions-item>
          <el-descriptions-item label="当前审批人">{{ detailRequest.currentApproverName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="申请原因" :span="2">{{ detailRequest.reason }}</el-descriptions-item>
        </el-descriptions>
        <h3 class="timeline-title">审批时间线</h3>
        <el-timeline v-if="detailTimeline.length">
          <el-timeline-item
            v-for="item in detailTimeline"
            :key="item.id"
            :timestamp="formatDateTime(item.operatedAt)"
            :type="actionTag(item.action)"
          >
            <strong>{{ actionText(item.action) }}</strong>
            <p>{{ item.operatorName || userText(item.operatorId) }} · {{ item.comment || '无补充说明' }}</p>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无流转记录" :image-size="72" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Connection, DocumentAdd, DocumentChecked, Refresh, RefreshLeft, Search, Select, UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import {
  listDoneFlowTasks,
  getFlowRequest,
  listMyFlowRequests,
  listTodoFlowTasks,
  reviewFlowTask,
  rebuildFlowSearchIndex,
  searchFlowRequests,
  submitLeaveRequest,
  submitOvertimeRequest,
  withdrawFlowRequest
} from '../api/flows'

const auth = useAuthStore()
const activeTab = ref('mine')
const loading = ref(false)
const submitting = ref(false)
const reviewing = ref(false)
const searching = ref(false)
const reindexing = ref(false)
const myRequests = ref([])
const todoTasks = ref([])
const doneTasks = ref([])
const createVisible = ref(false)
const reviewVisible = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailRequest = ref(null)
const detailTimeline = ref([])
const createFormRef = ref()
const reviewTarget = ref(null)
const searchResults = ref([])
const searchTotal = ref(0)

const isReviewer = computed(() => auth.hasPermission('flow:task:approve'))
const isAdmin = computed(() => auth.hasPermission('system:admin'))
const myPendingCount = computed(() => myRequests.value.filter((item) => item.status === 'PENDING').length)
const myDoneCount = computed(() => myRequests.value.filter((item) => item.status !== 'PENDING').length)

const createForm = reactive({
  type: 'LEAVE',
  leaveType: 'PERSONAL',
  overtimeCompensation: 'COMPENSATORY',
  startTime: '',
  endTime: '',
  reason: ''
})
const reviewForm = reactive({ decision: 'APPROVE', comment: '' })
const searchForm = reactive({ keyword: '', requestType: '', status: '', createdRange: [] })

const validateTimeRange = (_rule, _value, callback) => {
  if (createForm.startTime && createForm.endTime && new Date(createForm.endTime) <= new Date(createForm.startTime)) {
    callback(new Error('结束时间必须晚于开始时间'))
  } else callback()
}

const createRules = {
  type: [{ required: true, message: '请选择申请类型', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' },
    { validator: validateTimeRange, trigger: 'change' }
  ],
  leaveType: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
  overtimeCompensation: [{ required: true, message: '请选择加班补偿方式', trigger: 'change' }],
  reason: [
    { required: true, message: '请输入申请原因', trigger: 'blur' },
    { max: 500, message: '申请原因不能超过 500 个字符', trigger: 'blur' }
  ]
}

async function loadData() {
  loading.value = true
  try {
    const requests = [listMyFlowRequests()]
    if (isReviewer.value) requests.push(listTodoFlowTasks(), listDoneFlowTasks())
    const [mine, todo = [], done = []] = await Promise.all(requests)
    myRequests.value = Array.isArray(mine) ? mine : []
    todoTasks.value = Array.isArray(todo) ? todo : []
    doneTasks.value = Array.isArray(done) ? done : []
  } catch (error) {
    ElMessage.error(error.message || '审批数据加载失败')
  } finally {
    loading.value = false
  }
}

async function searchFlows() {
  searching.value = true
  try {
    const range = searchForm.createdRange || []
    const page = await searchFlowRequests({
      keyword: searchForm.keyword.trim(),
      requestType: searchForm.requestType,
      status: searchForm.status,
      createdFrom: range[0] instanceof Date ? localDateTime(range[0]) : undefined,
      createdTo: range[1] instanceof Date ? localDateTime(range[1]) : undefined,
      page: 1,
      size: 100
    })
    searchResults.value = page?.records || []
    searchTotal.value = Number(page?.total || 0)
  } catch (error) {
    searchResults.value = []
    searchTotal.value = 0
    ElMessage.error(error.message || '审批全文检索失败')
  } finally {
    searching.value = false
  }
}

function localDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function resetFlowSearch() {
  Object.assign(searchForm, { keyword: '', requestType: '', status: '', createdRange: [] })
  searchResults.value = []
  searchTotal.value = 0
}

async function rebuildFlowIndex() {
  reindexing.value = true
  try {
    const result = await rebuildFlowSearchIndex()
    ElMessage.success(`索引重建完成，共写入 ${result?.indexedCount || 0} 条审批`)
    await searchFlows()
  } catch (error) {
    ElMessage.error(error.message || '审批索引重建失败')
  } finally {
    reindexing.value = false
  }
}

function highlightHtml(highlighted, fallback) {
  return String(highlighted || fallback || '').replaceAll('[[[/H]]][[[H]]]', '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
    .replaceAll('[[[H]]]', '<mark class="search-highlight">')
    .replaceAll('[[[/H]]]', '</mark>')
}

function openCreateDialog() {
  Object.assign(createForm, {
    type: 'LEAVE',
    leaveType: 'PERSONAL',
    overtimeCompensation: 'COMPENSATORY',
    startTime: '',
    endTime: '',
    reason: ''
  })
  createVisible.value = true
}

async function submitRequest() {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const payload = {
      startTime: createForm.startTime,
      endTime: createForm.endTime,
      reason: createForm.reason.trim(),
      leaveType: createForm.type === 'LEAVE' ? createForm.leaveType : null,
      overtimeCompensation: createForm.type === 'OVERTIME' ? createForm.overtimeCompensation : null
    }
    if (createForm.type === 'LEAVE') await submitLeaveRequest(payload)
    else await submitOvertimeRequest(payload)
    createVisible.value = false
    ElMessage.success('申请已提交')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

function openReviewDialog(row, decision) {
  reviewTarget.value = row
  reviewForm.decision = decision
  reviewForm.comment = decision === 'APPROVE' ? '同意' : ''
  reviewVisible.value = true
}

async function submitReview() {
  if (!reviewTarget.value) return
  if (reviewForm.decision === 'REJECT' && !reviewForm.comment.trim()) {
    ElMessage.warning('驳回时必须填写审批意见')
    return
  }
  reviewing.value = true
  try {
    await reviewFlowTask(reviewTarget.value.id, {
      decision: reviewForm.decision,
      comment: reviewForm.comment.trim() || null
    })
    reviewVisible.value = false
    ElMessage.success(reviewForm.decision === 'APPROVE' ? '审批已通过' : '申请已驳回')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '审批失败')
  } finally {
    reviewing.value = false
  }
}

function typeText(value) {
  return value === 'OVERTIME' ? '加班申请' : '请假申请'
}

function statusText(value) {
  return { PENDING: '待审批', APPROVED: '已通过', REJECTED: '已驳回', WITHDRAWN: '已撤回' }[value] || value || '未知'
}

function statusTag(value) {
  return { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger', WITHDRAWN: 'info' }[value] || 'info'
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value).replace('T', ' ') : date.toLocaleString('zh-CN', { hour12: false })
}

function durationText(row) {
  if (Number.isFinite(Number(row.durationMinutes)) && Number(row.durationMinutes) > 0) {
    const minutes = Number(row.durationMinutes)
    if (minutes % 1440 === 0) return `${minutes / 1440} 天`
    if (minutes % 60 === 0) return `${minutes / 60} 小时`
    return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`
  }
  const start = new Date(row.startTime)
  const end = new Date(row.endTime)
  const hours = (end - start) / 3600000
  if (!Number.isFinite(hours) || hours <= 0) return '—'
  if (hours >= 24 && Number.isInteger(hours / 24)) return `${hours / 24} 天`
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小时`
}

function userText(id) {
  return id ? `用户 ${id}` : '—'
}

async function openDetail(row) {
  detailVisible.value = true
  detailLoading.value = true
  detailRequest.value = row
  detailTimeline.value = []
  try {
    const detail = await getFlowRequest(row.id)
    detailRequest.value = detail?.request || row
    detailTimeline.value = Array.isArray(detail?.timeline) ? detail.timeline : []
  } catch (error) {
    ElMessage.error(error.message || '申请详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

async function withdrawRequest(row) {
  try {
    await ElMessageBox.confirm('撤回后该申请将不再进入审批，是否继续？', '撤回申请', {
      type: 'warning',
      confirmButtonText: '确认撤回',
      cancelButtonText: '取消'
    })
    await withdrawFlowRequest(row.id)
    ElMessage.success('申请已撤回')
    await loadData()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '撤回失败')
  }
}

function optionText(row) {
  const leaveTypes = { PERSONAL: '事假', SICK: '病假', ANNUAL: '年假', COMPENSATORY: '调休' }
  const overtimeTypes = { PAY: '加班费', COMPENSATORY: '调休' }
  return row.requestType === 'LEAVE'
    ? (leaveTypes[row.leaveType] || '—')
    : (overtimeTypes[row.overtimeCompensation] || '—')
}

function actionText(action) {
  return { SUBMIT: '提交申请', APPROVE: '审批通过', REJECT: '审批驳回', WITHDRAW: '申请撤回' }[action] || action
}

function actionTag(action) {
  return { SUBMIT: 'primary', APPROVE: 'success', REJECT: 'danger', WITHDRAW: 'warning' }[action] || 'info'
}

onMounted(loadData)
</script>

<style scoped>
.page-actions { display: flex; gap: 10px; }
.approval-overview { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.overview-card { position: relative; display: flex; min-height: 142px; align-items: center; gap: 18px; overflow: hidden; padding: 24px 26px; border: 1px solid #e3e9f5; border-radius: 22px; background: linear-gradient(135deg, #f5f7ff, #eef3ff); color: var(--text); cursor: pointer; text-align: left; box-shadow: 0 12px 30px rgba(67, 83, 140, .08); transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease; }
.overview-card::after { position: absolute; right: -30px; bottom: -58px; width: 150px; height: 150px; border: 22px solid rgba(98, 112, 232, .07); border-radius: 50%; content: ''; }
.overview-card.mine { border-color: #d9eee7; background: linear-gradient(135deg, #f3fbf8, #edf9f5); }
.overview-card.mine::after { border-color: rgba(28, 174, 125, .07); }
.overview-card:hover { border-color: #c8d3f5; box-shadow: 0 18px 36px rgba(67, 83, 140, .13); transform: translateY(-3px); }
.overview-icon { position: relative; z-index: 1; display: grid; width: 62px; height: 62px; flex: 0 0 62px; place-items: center; border-radius: 19px; background: linear-gradient(135deg, #6d79eb, #5261dc); box-shadow: 0 12px 24px rgba(82, 97, 220, .22); color: #fff; }
.overview-card.mine .overview-icon { background: linear-gradient(135deg, #40bf93, #20a776); box-shadow: 0 12px 24px rgba(32, 167, 118, .2); }
.overview-icon .el-icon { font-size: 29px; }
.overview-copy { position: relative; z-index: 1; min-width: 0; }
.overview-copy small, .overview-copy strong, .overview-copy em { display: block; }
.overview-copy small { color: #65718a; font-size: 14px; font-weight: 700; }
.overview-copy strong { margin: 5px 0 8px; color: #14233a; font-size: 36px; line-height: 1; }
.overview-copy em { color: #7b879c; font-size: 12px; font-style: normal; }
.overview-action { position: absolute; z-index: 1; right: 24px; top: 22px; display: flex; align-items: center; gap: 3px; color: #6572dc; font-size: 12px; font-weight: 700; }
.overview-card.mine .overview-action { color: #1c9b70; }
.time-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.auto-approver-tip { display: flex; align-items: flex-start; gap: 12px; margin: 2px 0 18px; padding: 14px 16px; border: 1px solid #dce5fb; border-radius: 12px; background: #f4f7ff; color: #5368aa; }
.auto-approver-tip > .el-icon { margin-top: 2px; font-size: 21px; }
.auto-approver-tip div { display: grid; gap: 3px; }
.auto-approver-tip strong { color: #293d78; font-size: 14px; }
.auto-approver-tip span { color: #7785a8; font-size: 12px; line-height: 1.55; }
.timeline-title { margin: 24px 0 18px; color: var(--text); font-size: 16px; }
:deep(.el-timeline-item__content p) { margin: 5px 0 0; color: var(--muted); line-height: 1.5; }
.review-summary { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; padding: 14px 16px; border-radius: 10px; background: var(--soft-bg, #f5f7fa); color: var(--text); }
.review-summary span { color: var(--muted); line-height: 1.6; }
.flow-search-box { display: grid; gap: 12px; margin-bottom: 16px; padding: 16px; border-radius: 14px; background: #f6f7fc; }
.flow-search-filters { display: grid; grid-template-columns: minmax(250px, 1fr) 140px 140px minmax(300px, .8fr); gap: 10px; }
.flow-search-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.flow-search-actions span { margin-left: auto; color: var(--muted); font-size: 12px; }
.search-content { line-height: 1.6; }
:deep(.search-highlight) { padding: 0 2px; border-radius: 3px; background: #fff0a8; color: #b45309; font-style: normal; }
@media (max-width: 1180px) { .flow-search-filters { grid-template-columns: 1fr 140px 140px; } .flow-search-filters .el-date-editor { grid-column: 1 / -1; width: 100%; } }
@media (max-width: 760px) {
  .approval-overview { grid-template-columns: 1fr; }
  .overview-card { min-height: 130px; padding: 20px; }
  .time-grid { grid-template-columns: 1fr; gap: 0; }
  .page-actions { width: 100%; }
  .flow-search-filters { grid-template-columns: 1fr; }
  .flow-search-filters .el-date-editor { grid-column: auto; }
  .flow-search-actions span { width: 100%; margin-left: 0; }
}
</style>
