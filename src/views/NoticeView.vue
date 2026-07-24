<template>
  <div class="content-grid notice-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">公告通知</h1>
        <p class="page-subtitle">查看已发布公告，重要通知会在这里集中呈现。</p>
      </div>
      <div class="tool-row">
        <el-button :icon="Refresh" :loading="loading" @click="loadNotices">刷新</el-button>
        <el-button v-if="canCreate" type="primary" :icon="Plus" @click="openCreate">新建公告</el-button>
      </div>
    </div>

    <section class="panel notice-search-panel">
      <div class="notice-search-main">
        <el-input v-model="searchForm.keyword" clearable :prefix-icon="Search" placeholder="检索公告标题、摘要和正文" @keyup.enter="searchNotices" />
        <el-select v-if="canManage" v-model="searchForm.status" clearable placeholder="全部状态">
          <el-option label="草稿" value="DRAFT" />
          <el-option label="已发布" value="PUBLISHED" />
          <el-option label="已下线" value="OFFLINE" />
        </el-select>
        <el-select v-model="searchForm.topFlag" clearable placeholder="置顶条件">
          <el-option label="仅置顶" :value="true" />
          <el-option label="非置顶" :value="false" />
        </el-select>
        <el-date-picker v-model="searchForm.publishedRange" type="datetimerange" range-separator="至" start-placeholder="发布起始" end-placeholder="发布结束" />
      </div>
      <div class="notice-search-actions">
        <el-button type="primary" :icon="Search" :loading="loading" @click="searchNotices">全文检索</el-button>
        <el-button :icon="RefreshLeft" @click="resetSearch">重置</el-button>
        <el-button v-if="canUpdate" plain :icon="Connection" :loading="reindexing" @click="rebuildIndex">重建索引</el-button>
      </div>
      <p v-if="searchActive" class="search-mode-tip">正在使用 Elasticsearch 全文检索，命中关键词已高亮显示。</p>
    </section>

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
                  <strong :class="{ 'is-unread': !row.read }" v-html="highlightHtml(row.highlightedTitle, row.title)"></strong>
                  <span v-html="highlightHtml(row.highlightedSummary || row.highlightedContent, row.summary || row.contentSnippet || '暂无摘要')"></span>
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
                  <el-button v-if="canUpdate && row.status === 'DRAFT'" link type="primary" @click="openEdit(row.id)">编辑</el-button>
                  <el-button v-if="canPublish && row.status === 'DRAFT'" link type="success" @click="publish(row.id)">发布</el-button>
                  <el-button v-if="canOffline && row.status === 'PUBLISHED'" link type="warning" @click="offline(row.id)">下线</el-button>
                  <el-button v-if="canDelete && row.status !== 'PUBLISHED'" link type="danger" @click="remove(row.id)">删除</el-button>
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
import { Connection, Plus, Refresh, RefreshLeft, Search } from '@element-plus/icons-vue'
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
  rebuildNoticeSearchIndex,
  searchManagedNotices,
  searchPublicNotices,
  updateNotice
} from '../api/notices'
import SectionTitle from '../components/SectionTitle.vue'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const reindexing = ref(false)
const notices = ref([])
const total = ref(0)
const unreadCount = ref(0)
const editorVisible = ref(false)
const detailVisible = ref(false)
const editingId = ref(null)
const detail = ref(null)
const formRef = ref()
const form = reactive({ title: '', summary: '', content: '', topFlag: false, status: 'DRAFT' })
const searchForm = reactive({ keyword: '', status: '', topFlag: '', publishedRange: [] })
const canManage = computed(() => auth.hasPermission('notice:list'))
const canCreate = computed(() => auth.hasPermission('notice:create'))
const canUpdate = computed(() => auth.hasPermission('notice:update'))
const canDelete = computed(() => auth.hasPermission('notice:delete'))
const canPublish = computed(() => auth.hasPermission('notice:publish'))
const canOffline = computed(() => auth.hasPermission('notice:offline'))
const publishedCount = computed(() => notices.value.filter((item) => item.status === 'PUBLISHED').length)
const topCount = computed(() => notices.value.filter((item) => item.topFlag).length)
const searchActive = computed(() => Boolean(
  searchForm.keyword.trim() || searchForm.status || searchForm.topFlag !== '' || searchForm.publishedRange?.length
))
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
    const params = buildSearchParams()
    const listRequest = searchActive.value
      ? (canManage.value ? searchManagedNotices(params) : searchPublicNotices(params))
      : (canManage.value ? listManagedNotices({ page: 1, size: 100 }) : listPublicNotices({ page: 1, size: 100 }))
    const [page, unread] = await Promise.all([
      listRequest,
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

function buildSearchParams() {
  const range = searchForm.publishedRange || []
  return {
    keyword: searchForm.keyword.trim(),
    status: canManage.value ? searchForm.status : undefined,
    topFlag: searchForm.topFlag,
    publishedFrom: range[0] instanceof Date ? localDateTime(range[0]) : undefined,
    publishedTo: range[1] instanceof Date ? localDateTime(range[1]) : undefined,
    page: 1,
    size: 100
  }
}

function localDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function searchNotices() {
  loadNotices()
}

function resetSearch() {
  searchForm.keyword = ''
  searchForm.status = ''
  searchForm.topFlag = ''
  searchForm.publishedRange = []
  loadNotices()
}

async function rebuildIndex() {
  reindexing.value = true
  try {
    const result = await rebuildNoticeSearchIndex()
    ElMessage.success(`索引重建完成，共写入 ${result?.indexedCount || 0} 条公告`)
    if (searchActive.value) await loadNotices()
  } catch (error) {
    ElMessage.error(error.message || '索引重建失败')
  } finally {
    reindexing.value = false
  }
}

function highlightHtml(highlighted, fallback) {
  const text = String(highlighted || fallback || '').replaceAll('[[[/H]]][[[H]]]', '')
  return text
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
    .replaceAll('[[[H]]]', '<mark class="search-highlight">')
    .replaceAll('[[[/H]]]', '</mark>')
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
    if (row.status === 'PUBLISHED') {
      detail.value = await markNoticeRead(row.id)
    } else {
      detail.value = canManage.value ? await getManagedNotice(row.id) : await getPublicNotice(row.id)
    }
    detailVisible.value = true
    await loadNotices()
  } catch (error) {
    ElMessage.error(error.message || '公告详情加载失败')
  }
}

onMounted(loadNotices)
</script>

<style scoped>
.notice-search-panel { display: grid; gap: 12px; padding: 18px 20px; }
.notice-search-main { display: grid; grid-template-columns: minmax(260px, 1fr) 150px 130px minmax(300px, .8fr); gap: 10px; }
.notice-search-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.search-mode-tip { margin: 0; color: #5965e9; font-size: 12px; }
:deep(.search-highlight) { padding: 0 2px; border-radius: 3px; background: #fff0a8; color: #b45309; font-style: normal; }
.notice-title-cell { display: grid; gap: 4px; min-width: 0; }
.notice-title-cell strong { color: var(--text); cursor: pointer; font-size: 13px; }
.notice-title-cell strong.is-unread { color: #1d4ed8; }
.notice-title-cell span { overflow: hidden; color: var(--muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.notice-actions { display: flex; align-items: center; gap: 2px; }
.notice-metric--primary { border-color: #bcd3ff; background: #f4f8ff; }
.notice-detail-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; color: var(--muted); font-size: 12px; }
.notice-detail-summary { margin: 20px 0 0; color: var(--muted); line-height: 1.7; }
.notice-detail-content { margin-top: 20px; color: var(--text); line-height: 1.8; white-space: pre-wrap; }
@media (max-width: 1180px) { .notice-search-main { grid-template-columns: 1fr 150px 130px; } .notice-search-main .el-date-editor { grid-column: 1 / -1; width: 100%; } }
@media (max-width: 760px) { .notice-search-main { grid-template-columns: 1fr; } .notice-search-main .el-date-editor { grid-column: auto; } }
</style>
