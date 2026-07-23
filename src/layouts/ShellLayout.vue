<template>
  <div class="split-layout app-shell">
    <aside class="sidebar">
      <div class="sidebar-motion" aria-hidden="true">
        <span
          v-for="particle in sidebarParticles"
          :key="particle.id"
          class="sidebar-particle"
          :style="particle.style"
        />
        <i class="sidebar-flow sidebar-flow-one" />
        <i class="sidebar-flow sidebar-flow-two" />
      </div>
      <div class="brand">
        <div class="brand-mark">
          <img :src="appIcon" alt="OA 管理系统" />
        </div>
        <div>
          <strong>OA</strong>
          <span>办公管理系统</span>
        </div>
      </div>

      <el-menu
        router
        :default-active="activePath"
        background-color="transparent"
        text-color="#d9e2f2"
        active-text-color="#bfdbfe"
      >
        <template v-for="item in visibleMenuItems" :key="item.path || item.label">
          <el-sub-menu v-if="item.children?.length" :index="item.path || item.label">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
            </template>
            <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
              <el-icon><component :is="child.icon" /></el-icon>
              <span>{{ child.label }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </template>
      </el-menu>

      <el-button class="sidebar-ai-launch" type="primary" :icon="ChatDotRound" @click="openAiAssistant">
        AI 助手
      </el-button>

      <div class="sidebar-clock" aria-live="polite">
        <span>{{ dateLabel }}</span>
        <strong>{{ timeLabel }}</strong>
      </div>

    </aside>

    <section class="main-area">
      <header class="topbar">
        <div class="topbar-left">
          <span class="topbar-kicker">WORKSPACE / OA</span>
          <div class="breadcrumb">
            {{ route.meta.title || '总览' }}
          </div>
        </div>
        <div class="right-tools">
          <el-tag effect="plain" type="success">{{ auth.state.profile?.department }}</el-tag>
          <el-dropdown class="account-trigger" trigger="click" @command="handleAccountCommand">
            <div class="account-summary">
              <el-avatar :size="32" :src="avatarSrc">{{ avatarLabel }}</el-avatar>
              <div class="account-meta">
                <div style="font-size: 13px">{{ auth.state.profile?.name }}</div>
                <div class="muted" style="font-size: 12px">{{ auth.state.profile?.role }}</div>
              </div>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="settings" :icon="EditPen">账户设置</el-dropdown-item>
                <el-dropdown-item divided command="logout" :icon="SwitchButton">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button :icon="SwitchButton" plain @click="handleLogout">退出</el-button>
        </div>
      </header>

      <main class="main-content">
        <router-view v-slot="{ Component, route: viewRoute }">
          <component v-if="Component && !pageError" :is="Component" :key="`${viewRoute.fullPath}-${viewVersion}`" />
          <section v-else class="page-error panel">
            <el-result icon="error" title="页面加载异常" sub-title="请重新加载当前页面。">
              <template #extra>
                <el-button type="primary" :icon="RefreshRight" @click="retryPage">重新加载</el-button>
              </template>
            </el-result>
          </section>
        </router-view>
      </main>
    </section>

    <el-dialog v-model="accountDialogVisible" class="account-dialog" title="账户设置" width="440px" align-center destroy-on-close>
      <el-form ref="accountFormRef" :model="accountForm" :rules="accountRules" label-position="top" @submit.prevent="handleAccountUpdate">
        <el-form-item label="头像">
          <div class="avatar-editor">
            <el-avatar :size="64" :src="avatarDraftSrc">{{ avatarLabel }}</el-avatar>
            <div class="avatar-editor-copy">
              <div class="avatar-editor-actions">
                <el-upload action="#" :auto-upload="false" :show-file-list="false" accept="image/png,image/jpeg,image/webp" :on-change="handleAvatarSelected">
                  <el-button :icon="Upload">上传新头像</el-button>
                </el-upload>
              </div>
              <span>支持 PNG、JPG、WebP，文件不超过 1 MB</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input v-model="accountForm.currentPassword" :prefix-icon="Lock" autocomplete="current-password" show-password type="password" placeholder="修改密码时填写" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="accountForm.newPassword" :prefix-icon="Lock" autocomplete="new-password" show-password type="password" placeholder="6-72 位，不修改请留空" />
        </el-form-item>
        <el-form-item v-if="accountForm.newPassword" label="确认新密码" prop="confirmPassword">
          <el-input v-model="accountForm.confirmPassword" :prefix-icon="Lock" autocomplete="new-password" show-password type="password" placeholder="再次输入新密码" @keyup.enter="handleAccountUpdate" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="accountDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="accountSaving" @click="handleAccountUpdate">保存修改</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="aiDrawerVisible" class="ai-drawer" direction="ltr" size="420px" :with-header="false">
      <section class="ai-chat">
        <header class="ai-chat-header">
          <div class="ai-chat-title">
            <el-icon><MagicStick /></el-icon>
            <div>
              <strong>AI 助手</strong>
              <span>OA 工作支持</span>
            </div>
          </div>
          <div class="ai-header-actions">
            <el-button circle text title="新建会话" :icon="Plus" @click="startNewAiChat" />
            <el-button circle text title="会话历史" :icon="Collection" @click="toggleAiHistory" />
            <el-button circle text :icon="Close" @click="aiDrawerVisible = false" />
          </div>
        </header>

        <el-scrollbar v-if="aiHistoryVisible" class="ai-chat-messages ai-session-list">
          <div class="ai-history-head">
            <strong>会话历史</strong>
            <el-button link type="primary" :loading="aiSessionsLoading" @click="loadAiSessions">刷新</el-button>
          </div>
          <el-empty v-if="!aiSessionsLoading && !aiSessions.length" description="暂无历史会话" :image-size="70" />
          <div v-for="session in aiSessions" :key="session.id" class="ai-session-item" :class="{ active: session.id === aiSessionId }" role="button" tabindex="0" @click="openAiSession(session.id)" @keyup.enter="openAiSession(session.id)">
            <span class="ai-session-item-title">{{ session.sessionTitle || session.latestQuestion || '未命名会话' }}</span>
            <span>{{ session.latestQuestion || '暂未提问' }}</span>
            <div class="ai-session-item-foot">
              <small>{{ session.messageCount || 0 }} 条消息</small>
              <span class="ai-session-item-actions">
                <el-button link type="warning" size="small" @click.stop="archiveAiSession(session.id)">归档</el-button>
                <el-button link type="danger" size="small" @click.stop="removeAiSession(session.id)">删除</el-button>
              </span>
            </div>
          </div>
        </el-scrollbar>

        <el-scrollbar v-else ref="aiMessagesRef" class="ai-chat-messages">
          <div class="ai-domain-row">
            <span>知识范围</span>
            <el-select v-model="aiDomain" size="small" :disabled="aiSending">
              <el-option v-for="domain in aiDomains" :key="domain.value" :label="domain.label" :value="domain.value" />
            </el-select>
          </div>
          <div v-for="(message, index) in aiMessages" :key="`${message.role}-${index}`" class="ai-message" :class="message.role">
            <div class="ai-message-avatar">{{ message.role === 'assistant' ? 'AI' : avatarLabel }}</div>
            <div class="ai-message-content">
              <div class="ai-message-bubble">{{ message.content }}</div>
              <el-collapse v-if="message.citations?.length" class="ai-citations">
                <el-collapse-item :name="`citation-${index}`">
                  <template #title>参考来源（{{ message.citations.length }}）</template>
                  <div v-for="(citation, citationIndex) in message.citations" :key="citationIndex" class="ai-citation-item">
                    <strong>{{ citation.docTitle || '知识文档' }}</strong>
                    <span>{{ citation.snippet }}</span>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
          <div v-if="aiSending" class="ai-message">
            <div class="ai-message-avatar">AI</div>
            <div class="ai-message-bubble ai-answer-loading">正在检索知识库并生成回答…</div>
          </div>
        </el-scrollbar>

        <footer v-if="!aiHistoryVisible" class="ai-chat-compose">
          <div class="ai-suggestions">
            <el-button v-for="suggestion in aiSuggestions" :key="suggestion" plain size="small" @click="askAiSuggestion(suggestion)">
              {{ suggestion }}
            </el-button>
          </div>
          <el-input v-model="aiInput" type="textarea" :rows="3" resize="none" :disabled="aiSending" placeholder="输入问题，例如：如何提交请假申请？" @keyup.ctrl.enter="sendAiMessage" />
          <div class="ai-compose-actions">
            <span>Ctrl + Enter 发送</span>
            <el-button type="primary" :icon="Promotion" :loading="aiSending" :disabled="!aiInput.trim()" @click="sendAiMessage">发送</el-button>
          </div>
        </footer>
      </section>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onErrorCaptured, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  DataLine,
  UserFilled,
  Calendar,
  DocumentChecked,
  Bell,
  TrendCharts,
  FolderOpened,
  ChatLineSquare,
  SwitchButton,
  RefreshRight,
  EditPen,
  Lock,
  Upload,
  ChatDotRound,
  MagicStick,
  Promotion,
  Close,
  Plus,
  Collection
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { archiveChatSession, chatAi, deleteChatSession, getChatSessionDetail, getChatSessionPage } from '../api/ai'
import appIcon from '../../picture/wut-oa-icon.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const activePath = computed(() => route.path)
const pageError = ref(null)
const viewVersion = ref(0)
const accountDialogVisible = ref(false)
const aiDrawerVisible = ref(false)
const aiHistoryVisible = ref(false)
const aiSessionsLoading = ref(false)
const aiSending = ref(false)
const aiSessions = ref([])
const aiSessionId = ref(null)
const aiMessagesRef = ref()
const accountFormRef = ref()
const accountSaving = ref(false)
const accountForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const now = ref(new Date())
const avatarDraft = ref('')
const avatarChanged = ref(false)
const avatarFile = ref(null)
const hasPasswordChange = computed(() => Boolean(accountForm.newPassword))
const isImageAvatar = (value) => typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('blob:'))
const avatarSrc = computed(() => (isImageAvatar(auth.state.profile?.avatar) ? auth.state.profile.avatar : ''))
const avatarDraftSrc = computed(() => (isImageAvatar(avatarDraft.value) ? avatarDraft.value : ''))
const avatarLabel = computed(() => auth.state.profile?.avatar && !isImageAvatar(auth.state.profile.avatar)
  ? auth.state.profile.avatar
  : String(auth.state.profile?.name || 'U').slice(0, 1).toUpperCase())
