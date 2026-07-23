<template>
  <section class="workspace-page">
    <header class="workspace-hero">
      <div>
        <span class="eyebrow">TEAM KNOWLEDGE</span>
        <h1>部门共享空间</h1>
        <p>在同一个部门空间中创建、维护和沉淀工作文档。</p>
      </div>
      <div class="hero-metrics">
        <div><strong>{{ workspaces.length }}</strong><span>可访问空间</span></div>
        <div><strong>{{ totalDocumentCount }}</strong><span>共享文档</span></div>
        <div><strong>{{ activeWorkspace?.memberCount || 0 }}</strong><span>当前成员</span></div>
      </div>
    </header>

    <div class="workspace-grid" v-loading="loading">
      <aside class="workspace-sidebar">
        <div class="panel-heading">
          <div>
            <strong>部门空间</strong>
            <small>依据部门权限自动开放</small>
          </div>
          <el-button circle plain :icon="Refresh" :loading="loading" @click="refreshAll" />
        </div>

        <div v-if="workspaces.length" class="workspace-list">
          <button
            v-for="space in workspaces"
            :key="space.departmentId"
            class="workspace-item"
            :class="{ active: String(space.departmentId) === String(selectedWorkspaceId) }"
            @click="selectWorkspace(space.departmentId)"
          >
            <span class="workspace-mark">{{ String(space.departmentName || '部').slice(0, 1) }}</span>
            <span class="workspace-copy">
              <strong>{{ space.departmentName }}</strong>
              <small>{{ space.memberCount }} 位成员 · {{ space.documentCount }} 篇文档</small>
            </span>
            <el-tag v-if="space.manageable" size="small" effect="light">可管理</el-tag>
          </button>
        </div>
        <el-empty v-else :image-size="70" description="当前账号还没有部门空间" />
      </aside>

      <section class="document-panel">
        <div class="panel-heading document-heading">
          <div>
            <strong>{{ activeWorkspace?.departmentName || '文档列表' }}</strong>
            <small>最近编辑的文档排在前面</small>
          </div>
          <el-button
            v-if="activeWorkspace?.manageable"
            type="primary"
            :icon="Plus"
            @click="createDocument"
          >
            新建
          </el-button>
        </div>

        <el-input
          v-model="keyword"
          class="document-search"
          clearable
          :prefix-icon="Search"
          placeholder="搜索文档标题"
          @input="scheduleSearch"
          @clear="loadDocuments"
        />

        <div class="document-list" v-loading="documentsLoading">
          <button
            v-for="document in documents"
            :key="document.id"
            class="document-item"
            :class="{ active: String(document.id) === String(selectedDocumentId) }"
            @click="openDocument(document.id)"
          >
            <span class="document-icon"><el-icon><Document /></el-icon></span>
            <span class="document-copy">
              <strong>{{ document.title }}</strong>
              <small>{{ document.updatedByName || '部门成员' }} · {{ formatDate(document.updatedAt) }}</small>
            </span>
          </button>
          <el-empty
            v-if="!documentsLoading && !documents.length"
            :image-size="76"
            :description="activeWorkspace?.manageable ? '还没有文档，点击新建开始沉淀内容' : '该部门还没有共享文档'"
          />
        </div>
      </section>

      <article class="editor-panel">
        <template v-if="currentDocument">
          <div class="editor-topbar">
            <div class="title-field">
              <el-input
                v-model="draftTitle"
                maxlength="200"
                placeholder="请输入文档标题"
                @input="dirty = true"
              />
              <span>
                {{ currentDocument.departmentName }} ·
                {{ dirty ? '有未保存修改' : `已保存 · 版本 ${currentDocument.version}` }}
              </span>
            </div>
            <div class="editor-actions">
              <el-button
                v-if="currentDocument.manageable"
                plain
                type="danger"
                :icon="Delete"
                @click="removeDocument"
              >
                删除
              </el-button>
              <el-button
                type="primary"
                :icon="Check"
                :loading="saving"
                :disabled="!dirty"
                @click="saveDocument"
              >
                保存
              </el-button>
            </div>
          </div>

          <div v-if="editor" class="editor-toolbar">
            <button :class="{ active: editor.isActive('bold') }" title="加粗" @click="editor.chain().focus().toggleBold().run()">B</button>
            <button :class="{ active: editor.isActive('italic') }" title="斜体" @click="editor.chain().focus().toggleItalic().run()"><em>I</em></button>
            <button :class="{ active: editor.isActive('strike') }" title="删除线" @click="editor.chain().focus().toggleStrike().run()"><s>S</s></button>
            <i />
            <button :class="{ active: editor.isActive('heading', { level: 1 }) }" title="一级标题" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">H1</button>
            <button :class="{ active: editor.isActive('heading', { level: 2 }) }" title="二级标题" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
            <button :class="{ active: editor.isActive('bulletList') }" title="无序列表" @click="editor.chain().focus().toggleBulletList().run()">• 列表</button>
            <button :class="{ active: editor.isActive('orderedList') }" title="有序列表" @click="editor.chain().focus().toggleOrderedList().run()">1. 列表</button>
            <button :class="{ active: editor.isActive('blockquote') }" title="引用" @click="editor.chain().focus().toggleBlockquote().run()">引用</button>
            <button :class="{ active: editor.isActive('codeBlock') }" title="代码块" @click="editor.chain().focus().toggleCodeBlock().run()">代码</button>
            <i />
            <button title="撤销" :disabled="!editor.can().chain().focus().undo().run()" @click="editor.chain().focus().undo().run()">撤销</button>
            <button title="重做" :disabled="!editor.can().chain().focus().redo().run()" @click="editor.chain().focus().redo().run()">重做</button>
          </div>

          <div class="editor-canvas">
            <editor-content :editor="editor" />
          </div>

          <footer class="editor-footer">
            <span>创建人：{{ currentDocument.createdByName || '部门成员' }}</span>
            <span>最后编辑：{{ currentDocument.updatedByName || '部门成员' }}，{{ formatDate(currentDocument.updatedAt) }}</span>
          </footer>
        </template>

        <div v-else class="editor-empty">
          <div class="empty-orbit"><el-icon><Reading /></el-icon></div>
          <h2>选择一篇共享文档</h2>
          <p>部门成员可以共同维护内容；系统会检测旧版本保存，避免覆盖他人的新修改。</p>
          <el-button
            v-if="activeWorkspace?.manageable"
            type="primary"
            :icon="Plus"
            @click="createDocument"
          >
            创建第一篇文档
          </el-button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Delete, Document, Plus, Reading, Refresh, Search } from '@element-plus/icons-vue'
