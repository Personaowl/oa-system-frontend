<template>
  <div class="split-layout app-shell">
    <aside class="sidebar">
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
        <el-menu-item v-for="item in visibleMenuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

      <el-button class="sidebar-ai-launch" type="primary" :icon="ChatDotRound" @click="aiDrawerVisible = true">
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
                <el-button link type="primary" :disabled="!avatarDraftIsImage" @click="restoreDefaultAvatar">恢复默认</el-button>
              </div>
              <span>支持 PNG、JPG、WebP，文件不超过 1 MB</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="当前用户名">
          <el-input :model-value="auth.state.profile?.username" disabled />
        </el-form-item>
        <el-form-item label="新用户名" prop="username">
          <el-input v-model="accountForm.username" :prefix-icon="UserFilled" autocomplete="username" placeholder="不修改请留空" />
        </el-form-item>
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input v-model="accountForm.currentPassword" :prefix-icon="Lock" autocomplete="current-password" show-password type="password" placeholder="确认身份后保存" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="accountForm.newPassword" :prefix-icon="Lock" autocomplete="new-password" show-password type="password" placeholder="不修改请留空" />
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
          <el-button circle text :icon="Close" @click="aiDrawerVisible = false" />
        </header>

        <el-scrollbar class="ai-chat-messages">
          <div v-for="(message, index) in aiMessages" :key="index" class="ai-message" :class="message.role">
            <div class="ai-message-avatar">{{ message.role === 'assistant' ? 'AI' : avatarLabel }}</div>
            <div class="ai-message-bubble">{{ message.content }}</div>
          </div>
        </el-scrollbar>

        <footer class="ai-chat-compose">
          <div class="ai-suggestions">
            <el-button v-for="suggestion in aiSuggestions" :key="suggestion" plain size="small" @click="askAiSuggestion(suggestion)">
              {{ suggestion }}
            </el-button>
          </div>
          <el-input v-model="aiInput" type="textarea" :rows="3" resize="none" placeholder="输入问题，例如：如何提交请假申请？" @keyup.ctrl.enter="sendAiMessage" />
          <div class="ai-compose-actions">
            <span>Ctrl + Enter 发送</span>
            <el-button type="primary" :icon="Promotion" :disabled="!aiInput.trim()" @click="sendAiMessage">发送</el-button>
          </div>
        </footer>
      </section>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onErrorCaptured, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  DataLine,
  UserFilled,
  Calendar,
  DocumentChecked,
  Bell,
  TrendCharts,
  SwitchButton,
  RefreshRight,
  EditPen,
  Lock,
  Upload,
  ChatDotRound,
  MagicStick,
  Promotion,
  Close
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import appIcon from '../../picture/wut-oa-icon.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const activePath = computed(() => route.path)
const pageError = ref(null)
const viewVersion = ref(0)
const accountDialogVisible = ref(false)
const aiDrawerVisible = ref(false)
const accountFormRef = ref()
const accountSaving = ref(false)
const accountForm = reactive({ username: '', currentPassword: '', newPassword: '', confirmPassword: '' })
const now = ref(new Date())
const avatarDraft = ref('')
const avatarChanged = ref(false)
const hasAccountChanges = computed(() => Boolean(accountForm.username.trim() || accountForm.newPassword))
const isImageAvatar = (value) => typeof value === 'string' && value.startsWith('data:image/')
const avatarSrc = computed(() => (isImageAvatar(auth.state.profile?.avatar) ? auth.state.profile.avatar : ''))
const avatarDraftSrc = computed(() => (isImageAvatar(avatarDraft.value) ? avatarDraft.value : ''))
const avatarLabel = computed(() => auth.state.profile?.avatar && !isImageAvatar(auth.state.profile.avatar)
  ? auth.state.profile.avatar
  : String(auth.state.profile?.name || 'U').slice(0, 1).toUpperCase())
