<template>
  <div class="content-grid notice-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">公告通知</h1>
        <p class="page-subtitle">支持公告发布、查看和通知列表展示。</p>
      </div>
      <el-button v-if="canPublish" type="primary" :icon="Promotion" @click="dialogVisible = true">发布公告</el-button>
    </div>

    <div class="notice-layout">
      <section class="panel section notice-list-panel">
        <SectionTitle title="公告列表" subtitle="按发布时间查看与当前部门相关的站内通知。">
          <template #extra><el-tag effect="plain">{{ visibleNotices.length }} 条</el-tag></template>
        </SectionTitle>
        <div class="notice-timeline-wrap">
          <el-timeline v-if="visibleNotices.length">
            <el-timeline-item v-for="item in visibleNotices" :key="item.id" :timestamp="item.createdAt" placement="top">
              <article class="notice-entry">
                <div class="notice-entry-title">{{ item.title }}</div>
                <div class="notice-entry-meta">
                  <el-tag size="small" effect="plain">{{ item.scope }}</el-tag>
                  <span>{{ item.publisher }} 发布</span>
                </div>
              </article>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无可查看的公告" :image-size="86" />
        </div>
      </section>

      <aside class="panel section notice-overview-panel">
        <SectionTitle title="通知概览" subtitle="掌握当前公告覆盖情况。" />
        <div class="notice-metrics">
          <div class="notice-metric">
            <span>当前可见</span>
            <strong>{{ visibleNotices.length }}</strong>
            <small>与您相关的公告</small>
          </div>
          <div class="notice-metric">
            <span>全员公告</span>
            <strong>{{ companyNotices }}</strong>
            <small>覆盖所有在岗员工</small>
          </div>
        </div>
        <div class="notice-scope-card">
          <span class="notice-scope-label">当前接收范围</span>
          <strong>全员 / {{ auth.state.profile?.department || '当前部门' }}</strong>
          <p>重要公告会同步展示在此处，请及时查看最新安排。</p>
        </div>
        <div v-if="canPublish" class="notice-publisher-tip">您拥有公告发布权限，可面向全员或指定部门发送通知。</div>
      </aside>
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
const companyNotices = computed(() => oa.state.notices.filter((item) => item.scope === '全员').length)
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