import {
  createSharedDocument,
  deleteSharedDocument,
  getSharedDocument,
  listDocumentWorkspaces,
  listSharedDocuments,
  updateSharedDocument
} from '../api/documents'

const loading = ref(false)
const documentsLoading = ref(false)
const saving = ref(false)
const workspaces = ref([])
const documents = ref([])
const selectedWorkspaceId = ref(null)
const selectedDocumentId = ref(null)
const currentDocument = ref(null)
const draftTitle = ref('')
const keyword = ref('')
const dirty = ref(false)
let searchTimer = null

const activeWorkspace = computed(() =>
  workspaces.value.find((space) => String(space.departmentId) === String(selectedWorkspaceId.value))
)
const totalDocumentCount = computed(() =>
  workspaces.value.reduce((total, space) => total + Number(space.documentCount || 0), 0)
)

const editor = useEditor({
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  editable: false,
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder: '在这里开始编写部门文档…' })
  ],
  editorProps: {
    attributes: {
      spellcheck: 'false'
    }
  },
  onUpdate: () => {
    if (currentDocument.value) dirty.value = true
  }
})

function formatDate(value) {
  if (!value) return '暂无时间'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value))
}

async function confirmDiscard() {
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm(
      '当前文档还有未保存的修改，离开后这些修改会丢失。',
      '放弃修改？',
      { type: 'warning', confirmButtonText: '放弃并离开', cancelButtonText: '继续编辑' }
    )
    return true
  } catch {
    return false
  }
}

async function loadWorkspaces() {
  workspaces.value = await listDocumentWorkspaces()
  if (!workspaces.value.some((space) => String(space.departmentId) === String(selectedWorkspaceId.value))) {
    selectedWorkspaceId.value = workspaces.value[0]?.departmentId ?? null
  }
}

async function loadDocuments() {
  if (!selectedWorkspaceId.value) {
    documents.value = []
    return
  }
  documentsLoading.value = true
  try {
    documents.value = await listSharedDocuments({
      departmentId: selectedWorkspaceId.value,
      keyword: keyword.value.trim()
    })
  } finally {
    documentsLoading.value = false
  }
}

async function refreshAll() {
  loading.value = true
  try {
    await loadWorkspaces()
    await loadDocuments()
  } catch (error) {
    ElMessage.error(error.message || '共享空间加载失败')
  } finally {
    loading.value = false
  }
}

async function selectWorkspace(departmentId) {
  if (String(departmentId) === String(selectedWorkspaceId.value)) return
  if (!(await confirmDiscard())) return
  selectedWorkspaceId.value = departmentId
  selectedDocumentId.value = null
  currentDocument.value = null
  draftTitle.value = ''
  dirty.value = false
  editor.value?.setEditable(false)
  editor.value?.commands.clearContent(false)
  keyword.value = ''
  await loadDocuments()
}