const aiInput = ref('')
const aiDomain = ref('ALL')
const aiDomains = [
  { value: 'ALL', label: '全部知识库' },
  { value: 'ATTENDANCE', label: '考勤制度' },
  { value: 'FLOW', label: '审批流程' },
  { value: 'HR', label: '人事制度' }
]
const aiSuggestions = ['如何提交请假申请？', '迟到多久算迟到？', '今天的考勤情况']
const aiMessages = ref([
  { role: 'assistant', content: '你好，我是 OA 助手。我会基于已入库的办公制度为你解答。' }
])
const accountRules = {
  currentPassword: [{ validator: (_, value, callback) => (!hasPasswordChange.value || value ? callback() : callback(new Error('请输入当前密码'))), trigger: 'blur' }],
  newPassword: [{ pattern: /^$|^.{6,72}$/, message: '新密码长度为 6-72 位', trigger: 'blur' }],
  confirmPassword: [{ validator: (_, value, callback) => (!accountForm.newPassword || value === accountForm.newPassword ? callback() : callback(new Error('两次输入的新密码不一致'))), trigger: 'blur' }]
}
const dateLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(now.value))
const timeLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now.value))
const clockTimer = window.setInterval(() => {
  now.value = new Date()
}, 1000)
const sidebarParticles = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  style: {
    '--x': ((index * 31 + 9) % 94) + '%',
    '--size': (index % 4 + 2) + 'px',
    '--delay': -(index % 9) * 1.25 + 's',
    '--duration': (8 + (index % 6) * 1.4) + 's',
    '--drift': ((index % 2 === 0 ? 1 : -1) * (10 + index % 5 * 5)) + 'px'
  }
}))
const menuItems = [
  { path: '/dashboard', label: '工作台', icon: DataLine },
  { path: '/org', label: '组织权限', icon: UserFilled, children: [
    { path: '/org/departments', label: '部门管理', icon: Collection, roles: ['超级管理员', 'HR 人事'] },
    { path: '/org/employees', label: '员工管理', icon: UserFilled, roles: ['超级管理员', 'HR 人事', '部门主管'] }
  ] },
  { path: '/attendance', label: '考勤打卡', icon: Calendar },
  { path: '/approval', label: '审批流程', icon: DocumentChecked },
  { path: '/notice', label: '公告通知', icon: Bell },
  { path: '/board', label: '数据看板', icon: TrendCharts, roles: ['超级管理员', 'HR 人事', '部门主管'] },
  { path: '/ai-knowledge', label: '知识文档', icon: FolderOpened, roles: ['超级管理员'] },
  { path: '/ai-logs', label: 'AI 问答日志', icon: ChatLineSquare, roles: ['超级管理员'] }
]
const visibleMenuItems = computed(() => menuItems.map((item) => ({
  ...item,
  children: item.children?.filter((child) => !child.roles || child.roles.includes(auth.role.value))
})).filter((item) => (!item.roles || item.roles.includes(auth.role.value)) && (!item.children || item.children.length)))

