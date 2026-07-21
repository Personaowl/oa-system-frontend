<template>
  <div class="content-grid notice-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">公告通知</h1>
        <p class="page-subtitle">支持公告发布、查看和通知列表展示。</p>
      </div>
      <el-button v-if="canPublish" type="primary" :icon="Promotion" @click="dialogVisible = true">发布公告</el-button>
    </div>

    <div class="two-col">
      <div class="panel section">
        <SectionTitle title="公告列表" subtitle="适合作为答辩演示中的站内消息模块。" />
        <el-timeline>
          <el-timeline-item v-for="item in visibleNotices" :key="item.id" :timestamp="item.createdAt" placement="top">
            <div style="font-weight: 600">{{ item.title }}</div>
            <div class="muted" style="margin-top: 6px; font-size: 13px">
              {{ item.scope }} · {{ item.publisher }}
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>

      <div class="panel section">
        <SectionTitle title="通知概览" subtitle="发布频率和范围一目了然。" />
        <el-descriptions :column="1" border>
          <el-descriptions-item label="可见公告">{{ visibleNotices.length }}</el-descriptions-item>
          <el-descriptions-item label="发布范围">全员 / 指定部门</el-descriptions-item>
          <el-descriptions-item label="通知效果">站内消息 + 页面列表</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="发布公告" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="范围" prop="scope">
          <el-select v-model="form.scope" style="width: 100%">
            <el-option label="全员" value="全员" />
            <el-option label="研发部" value="研发部" />
            <el-option label="人力资源部" value="人力资源部" />
            <el-option label="行政部" value="行政部" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="publish">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Promotion } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { useOaStore } from '../stores/oa'
import SectionTitle from '../components/SectionTitle.vue'

const auth = useAuthStore()
const oa = useOaStore()
const dialogVisible = ref(false)
const formRef = ref()
const form = reactive({ title: 'OA 系统通知', scope: '全员', content: '请各部门按时完成本周工作安排。' })
const canPublish = computed(() => ['超级管理员', 'HR 人事'].includes(auth.role.value))
const visibleNotices = computed(() => oa.state.notices.filter((item) => item.scope === '全员' || item.scope === auth.state.profile?.department))
const rules = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  scope: [{ required: true, message: '请选择发布范围', trigger: 'change' }],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }]
}

async function publish() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  oa.createNotice(form, auth.state.profile)
  dialogVisible.value = false
  ElMessage.success('公告已发布')
}
</script>
