<template>
  <div class="content-grid notice-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">公告通知</h1>
        <p class="page-subtitle">查看已发布公告，重要通知会在这里集中呈现。</p>
      </div>
      <div class="tool-row">
        <el-button :icon="Refresh" :loading="loading" @click="loadNotices">刷新</el-button>
        <el-button v-if="canManage" type="primary" :icon="Plus" @click="openCreate">新建公告</el-button>
      </div>
    </div>

    <div class="notice-layout">
      <section class="panel section notice-list-panel">
        <SectionTitle title="公告列表" :subtitle="canManage ? '管理端列表，可维护公告全生命周期。' : '仅展示当前账号可见的已发布公告。'">
          <template #extra>
            <el-tag effect="plain" type="info">{{ total }} 条</el-tag>
          </template>
        </SectionTitle>

        <el-skeleton :loading="loading" animated :rows="5">
          <el-empty v-if="!notices.length" description="暂无公告" :image-size="84" />
          <el-table v-else :data="notices" row-key="id" @row-click="showDetail">
            <el-table-column min-width="220" label="公告">
              <template #default="{ row }">
                <div class="notice-title-cell">
                  <el-badge v-if="row.topFlag" value="置顶" type="danger" />
                  <strong :class="{ 'is-unread': !row.read }">{{ row.title }}</strong>
                  <span>{{ row.summary || '暂无摘要' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column v-if="canManage" width="92" label="状态">
              <template #default="{ row }"><el-tag :type="statusType(row.status)" effect="plain">{{ statusLabel(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column width="118" label="发布时间">
              <template #default="{ row }">{{ formatDate(row.publishedAt) }}</template>
            </el-table-column>
            <el-table-column width="72" label="浏览"><template #default="{ row }">{{ row.viewCount || 0 }}</template></el-table-column>
            <el-table-column v-if="canManage" width="174" fixed="right" label="操作">
              <template #default="{ row }">
                <div class="notice-actions" @click.stop>
                  <el-button v-if="row.status === 'DRAFT'" link type="primary" @click="openEdit(row.id)">编辑</el-button>
                  <el-button v-if="row.status === 'DRAFT'" link type="success" @click="publish(row.id)">发布</el-button>
                  <el-button v-if="row.status === 'PUBLISHED'" link type="warning" @click="offline(row.id)">下线</el-button>
                  <el-button v-if="row.status !== 'PUBLISHED'" link type="danger" @click="remove(row.id)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-skeleton>
      </section>

      <section class="panel section notice-overview-panel notice-overview">
        <SectionTitle title="通知概览" subtitle="当前工作空间的公告阅读状态。">
          <template #extra>
            <el-tag effect="plain" type="primary">{{ canManage ? '管理视图' : '员工视图' }}</el-tag>
          </template>
        </SectionTitle>

        <div class="notice-metrics">
          <div class="notice-metric notice-metric--primary">
            <span>未读公告</span>
            <strong>{{ unreadCount }}</strong>
            <small>待处理阅读</small>
          </div>
          <div class="notice-metric">
            <span>已发布</span>
            <strong>{{ publishedCount }}</strong>
            <small>当前可用公告</small>
          </div>
          <div class="notice-metric">
            <span>置顶通知</span>
            <strong>{{ topCount }}</strong>
            <small>优先关注内容</small>
          </div>
          <div class="notice-metric">
            <span>公告总数</span>
            <strong>{{ total }}</strong>
            <small>当前列表统计</small>
          </div>
        </div>

        <div class="notice-scope-card">
          <span class="notice-scope-label">当前查看范围</span>
          <strong>{{ canManage ? '管理端公告' : '员工可见公告' }}</strong>
          <p>{{ canManage ? '可维护公告的发布状态与置顶优先级。' : '打开公告后，阅读状态会自动同步。' }}</p>
        </div>

        <p class="notice-publisher-tip">数据会随公告列表刷新同步更新，帮助你快速确认待阅读事项与重点通知。</p>
      </section>
    </div>

    <el-dialog v-model="editorVisible" :title="editingId ? '编辑公告' : '新建公告'" width="620px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="标题" prop="title"><el-input v-model="form.title" maxlength="200" show-word-limit /></el-form-item>
        <el-form-item label="摘要" prop="summary"><el-input v-model="form.summary" maxlength="500" show-word-limit /></el-form-item>
        <el-form-item label="内容" prop="content"><el-input v-model="form.content" type="textarea" :rows="7" /></el-form-item>
        <el-form-item><el-checkbox v-model="form.topFlag">置顶公告</el-checkbox></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button :loading="saving" @click="saveDraft">保存草稿</el-button>
        <el-button v-if="!editingId" type="primary" :loading="saving" @click="createAndPublish">发布公告</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" class="notice-detail-dialog" :title="detail?.title || '公告详情'" width="640px" destroy-on-close>
      <div v-if="detail" class="notice-detail">
        <div class="notice-detail-meta">
          <el-tag :type="statusType(detail.status)" effect="plain">{{ statusLabel(detail.status) }}</el-tag>
          <span>发布于 {{ formatDate(detail.publishedAt) }}</span>
          <span>浏览 {{ detail.viewCount || 0 }}</span>
        </div>
        <p v-if="detail.summary" class="notice-detail-summary">{{ detail.summary }}</p>
        <div class="notice-detail-content">{{ detail.content }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import {
  createNotice,
  deleteNotice,
  getManagedNotice,
  getPublicNotice,
  getUnreadNoticeCount,
  listManagedNotices,
  listPublicNotices,
  markNoticeRead,
  offlineNotice,
  publishNotice,
  updateNotice
} from '../api/notices'
import SectionTitle from '../components/SectionTitle.vue'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const notices = ref([])
const total = ref(0)
const unreadCount = ref(0)
const editorVisible = ref(false)
const detailVisible = ref(false)
const editingId = ref(null)
const detail = ref(null)
const formRef = ref()
const form = reactive({ title: '', summary: '', content: '', topFlag: false, status: 'DRAFT' })
const canManage = computed(() => ['超级管理员', 'HR 人事'].includes(auth.role.value))
const publishedCount = computed(() => notices.value.filter((item) => item.status === 'PUBLISHED').length)
const topCount = computed(() => notices.value.filter((item) => item.topFlag).length)
const rules = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }]
}