watch(
  () => route.fullPath,
  () => {
    pageError.value = null
  }
)

onErrorCaptured((error, instance, info) => {
  console.error('Page render failed:', error, info)
  pageError.value = error
  return false
})

onUnmounted(() => {
  window.clearInterval(clockTimer)
  window.removeEventListener('open-ai-assistant', handleOpenAiEvent)
})

onMounted(() => {
  auth.refreshAvatar().catch(() => {})
  window.addEventListener('open-ai-assistant', handleOpenAiEvent)
})

function handleOpenAiEvent() {
  openAiAssistant()
}

function retryPage() {
  pageError.value = null
  nextTick(() => {
    viewVersion.value += 1
  })
}

function normalizeAiMessage(message) {
  return {
    role: String(message.role || '').toLowerCase() === 'user' ? 'user' : 'assistant',
    content: message.content || '',
    citations: message.citations || []
  }
}

async function scrollAiMessagesToBottom() {
  await nextTick()
  aiMessagesRef.value?.setScrollTop?.(100000)
}

async function openAiAssistant() {
  aiDrawerVisible.value = true
  aiHistoryVisible.value = false
  await loadAiSessions()
  scrollAiMessagesToBottom()
}

async function loadAiSessions() {
  aiSessionsLoading.value = true
  try {
    const page = await getChatSessionPage({ page: 1, size: 30, status: 'ACTIVE' })
    aiSessions.value = page?.list || page?.records || []
  } catch (error) {
    aiSessions.value = []
    ElMessage.error(error.message || '会话历史加载失败')
  } finally {
    aiSessionsLoading.value = false
  }
}

