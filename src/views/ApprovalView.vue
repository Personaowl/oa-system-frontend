<template>
  <div class="content-grid approval-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">审批流程</h1>
        <p class="page-subtitle">{{ isReviewer ? '请假、加班申请提交与待办审批处理。' : '提交请假或加班申请，并查看自己的审批进度。' }}</p>
      </div>
      <el-button type="primary" :icon="DocumentAdd" @click="dialogVisible = true">新建申请</el-button>
    </div>

    <div class="three-col">
      <StatCard title="待审批" :value="visiblePending.length" :subtitle="isReviewer ? '当前待处理单据' : '我的待处理申请'" :icon="Clock" color="var(--accent)" />
      <StatCard title="已处理" :value="visibleDone.length" :subtitle="isReviewer ? '已审批历史' : '我的已完成申请'" :icon="Select" color="var(--success)" />
      <StatCard title="当前申请人" :value="auth.state.profile?.name" subtitle="当前账号提交记录" :icon="UserFilled" color="var(--primary)" />
    </div>

    <div class="panel section">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="待审批" name="pending">
          <el-table :data="visiblePending" border max-height="480">
            <el-table-column prop="applicant" label="申请人" width="120" />
            <el-table-column prop="type" label="类型" width="120">
              <template #default="{ row }"><el-tag size="small" effect="plain">{{ row.type }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="days" label="时长" width="100" />
            <el-table-column prop="reason" label="原因" />
            <el-table-column prop="approver" label="审批人" width="120" />
            <el-table-column prop="createdAt" label="时间" width="180" />
            <el-table-column v-if="isReviewer" label="操作" width="180">
              <template #default="{ row }">
                <el-button link type="primary" @click="review(row.id, '已通过')">同意</el-button>
                <el-button link type="danger" @click="review(row.id, '已驳回')">驳回</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="已处理" name="done">
          <el-table :data="visibleDone" border max-height="480">
            <el-table-column prop="applicant" label="申请人" width="120" />
            <el-table-column prop="type" label="类型" width="120">
              <template #default="{ row }"><el-tag size="small" effect="plain">{{ row.type }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }"><el-tag size="small" :type="row.status === '已通过' ? 'success' : 'danger'">{{ row.status }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="reviewComment" label="审批意见" />
            <el-table-column prop="reviewedAt" label="处理时间" width="180" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="dialogVisible" title="新建申请" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="申请类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="请假申请" value="请假申请" />
            <el-option label="加班申请" value="加班申请" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请时长" prop="days">
          <el-input v-model="form.days" placeholder="例如：1 天 / 2 小时" />
        </el-form-item>
        <el-form-item label="申请原因" prop="reason">
          <el-input v-model="form.reason" type="textarea" :rows="4" placeholder="说明申请原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, DocumentAdd, Select, UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { useOaStore } from '../stores/oa'
import StatCard from '../components/StatCard.vue'

const auth = useAuthStore()
const oa = useOaStore()
const pending = oa.approvalPending
const done = oa.approvalDone
const activeTab = ref('pending')
const dialogVisible = ref(false)
const formRef = ref()
const form = reactive({ type: '请假申请', days: '1 天', reason: '' })
const reviewerRoles = ['超级管理员', 'HR 人事', '部门主管']
const isReviewer = computed(() => reviewerRoles.includes(auth.role.value))
const visiblePending = computed(() => (isReviewer.value ? pending.value : pending.value.filter((item) => item.applicant === auth.state.profile?.name)))
const visibleDone = computed(() => (isReviewer.value ? done.value : done.value.filter((item) => item.applicant === auth.state.profile?.name)))
const rules = {
  type: [{ required: true, message: '请选择申请类型', trigger: 'change' }],
  days: [{ required: true, message: '请输入申请时长', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入申请原因', trigger: 'blur' }]
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  oa.createApproval(form, auth.state.profile)
  dialogVisible.value = false
  form.type = '请假申请'
  form.days = '1 天'
  form.reason = ''
  ElMessage.success('申请已提交')
}

function review(id, status) {
  oa.reviewApproval(id, status, status === '已通过' ? '审批通过' : '已驳回，请补充说明')
  ElMessage.success('审批已完成')
}
</script>
