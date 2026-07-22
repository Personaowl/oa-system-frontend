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

    <div class="three-col">
      <StatCard title="我的待审批" :value="myPendingCount" subtitle="已提交、等待审批" :icon="Clock" color="var(--accent)" />
      <StatCard v-if="isReviewer" title="待我审批" :value="todoTasks.length" subtitle="需要我处理的任务" :icon="DocumentChecked" color="var(--primary)" />
      <StatCard v-else title="已完成" :value="myDoneCount" subtitle="已通过或已驳回" :icon="Select" color="var(--success)" />
      <StatCard title="我的申请" :value="myRequests.length" :subtitle="auth.state.profile?.name || '当前账号'" :icon="UserFilled" color="var(--success)" />
    </div>

    <div class="panel section">
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
        <div class="time-grid">
          <el-form-item label="开始时间" prop="startTime">
            <el-date-picker v-model="createForm.startTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="选择开始时间" style="width: 100%" />
          </el-form-item>
          <el-form-item label="结束时间" prop="endTime">
            <el-date-picker v-model="createForm.endTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="选择结束时间" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="审批人" prop="approverId">
          <el-select v-model="createForm.approverId" filterable placeholder="请选择部门主管或管理员" style="width: 100%" no-data-text="暂无可选审批人">
            <el-option v-for="item in approvers" :key="item.id" :label="approverLabel(item)" :value="String(item.id)" />
          </el-select>
        </el-form-item>
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
        <el-form-item label="审批意见">
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
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, DocumentAdd, DocumentChecked, Refresh, Select, UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import {
  listDoneFlowTasks,
  listFlowApprovers,
  listMyFlowRequests,
  listTodoFlowTasks,
  reviewFlowTask,
  submitLeaveRequest,
  submitOvertimeRequest
} from '../api/flows'
import StatCard from '../components/StatCard.vue'

const auth = useAuthStore()
const activeTab = ref('mine')
const loading = ref(false)
const submitting = ref(false)
const reviewing = ref(false)
const myRequests = ref([])
const todoTasks = ref([])
const doneTasks = ref([])
const approvers = ref([])
const createVisible = ref(false)
const reviewVisible = ref(false)
const createFormRef = ref()
const reviewTarget = ref(null)

const isReviewer = computed(() => auth.hasPermission('flow:task:approve'))
const myPendingCount = computed(() => myRequests.value.filter((item) => item.status === 'PENDING').length)
const myDoneCount = computed(() => myRequests.value.filter((item) => item.status !== 'PENDING').length)

const createForm = reactive({ type: 'LEAVE', startTime: '', endTime: '', reason: '', approverId: '' })
const reviewForm = reactive({ decision: 'APPROVE', comment: '' })

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
  approverId: [{ required: true, message: '请选择审批人', trigger: 'change' }],
  reason: [
    { required: true, message: '请输入申请原因', trigger: 'blur' },
    { max: 500, message: '申请原因不能超过 500 个字符', trigger: 'blur' }
  ]
}

async function loadData() {
  loading.value = true
  try {
    const requests = [listMyFlowRequests(), listFlowApprovers()]
    if (isReviewer.value) requests.push(listTodoFlowTasks(), listDoneFlowTasks())
    const [mine, availableApprovers, todo = [], done = []] = await Promise.all(requests)
    myRequests.value = Array.isArray(mine) ? mine : []
    approvers.value = Array.isArray(availableApprovers) ? availableApprovers : []
    todoTasks.value = Array.isArray(todo) ? todo : []
    doneTasks.value = Array.isArray(done) ? done : []
  } catch (error) {
    ElMessage.error(error.message || '审批数据加载失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  Object.assign(createForm, { type: 'LEAVE', startTime: '', endTime: '', reason: '', approverId: '' })
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
      approverId: createForm.approverId
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
  return { PENDING: '待审批', APPROVED: '已通过', REJECTED: '已驳回' }[value] || value || '未知'
}

function statusTag(value) {
  return { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' }[value] || 'info'
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value).replace('T', ' ') : date.toLocaleString('zh-CN', { hour12: false })
}

function durationText(row) {
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

function approverLabel(item) {
  const account = item.username ? `（${item.username}）` : ''
  const department = item.departmentName ? ` · ${item.departmentName}` : ''
  return `${item.displayName || item.username || userText(item.id)}${account}${department}`
}

onMounted(loadData)
</script>

<style scoped>
.page-actions { display: flex; gap: 10px; }
.time-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.review-summary { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; padding: 14px 16px; border-radius: 10px; background: var(--soft-bg, #f5f7fa); color: var(--text); }
.review-summary span { color: var(--muted); line-height: 1.6; }
@media (max-width: 760px) {
  .time-grid { grid-template-columns: 1fr; gap: 0; }
  .page-actions { width: 100%; }
}
</style>