function startNewAiChat() {
  aiHistoryVisible.value = false
  aiSessionId.value = null
  aiMessages.value = [{ role: 'assistant', content: '已新建会话。请告诉我你想了解的办公制度或流程。' }]
  scrollAiMessagesToBottom()
}

async function toggleAiHistory() {
  aiHistoryVisible.value = !aiHistoryVisible.value
  if (aiHistoryVisible.value) await loadAiSessions()
}

async function openAiSession(id) {
  try {
    const detail = await getChatSessionDetail(id)
    aiSessionId.value = detail.id || id
    aiDomain.value = detail.knowledgeDomain || 'ALL'
    aiMessages.value = (detail.messages || []).map(normalizeAiMessage)
    aiHistoryVisible.value = false
    await scrollAiMessagesToBottom()
  } catch (error) {
    ElMessage.error(error.message || '会话详情加载失败')
  }
}

async function archiveAiSession(id) {
  try {
    await ElMessageBox.confirm('归档后可在历史记录中保留，但不会继续显示在活动会话中。', '归档会话', { type: 'warning' })
    await archiveChatSession(id)
    if (aiSessionId.value === id) startNewAiChat()
    ElMessage.success('会话已归档')
    await loadAiSessions()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '归档会话失败')
  }
}

async function removeAiSession(id) {
  try {
    await ElMessageBox.confirm('删除后无法恢复该会话记录。', '删除会话', { type: 'warning' })
    await deleteChatSession(id)
    if (aiSessionId.value === id) startNewAiChat()
    ElMessage.success('会话已删除')
    await loadAiSessions()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '删除会话失败')
  }
}

