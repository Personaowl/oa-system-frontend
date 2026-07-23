<template>
  <div class="content-grid ai-admin-page">
    <div class="page-head">
      <div><h1 class="page-title">知识文档管理</h1><p class="page-subtitle">维护 AI 问答知识库，审核通过后文档才会参与检索。</p></div>
      <div class="tool-row"><el-button :icon="Refresh" :loading="loading" @click="loadDocs">刷新</el-button><el-button type="primary" :icon="Upload" @click="openUpload">上传文档</el-button></div>
    </div>

    <section class="panel section">
      <SectionTitle title="知识文档" subtitle="支持按关键词、知识域和状态筛选。">
        <template #extra><div class="ai-admin-filters"><el-input v-model="filters.keyword" clearable placeholder="标题 / 文件名" @keyup.enter="loadDocs" /><el-select v-model="filters.docDomain" clearable placeholder="全部知识域"><el-option v-for="item in domains" :key="item.value" :label="item.label" :value="item.value" /></el-select><el-select v-model="filters.status" clearable placeholder="全部状态"><el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" /></el-select><el-button type="primary" @click="loadDocs">查询</el-button></div></template>
      </SectionTitle>
      <el-table v-loading="loading" :data="docs" row-key="id">
        <el-table-column min-width="210" label="文档"><template #default="{ row }"><div class="doc-title"><strong>{{ row.docTitle }}</strong><span>{{ row.fileName || '-' }}</span></div></template></el-table-column>
        <el-table-column width="112" label="知识域"><template #default="{ row }"><el-tag effect="plain">{{ domainLabel(row.docDomain) }}</el-tag></template></el-table-column>
        <el-table-column prop="docVersion" width="90" label="版本" />
        <el-table-column width="96" label="状态"><template #default="{ row }"><el-tag :type="statusType(row.status)" effect="plain">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
        <el-table-column width="112" label="生效日期"><template #default="{ row }">{{ formatDate(row.effectiveDate, false) }}</template></el-table-column>
        <el-table-column width="142" label="创建时间"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
        <el-table-column fixed="right" width="224" label="操作"><template #default="{ row }"><div class="table-actions"><el-button link type="primary" @click="showDetail(row.id)">详情</el-button><el-button link type="primary" @click="openEdit(row.id)">编辑</el-button><el-button v-if="row.status === 'DRAFT'" link type="success" @click="approve(row.id)">审核</el-button><el-dropdown trigger="click"><el-button link>更多</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item @click="reindex(row.id)">重新建索引</el-dropdown-item><el-dropdown-item :disabled="row.status === 'RETIRED'" @click="retire(row.id)">下线文档</el-dropdown-item><el-dropdown-item divided class="danger-menu" @click="remove(row.id)">删除文档</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div></template></el-table-column>
      </el-table>
      <div class="table-pagination"><el-pagination v-model:current-page="page" :page-size="size" layout="total, prev, pager, next" :total="total" @current-change="loadDocs" /></div>
    </section>

    <el-dialog v-model="uploadVisible" title="上传知识文档" width="560px" destroy-on-close><el-form ref="uploadFormRef" :model="uploadForm" :rules="uploadRules" label-position="top"><el-alert class="upload-guide" type="info" :closable="false" show-icon title="推荐上传制度条款、操作说明和常见问答；请勿包含密码、密钥或无权公开的个人信息。" /><el-form-item label="制度文件" prop="file"><el-upload accept=".md,.txt,.pdf,.doc,.docx" :auto-upload="false" :limit="1" :on-change="selectFile" :on-remove="() => { uploadForm.file = null }"><el-button :icon="Upload">选择文件</el-button><template #tip><div class="el-upload__tip">支持 MD、TXT、PDF、DOC、DOCX；推荐使用带清晰章节标题的 UTF-8 Markdown 文件。</div></template></el-upload></el-form-item><el-form-item label="文档标题" prop="docTitle"><el-input v-model="uploadForm.docTitle" /></el-form-item><div class="form-grid"><el-form-item label="知识域" prop="docDomain"><el-select v-model="uploadForm.docDomain"><el-option v-for="item in domains.slice(1)" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item><el-form-item label="版本号" prop="docVersion"><el-input v-model="uploadForm.docVersion" placeholder="如 v1.0" /></el-form-item></div><el-form-item label="生效日期"><el-date-picker v-model="uploadForm.effectiveDate" value-format="YYYY-MM-DD" type="date" style="width: 100%" /></el-form-item><el-form-item label="来源类型" prop="sourceType"><el-input v-model="uploadForm.sourceType" placeholder="如 UPLOAD" /></el-form-item></el-form><template #footer><el-button @click="uploadVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitUpload">上传</el-button></template></el-dialog>

    <el-dialog v-model="editVisible" title="编辑文档信息" width="500px" destroy-on-close><el-form ref="editFormRef" :model="editForm" :rules="editRules" label-position="top"><el-form-item label="文档标题" prop="docTitle"><el-input v-model="editForm.docTitle" /></el-form-item><div class="form-grid"><el-form-item label="知识域" prop="docDomain"><el-select v-model="editForm.docDomain"><el-option v-for="item in domains.slice(1)" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item><el-form-item label="版本号" prop="docVersion"><el-input v-model="editForm.docVersion" /></el-form-item></div><el-form-item label="生效日期"><el-date-picker v-model="editForm.effectiveDate" value-format="YYYY-MM-DD" type="date" style="width: 100%" /></el-form-item></el-form><template #footer><el-button @click="editVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button></template></el-dialog>

    <el-dialog v-model="detailVisible" :title="detail?.docTitle || '文档详情'" width="680px"><el-descriptions v-if="detail" :column="2" border><el-descriptions-item label="知识域">{{ domainLabel(detail.docDomain) }}</el-descriptions-item><el-descriptions-item label="版本">{{ detail.docVersion }}</el-descriptions-item><el-descriptions-item label="状态"><el-tag :type="statusType(detail.status)">{{ statusLabel(detail.status) }}</el-tag></el-descriptions-item><el-descriptions-item label="文件名">{{ detail.fileName || '-' }}</el-descriptions-item><el-descriptions-item label="来源类型">{{ detail.sourceType || '-' }}</el-descriptions-item><el-descriptions-item label="生效日期">{{ formatDate(detail.effectiveDate, false) }}</el-descriptions-item><el-descriptions-item label="创建时间">{{ formatDate(detail.createdAt) }}</el-descriptions-item></el-descriptions><div v-if="detail?.chunks?.length" class="doc-chunks"><h4>已切分内容</h4><div v-for="chunk in detail.chunks" :key="chunk.id" class="doc-chunk"><strong>{{ chunk.chunkNo }}. {{ chunk.chunkTitle || '内容片段' }}</strong><p>{{ chunk.chunkText }}</p></div></div></el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Upload } from '@element-plus/icons-vue'