const avatarDraftIsImage = computed(() => isImageAvatar(avatarDraft.value))
const aiInput = ref('')
const aiSuggestions = ['如何提交请假申请？', '查看我的待审批', '今天的考勤情况']
const aiMessages = ref([
  { role: 'assistant', content: '你好，我是 OA 助手。你可以问我审批、考勤、公告或组织相关的问题。' }
])
const accountRules = {
  username: [{ pattern: /^$|^[A-Za-z0-9_]{3,32}$/, message: '用户名需为 3-32 位字母、数字或下划线', trigger: 'blur' }],
  currentPassword: [{ validator: (_, value, callback) => (!hasAccountChanges.value || value ? callback() : callback(new Error('请输入当前密码'))), trigger: 'blur' }],
  newPassword: [{ pattern: /^$|^.{6,72}$/, message: '新密码长度为 6-72 位', trigger: 'blur' }],
  confirmPassword: [{ validator: (_, value, callback) => (!accountForm.newPassword || value === accountForm.newPassword ? callback() : callback(new Error('两次输入的新密码不一致'))), trigger: 'blur' }]
}
const dateLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(now.value))
const timeLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now.value))
const clockTimer = window.setInterval(() => {
  now.value = new Date()
}, 1000)
const menuItems = [
  { path: '/dashboard', label: '总览', icon: DataLine },
  { path: '/org', label: '组织权限', icon: UserFilled, roles: ['超级管理员', 'HR 人事'] },
  { path: '/attendance', label: '考勤打卡', icon: Calendar },
  { path: '/approval', label: '审批流程', icon: DocumentChecked },
  { path: '/notice', label: '公告通知', icon: Bell },
  { path: '/board', label: '数据看板', icon: TrendCharts, roles: ['超级管理员', 'HR 人事', '部门主管'] }
]
const visibleMenuItems = computed(() => menuItems.filter((item) => !item.roles || item.roles.includes(auth.role.value)))

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
})

function retryPage() {
  pageError.value = null
  nextTick(() => {
    viewVersion.value += 1
  })
}

function getAiReply(question) {
  if (question.includes('请假') || question.includes('审批')) {
    return '可以在“审批流程”页面新建申请，填写类型、时长和原因后提交。'
  }
  if (question.includes('考勤') || question.includes('打卡')) {
    return '可以在“考勤打卡”页面查看今日记录，并完成上班或下班打卡。'
  }
  if (question.includes('公告') || question.includes('通知')) {
    return '公告通知页面支持查看已发布通知；具备权限的账号还可以发布新公告。'
  }
  if (question.includes('组织') || question.includes('部门')) {
    return '组织权限页面可以查看部门、员工与角色权限信息。'
  }
  return '这是前端演示助手，目前可协助你了解审批、考勤、公告和组织管理入口。'
}

function sendAiMessage() {
  const question = aiInput.value.trim()
  if (!question) return

  aiMessages.value.push({ role: 'user', content: question })
  aiInput.value = ''
  window.setTimeout(() => {
    aiMessages.value.push({ role: 'assistant', content: getAiReply(question) })
  }, 180)
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
  accountForm.username = ''
  accountForm.currentPassword = ''
  accountForm.newPassword = ''
  accountForm.confirmPassword = ''
  avatarDraft.value = auth.state.profile?.avatar || ''
  avatarChanged.value = false
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
  }
  reader.readAsDataURL(rawFile)
}

function restoreDefaultAvatar() {
  avatarDraft.value = ''
  avatarChanged.value = avatarDraftIsImage.value || isImageAvatar(auth.state.profile?.avatar)
}

async function handleAccountUpdate() {
  if (!hasAccountChanges.value && !avatarChanged.value) {
    ElMessage.warning('请选择头像或输入新的账户信息')
    return
  }

  if (hasAccountChanges.value) {
    const valid = await accountFormRef.value?.validate().catch(() => false)
    if (!valid) return
  }

  accountSaving.value = true
  try {
    if (hasAccountChanges.value) {
      await auth.updateAccount(accountForm)
    }
    if (avatarChanged.value) {
      auth.setAvatar(avatarDraft.value)
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