async function sendAiMessage() {
  const question = aiInput.value.trim()
  if (!question || aiSending.value) return

  aiMessages.value.push({ role: 'user', content: question })
  aiInput.value = ''
  aiSending.value = true
  await scrollAiMessagesToBottom()
  try {
    const response = await chatAi({ question, sessionId: aiSessionId.value || undefined, knowledgeDomain: aiDomain.value, topK: 3, stream: false })
    aiSessionId.value = response.sessionId || aiSessionId.value
    aiMessages.value.push({ role: 'assistant', content: response.answer || '暂未获得回答，请稍后重试。', citations: response.citations || [] })
    await loadAiSessions()
  } catch (error) {
    aiMessages.value.push({ role: 'assistant', content: error.message || 'AI 助手暂时无法回答，请稍后重试。' })
  } finally {
    aiSending.value = false
    await scrollAiMessagesToBottom()
  }
}

function askAiSuggestion(suggestion) {
  aiInput.value = suggestion
  sendAiMessage()
}

function handleAccountCommand(command) {
  if (command === 'logout') {
    handleLogout()
    return
  }
  accountForm.currentPassword = ''
  accountForm.newPassword = ''
  accountForm.confirmPassword = ''
  avatarDraft.value = auth.state.profile?.avatar || ''
  avatarChanged.value = false
  avatarFile.value = null
  accountDialogVisible.value = true
}

function handleAvatarSelected(file) {
  const rawFile = file.raw
  if (!rawFile) return
  if (!rawFile.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  if (rawFile.size > 1024 * 1024) {
    ElMessage.error('头像文件不能超过 1 MB')
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    avatarDraft.value = String(reader.result)
    avatarChanged.value = true
    avatarFile.value = rawFile
  }
  reader.readAsDataURL(rawFile)
}

async function handleAccountUpdate() {
  if (!hasPasswordChange.value && !avatarChanged.value) {
    ElMessage.warning('请选择头像或输入新密码')
    return
  }

  if (hasPasswordChange.value) {
    const valid = await accountFormRef.value?.validate().catch(() => false)
    if (!valid) return
  }

  accountSaving.value = true
  try {
    if (hasPasswordChange.value) {
      await auth.updatePassword(accountForm)
    }
    if (avatarFile.value) {
      await auth.uploadAvatar(avatarFile.value)
    }
    accountDialogVisible.value = false
    ElMessage.success('账户信息已更新')
  } catch (error) {
    ElMessage.error(error.message || '账户更新失败')
  } finally {
    accountSaving.value = false
  }
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>