async function openDocument(documentId) {
  if (String(documentId) === String(selectedDocumentId.value)) return
  if (!(await confirmDiscard())) return
  try {
    const detail = await getSharedDocument(documentId)
    selectedDocumentId.value = detail.id
    currentDocument.value = detail
    draftTitle.value = detail.title
    editor.value?.commands.setContent(detail.content, { emitUpdate: false })
    editor.value?.setEditable(true)
    dirty.value = false
  } catch (error) {
    ElMessage.error(error.message || '文档读取失败')
  }
}

async function createDocument() {
  if (!activeWorkspace.value?.manageable) return
  try {
    const { value } = await ElMessageBox.prompt(
      `文档将创建在“${activeWorkspace.value.departmentName}”空间中。`,
      '新建共享文档',
      {
        inputPlaceholder: '例如：研发部周会记录',
        inputPattern: /\S+/,
        inputErrorMessage: '请输入文档标题',
        confirmButtonText: '创建',
        cancelButtonText: '取消'
      }
    )
    const created = await createSharedDocument({
      departmentId: selectedWorkspaceId.value,
      title: value.trim()
    })
    await loadWorkspaces()
    await loadDocuments()
    selectedDocumentId.value = null
    await openDocument(created.id)
    ElMessage.success('文档已创建')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '文档创建失败')
    }
  }
}

async function saveDocument() {
  if (!currentDocument.value || !editor.value || !dirty.value) return
  saving.value = true
  try {
    const updated = await updateSharedDocument(currentDocument.value.id, {
      title: draftTitle.value.trim(),
      content: editor.value.getJSON(),
      version: currentDocument.value.version
    })
    currentDocument.value = updated
    draftTitle.value = updated.title
    dirty.value = false
    await loadWorkspaces()
    await loadDocuments()
    ElMessage.success('文档已保存')
  } catch (error) {
    ElMessage.error(error.message || '文档保存失败')
  } finally {
    saving.value = false
  }
}

async function removeDocument() {
  if (!currentDocument.value?.manageable) return
  try {
    await ElMessageBox.confirm(
      `确定删除“${currentDocument.value.title}”吗？`,
      '删除共享文档',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    await deleteSharedDocument(currentDocument.value.id)
    selectedDocumentId.value = null
    currentDocument.value = null
    draftTitle.value = ''
    dirty.value = false
    editor.value?.setEditable(false)
    editor.value?.commands.clearContent(false)
    await loadWorkspaces()
    await loadDocuments()
    ElMessage.success('文档已删除')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '文档删除失败')
    }
  }
}

function scheduleSearch() {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(loadDocuments, 280)
}

function handleBeforeUnload(event) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(async () => confirmDiscard())

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  await refreshAll()
})