function statusLabel(status) {
  return ({ DRAFT: '草稿', PUBLISHED: '已发布', OFFLINE: '已下线' })[status] || status
}

function statusType(status) {
  return ({ DRAFT: 'info', PUBLISHED: 'success', OFFLINE: 'warning' })[status] || 'info'
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

function resetForm() {
  form.title = ''
  form.summary = ''
  form.content = ''
  form.topFlag = false
  form.status = 'DRAFT'
}

async function loadNotices() {
  loading.value = true
  try {
    const [page, unread] = await Promise.all([
      canManage.value ? listManagedNotices({ page: 1, size: 100 }) : listPublicNotices({ page: 1, size: 100 }),
      getUnreadNoticeCount()
    ])
    notices.value = page?.records || []
    total.value = Number(page?.total || 0)
    unreadCount.value = Number(unread?.unreadCount || 0)
  } catch (error) {
    notices.value = []
    total.value = 0
    ElMessage.error(error.message || '公告加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  resetForm()
  editorVisible.value = true
}

async function openEdit(id) {
  try {
    const item = await getManagedNotice(id)
    editingId.value = id
    form.title = item.title || ''
    form.summary = item.summary || ''
    form.content = item.content || ''
    form.topFlag = Boolean(item.topFlag)
    form.status = item.status || 'DRAFT'
    editorVisible.value = true
  } catch (error) {
    ElMessage.error(error.message || '公告详情加载失败')
  }
}

async function validateForm() {
  return formRef.value?.validate().then(() => true).catch(() => false)
}

function payload(status = form.status) {
  return { title: form.title, summary: form.summary || null, content: form.content, topFlag: form.topFlag, status }
}

async function saveDraft() {
  if (!(await validateForm())) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateNotice(editingId.value, payload())
    } else {
      await createNotice(payload('DRAFT'))
    }
    editorVisible.value = false
    ElMessage.success('草稿已保存')
    await loadNotices()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function createAndPublish() {
  if (!(await validateForm())) return
  saving.value = true
  try {
    const created = await createNotice(payload('DRAFT'))
    await publishNotice(created.id)
    editorVisible.value = false
    ElMessage.success('公告已发布')
    await loadNotices()
  } catch (error) {
    ElMessage.error(error.message || '发布失败')
  } finally {
    saving.value = false
  }
}

async function publish(id) {
  try {
    await publishNotice(id)
    ElMessage.success('公告已发布')
    await loadNotices()
  } catch (error) {
    ElMessage.error(error.message || '发布失败')
  }
}

async function offline(id) {
  try {
    await ElMessageBox.confirm('下线后员工将无法查看该公告。', '确认下线', { type: 'warning' })
    await offlineNotice(id)
    ElMessage.success('公告已下线')
    await loadNotices()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '下线失败')
  }
}

async function remove(id) {
  try {
    await ElMessageBox.confirm('删除后无法恢复。', '确认删除', { type: 'warning' })
    await deleteNotice(id)
    ElMessage.success('公告已删除')
    await loadNotices()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '删除失败')
  }
}

async function showDetail(row) {
  try {
    if (row.status === 'PUBLISHED') await markNoticeRead(row.id)
    detail.value = canManage.value ? await getManagedNotice(row.id) : await getPublicNotice(row.id)
    detailVisible.value = true
    await loadNotices()
  } catch (error) {
    ElMessage.error(error.message || '公告详情加载失败')
  }
}

onMounted(loadNotices)
</script>

<style scoped>
.notice-title-cell { display: grid; gap: 4px; min-width: 0; }
.notice-title-cell strong { color: var(--text); cursor: pointer; font-size: 13px; }
.notice-title-cell strong.is-unread { color: #1d4ed8; }
.notice-title-cell span { overflow: hidden; color: var(--muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.notice-actions { display: flex; align-items: center; gap: 2px; }
.notice-metric--primary { border-color: #bcd3ff; background: #f4f8ff; }
.notice-detail-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; color: var(--muted); font-size: 12px; }
.notice-detail-summary { margin: 20px 0 0; color: var(--muted); line-height: 1.7; }
.notice-detail-content { margin-top: 20px; color: var(--text); line-height: 1.8; white-space: pre-wrap; }
</style>