import { approveKnowledgeDoc, createKnowledgeDoc, deleteKnowledgeDoc, getKnowledgeDocDetail, getKnowledgeDocPage, reindexKnowledgeDoc, retireKnowledgeDoc, updateKnowledgeDoc } from '../api/aiKnowledge'
import SectionTitle from '../components/SectionTitle.vue'

const domains = [{ value: '', label: '全部知识域' }, { value: 'ATTENDANCE', label: '考勤制度' }, { value: 'FLOW', label: '审批流程' }, { value: 'HR', label: '人事制度' }]
const statuses = [{ value: 'DRAFT', label: '待审核' }, { value: 'APPROVED', label: '已入库' }, { value: 'RETIRED', label: '已下线' }]
const loading = ref(false), saving = ref(false), docs = ref([]), total = ref(0), page = ref(1), size = 20
const filters = reactive({ keyword: '', docDomain: '', status: '' })
const uploadVisible = ref(false), editVisible = ref(false), detailVisible = ref(false), detail = ref(null), uploadFormRef = ref(), editFormRef = ref()
const uploadForm = reactive({ file: null, docTitle: '', docDomain: 'ATTENDANCE', docVersion: 'v1.0', effectiveDate: '', sourceType: 'UPLOAD' })
const editForm = reactive({ id: null, docTitle: '', docDomain: '', docVersion: '', effectiveDate: '' })
const uploadRules = { file: [{ required: true, message: '请选择制度文件', trigger: 'change' }], docTitle: [{ required: true, message: '请输入文档标题', trigger: 'blur' }], docDomain: [{ required: true, message: '请选择知识域', trigger: 'change' }], docVersion: [{ required: true, message: '请输入版本号', trigger: 'blur' }], sourceType: [{ required: true, message: '请输入来源类型', trigger: 'blur' }] }
const editRules = { docTitle: uploadRules.docTitle, docDomain: uploadRules.docDomain, docVersion: uploadRules.docVersion }
const domainLabel = (value) => domains.find((item) => item.value === value)?.label || value || '-'
const statusLabel = (value) => ({ DRAFT: '待审核', APPROVED: '已入库', RETIRED: '已下线' })[value] || value || '-'
const statusType = (value) => ({ DRAFT: 'warning', APPROVED: 'success', RETIRED: 'info' })[value] || 'info'
function formatDate(value, withTime = true) { if (!value) return '-'; const date = new Date(String(value).replace(' ', 'T')); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat('zh-CN', withTime ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false } : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) }
async function loadDocs() { loading.value = true; try { const result = await getKnowledgeDocPage({ ...filters, page: page.value, size }); docs.value = result?.list || result?.records || []; total.value = Number(result?.total || 0) } catch (error) { docs.value = []; total.value = 0; ElMessage.error(error.message || '知识文档加载失败') } finally { loading.value = false } }
function openUpload() { Object.assign(uploadForm, { file: null, docTitle: '', docDomain: 'ATTENDANCE', docVersion: 'v1.0', effectiveDate: '', sourceType: 'UPLOAD' }); uploadVisible.value = true }
function selectFile(file) { uploadForm.file = file.raw; if (!uploadForm.docTitle) uploadForm.docTitle = file.name.replace(/\.[^.]+$/, '') }
async function submitUpload() { const valid = await uploadFormRef.value?.validate().catch(() => false); if (!valid) return; saving.value = true; try { const data = new FormData(); Object.entries(uploadForm).forEach(([key, value]) => { if (value) data.append(key, value) }); await createKnowledgeDoc(data); uploadVisible.value = false; ElMessage.success('知识文档已上传，等待审核'); await loadDocs() } catch (error) { ElMessage.error(error.message || '上传失败') } finally { saving.value = false } }
async function showDetail(id) { try { detail.value = await getKnowledgeDocDetail(id); detailVisible.value = true } catch (error) { ElMessage.error(error.message || '文档详情加载失败') } }
async function openEdit(id) { try { const item = await getKnowledgeDocDetail(id); Object.assign(editForm, { id: item.id, docTitle: item.docTitle || '', docDomain: item.docDomain || '', docVersion: item.docVersion || '', effectiveDate: item.effectiveDate || '' }); editVisible.value = true } catch (error) { ElMessage.error(error.message || '文档详情加载失败') } }
async function saveEdit() { const valid = await editFormRef.value?.validate().catch(() => false); if (!valid) return; saving.value = true; try { const { id, ...payload } = editForm; await updateKnowledgeDoc(id, payload); editVisible.value = false; ElMessage.success('文档信息已更新'); await loadDocs() } catch (error) { ElMessage.error(error.message || '保存失败') } finally { saving.value = false } }
async function approve(id) { try { await ElMessageBox.confirm('审核通过后将触发向量入库。', '审核文档', { type: 'warning' }); await approveKnowledgeDoc(id); ElMessage.success('文档已审核，正在入库'); await loadDocs() } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '审核失败') } }
async function reindex(id) { try { await reindexKnowledgeDoc(id); ElMessage.success('已提交重新建索引任务') } catch (error) { ElMessage.error(error.message || '提交任务失败') } }
async function retire(id) { try { await ElMessageBox.confirm('下线后该文档将不再参与 AI 检索。', '下线文档', { type: 'warning' }); await retireKnowledgeDoc(id); ElMessage.success('文档已下线'); await loadDocs() } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '下线失败') } }
async function remove(id) { try { await ElMessageBox.confirm('删除后无法恢复该知识文档。', '删除文档', { type: 'warning' }); await deleteKnowledgeDoc(id); ElMessage.success('文档已删除'); await loadDocs() } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '删除失败') } }
onMounted(loadDocs)
</script>

<style scoped>
.ai-admin-filters { display: flex; flex-wrap: wrap; gap: 8px; }.ai-admin-filters .el-input { width: 170px; }.ai-admin-filters .el-select { width: 124px; }.doc-title { display: grid; gap: 4px; }.doc-title strong { color: var(--text); }.doc-title span { color: var(--muted); font-size: 12px; }.table-actions { display: flex; align-items: center; gap: 5px; }.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }.form-grid .el-select { width: 100%; }.doc-chunks { margin-top: 20px; }.doc-chunks h4 { margin: 0 0 10px; }.doc-chunk { padding: 12px; border-left: 3px solid #bfdbfe; background: #f8fbff; }.doc-chunk + .doc-chunk { margin-top: 8px; }.doc-chunk p { margin: 7px 0 0; color: var(--muted); line-height: 1.65; white-space: pre-wrap; }@media (max-width: 760px) { .ai-admin-filters { width: 100%; }.ai-admin-filters .el-input, .ai-admin-filters .el-select { flex: 1 1 130px; width: auto; }.form-grid { grid-template-columns: 1fr; gap: 0; } }
</style>