onBeforeUnmount(() => {
  window.clearTimeout(searchTimer)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.workspace-page{display:grid;gap:18px;min-height:calc(100vh - 120px);color:#172b3a}
.workspace-hero{display:flex;align-items:center;justify-content:space-between;gap:28px;padding:24px 28px;border:1px solid rgba(132,152,217,.22);border-radius:24px;background:linear-gradient(118deg,#eef4ff 0%,#f8f5ff 48%,#effbf7 100%);box-shadow:0 18px 50px rgba(59,81,126,.09);overflow:hidden;position:relative}
.workspace-hero::after{content:"";position:absolute;width:240px;height:240px;border:36px solid rgba(101,120,229,.07);border-radius:50%;right:25%;top:-145px}
.eyebrow{display:block;color:#6676dd;font-size:11px;font-weight:800;letter-spacing:.16em}.workspace-hero h1{margin:8px 0 5px;font-size:28px}.workspace-hero p{margin:0;color:#748499}
.hero-metrics{display:flex;gap:12px;position:relative;z-index:1}.hero-metrics div{min-width:100px;padding:13px 17px;border:1px solid rgba(255,255,255,.82);border-radius:17px;background:rgba(255,255,255,.68);backdrop-filter:blur(10px)}.hero-metrics strong,.hero-metrics span{display:block}.hero-metrics strong{font-size:22px;color:#4e65d8}.hero-metrics span{margin-top:2px;color:#7b899b;font-size:11px}
.workspace-grid{display:grid;grid-template-columns:250px 310px minmax(460px,1fr);min-height:620px;border:1px solid #e5eaf2;border-radius:22px;background:#fff;box-shadow:0 18px 48px rgba(50,69,100,.08);overflow:hidden}
.workspace-sidebar,.document-panel{display:flex;min-width:0;flex-direction:column;border-right:1px solid #e8edf4;background:#fbfcff}.document-panel{background:#fff}
.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:19px 18px;border-bottom:1px solid #edf1f6}.panel-heading strong,.panel-heading small{display:block}.panel-heading strong{font-size:15px}.panel-heading small{margin-top:4px;color:#8b98a9;font-size:11px}
.workspace-list,.document-list{display:grid;align-content:start;gap:8px;padding:12px;overflow:auto}.workspace-item,.document-item{display:flex;width:100%;align-items:center;gap:11px;padding:12px;border:1px solid transparent;border-radius:14px;background:transparent;color:inherit;text-align:left;cursor:pointer;transition:.18s ease}.workspace-item:hover,.document-item:hover{background:#f3f6fc}.workspace-item.active{border-color:#cfd9ff;background:linear-gradient(135deg,#eef3ff,#f6f2ff);box-shadow:0 8px 22px rgba(78,101,216,.08)}
.workspace-mark{display:grid;width:38px;height:38px;flex:0 0 38px;place-items:center;border-radius:12px;background:linear-gradient(145deg,#647cf2,#8c70e9);color:#fff;font-weight:800;box-shadow:0 7px 16px rgba(103,118,224,.22)}.workspace-copy,.document-copy{min-width:0;flex:1}.workspace-copy strong,.workspace-copy small,.document-copy strong,.document-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.workspace-copy strong,.document-copy strong{font-size:13px}.workspace-copy small,.document-copy small{margin-top:5px;color:#8c98a8;font-size:10px}
.document-heading{padding-bottom:13px}.document-search{padding:13px 13px 5px}.document-list{flex:1}.document-item.active{border-color:#d5dcff;background:#f2f5ff}.document-icon{display:grid;width:36px;height:36px;flex:0 0 36px;place-items:center;border-radius:11px;background:#eef2ff;color:#6475dd;font-size:18px}
.editor-panel{display:flex;min-width:0;flex-direction:column;background:#fff}.editor-topbar{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:15px 20px;border-bottom:1px solid #e8edf4}.title-field{min-width:0;flex:1}.title-field :deep(.el-input__wrapper){padding:0;box-shadow:none!important}.title-field :deep(.el-input__inner){height:32px;color:#1b2f3f;font-size:20px;font-weight:750}.title-field span{display:block;margin-top:3px;color:#94a0af;font-size:10px}.editor-actions{display:flex;gap:8px}
.editor-toolbar{display:flex;align-items:center;gap:5px;padding:9px 18px;border-bottom:1px solid #edf1f5;background:#fafbfe;flex-wrap:wrap}.editor-toolbar button{height:29px;padding:0 9px;border:1px solid transparent;border-radius:7px;background:transparent;color:#536375;font-size:11px;cursor:pointer}.editor-toolbar button:hover{background:#edf1fa}.editor-toolbar button.active{border-color:#cbd5ff;background:#e9eeff;color:#4f65d8}.editor-toolbar button:disabled{cursor:not-allowed;opacity:.35}.editor-toolbar i{width:1px;height:19px;margin:0 3px;background:#dfe5ed}
.editor-canvas{flex:1;overflow:auto;background:linear-gradient(#fff,#fdfdff);padding:28px 9%}.editor-canvas :deep(.tiptap){min-height:450px;outline:none;color:#293b49;font-size:14px;line-height:1.85}.editor-canvas :deep(.tiptap h1){font-size:28px;line-height:1.35}.editor-canvas :deep(.tiptap h2){font-size:21px;line-height:1.45}.editor-canvas :deep(.tiptap blockquote){margin:18px 0;padding:8px 16px;border-left:4px solid #8191ea;background:#f5f7ff;color:#5d6d80}.editor-canvas :deep(.tiptap pre){padding:15px;border-radius:11px;background:#243142;color:#e6edf5;white-space:pre-wrap}.editor-canvas :deep(.tiptap p.is-editor-empty:first-child::before){height:0;float:left;color:#aeb7c4;content:attr(data-placeholder);pointer-events:none}
.editor-footer{display:flex;justify-content:space-between;gap:12px;padding:10px 20px;border-top:1px solid #edf1f5;color:#929dac;font-size:10px;background:#fbfcfe}
.editor-empty{display:grid;flex:1;place-items:center;align-content:center;padding:60px;text-align:center}.empty-orbit{display:grid;width:78px;height:78px;place-items:center;border-radius:28px;background:linear-gradient(145deg,#edf3ff,#f0ebff);color:#6677de;font-size:34px;box-shadow:0 14px 30px rgba(87,104,186,.12)}.editor-empty h2{margin:18px 0 7px}.editor-empty p{max-width:410px;margin:0 0 22px;color:#8290a1;line-height:1.7}
@media(max-width:1280px){.workspace-grid{grid-template-columns:220px 270px minmax(400px,1fr)}.hero-metrics div{min-width:84px}}
@media(max-width:980px){.workspace-hero{align-items:flex-start;flex-direction:column}.workspace-grid{grid-template-columns:220px 1fr}.editor-panel{grid-column:1/-1;min-height:620px;border-top:1px solid #e8edf4}}
</style>
