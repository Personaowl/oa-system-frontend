<template>
  <div class="login-layout">
    <section class="login-showcase">
      <div class="showcase-backdrop" aria-hidden="true">
        <div class="showcase-grid"></div>
        <div class="showcase-arc showcase-arc-one"></div>
        <div class="showcase-arc showcase-arc-two"></div>
        <span
          v-for="particle in showcaseParticles"
          :key="particle.id"
          class="showcase-particle"
          :style="particle.style"
        ></span>
      </div>

      <header class="login-brand">
        <div class="login-brand-mark">
          <img :src="appIcon" alt="OA 管理系统" />
        </div>
        <div class="login-brand-copy">
          <span>PERSONA OFFICE</span>
          <strong>OA 办公管理系统</strong>
        </div>
      </header>

      <div class="login-showcase-body">
        <div class="login-intro">
          <div class="login-status"><span></span>企业智慧 OA · 协同服务稳定运行</div>
          <h1>
          企业智慧 OA
          <!-- <br /> -->
          <!-- <em>智能办公协同中心</em> -->
        </h1>
          <p>连接组织、流程与知识，让每一次协作都更清晰、更高效。</p>
          <div class="login-intro-meta" aria-hidden="true">
            <span><i></i>统一协同</span>
            <span><i></i>数据驱动</span>
            <span><i></i>AI 办公</span>
          </div>
        </div>

        <div class="showcase-network" aria-label="智慧办公能力网络">
          <svg class="network-connections" viewBox="0 0 720 430" preserveAspectRatio="none" aria-hidden="true">
            <g class="network-lines">
              <line x1="360" y1="208" x2="110" y2="70" />
              <line x1="360" y1="208" x2="360" y2="42" />
              <line x1="360" y1="208" x2="615" y2="76" />
              <line x1="360" y1="208" x2="74" y2="210" />
              <line x1="360" y1="208" x2="646" y2="208" />
              <line x1="360" y1="208" x2="108" y2="354" />
              <line x1="360" y1="208" x2="360" y2="390" />
              <line x1="360" y1="208" x2="614" y2="352" />
            </g>
            <g class="network-flows">
              <circle cx="110" cy="70" r="2.5"><animateMotion path="M 110 70 L 360 208 L 110 70" dur="9s" repeatCount="indefinite" /></circle>
              <circle cx="615" cy="76" r="2.5"><animateMotion path="M 615 76 L 360 208 L 615 76" dur="11s" repeatCount="indefinite" /></circle>
              <circle cx="74" cy="210" r="2.5"><animateMotion path="M 74 210 L 360 208 L 74 210" dur="10s" repeatCount="indefinite" /></circle>
              <circle cx="646" cy="208" r="2.5"><animateMotion path="M 646 208 L 360 208 L 646 208" dur="12s" repeatCount="indefinite" /></circle>
              <circle cx="108" cy="354" r="2.5"><animateMotion path="M 108 354 L 360 208 L 108 354" dur="13s" repeatCount="indefinite" /></circle>
              <circle cx="614" cy="352" r="2.5"><animateMotion path="M 614 352 L 360 208 L 614 352" dur="10.5s" repeatCount="indefinite" /></circle>
            </g>
          </svg>

          <div class="network-halo network-halo-one"></div>
          <div class="network-halo network-halo-two"></div>

          <div class="network-core">
            <div class="network-core-orbit network-core-orbit-one"></div>
            <div class="network-core-orbit network-core-orbit-two"></div>
            <div class="network-core-mark">OA</div>
            <strong>智慧办公</strong>
            <span>协同中枢</span>
          </div>

          <div
            v-for="node in capabilityNodes"
            :key="node.key"
            class="network-node"
            :class="[`network-node-${node.key}`, { 'is-ai': node.key === 'ai' }]"
          >
            <div class="network-node-icon"><el-icon><component :is="node.icon" /></el-icon></div>
            <div class="network-node-copy">
              <strong>{{ node.label }}</strong>
              <span>{{ node.meta }}</span>
            </div>
          </div>
        </div>

        <div class="showcase-footer" aria-hidden="true">
          <span><i></i>智慧办公能力在线</span>
          <span>WORK SMARTER · TOGETHER</span>
        </div>
      </div>
    </section>

    <section class="login-form-section">
      <div class="login-form-shell">
        <div class="login-form-header">
          <span class="login-kicker">WORKSPACE ACCESS</span>
          <h2>登录工作台</h2>
          <p>使用企业账号继续办公。</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleLogin">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" :prefix-icon="User" placeholder="请输入用户名" size="large" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" :prefix-icon="Lock" placeholder="请输入密码" show-password size="large" type="password" />
          </el-form-item>
          <el-button class="login-submit" type="primary" :icon="ArrowRight" :loading="loading" native-type="submit">
            进入工作台
          </el-button>
        </el-form>

        <div class="login-register-action">
          <span>还没有账号？</span>
          <el-button link type="primary" @click="registerVisible = true">注册账号</el-button>
        </div>

      </div>
    </section>

    <el-dialog v-model="registerVisible" class="account-dialog" title="注册账号" width="420px" align-center destroy-on-close>
      <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-position="top" @submit.prevent="handleRegister">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="registerForm.username" :prefix-icon="User" autocomplete="username" placeholder="3-32 位字母、数字或下划线" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="registerForm.password" :prefix-icon="Lock" autocomplete="new-password" show-password type="password" placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="registerForm.confirmPassword" :prefix-icon="Lock" autocomplete="new-password" show-password type="password" placeholder="再次输入密码" @keyup.enter="handleRegister" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="registerVisible = false">取消</el-button>
        <el-button type="primary" :loading="registerLoading" @click="handleRegister">注册并进入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  Bell,
  ChatDotRound,
  Collection,
  DocumentChecked,
  Grid,
  Lock,
  OfficeBuilding,
  Timer,
  TrendCharts,
  User
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import appIcon from '../../picture/wut-oa-icon.png'

const capabilityNodes = [
  { key: 'workbench', label: '工作台', meta: '统一入口', icon: Grid },
  { key: 'organization', label: '组织权限', meta: '灵活协同', icon: OfficeBuilding },
  { key: 'attendance', label: '考勤打卡', meta: '实时同步', icon: Timer },
  { key: 'approval', label: '审批流程', meta: '高效流转', icon: DocumentChecked },
  { key: 'notice', label: '公告通知', meta: '及时触达', icon: Bell },
  { key: 'board', label: '数据看板', meta: '洞察业务', icon: TrendCharts },
  { key: 'knowledge', label: '知识文档', meta: '沉淀共享', icon: Collection },
  { key: 'ai', label: 'AI 助手', meta: '问答日志', icon: ChatDotRound }
]

const showcaseParticles = [
  { id: 1, style: { '--x': '9%', '--y': '17%', '--size': '3px', '--delay': '-2s', '--duration': '12s' } },
  { id: 2, style: { '--x': '20%', '--y': '78%', '--size': '2px', '--delay': '-7s', '--duration': '14s' } },
  { id: 3, style: { '--x': '34%', '--y': '11%', '--size': '2px', '--delay': '-4s', '--duration': '16s' } },
  { id: 4, style: { '--x': '47%', '--y': '90%', '--size': '3px', '--delay': '-10s', '--duration': '15s' } },
  { id: 5, style: { '--x': '64%', '--y': '20%', '--size': '2px', '--delay': '-1s', '--duration': '13s' } },
  { id: 6, style: { '--x': '76%', '--y': '72%', '--size': '3px', '--delay': '-6s', '--duration': '17s' } },
  { id: 7, style: { '--x': '88%', '--y': '35%', '--size': '2px', '--delay': '-9s', '--duration': '11s' } },
  { id: 8, style: { '--x': '93%', '--y': '87%', '--size': '2px', '--delay': '-3s', '--duration': '16s' } },
  { id: 9, style: { '--x': '4%', '--y': '53%', '--size': '2px', '--delay': '-8s', '--duration': '14s' } },
  { id: 10, style: { '--x': '56%', '--y': '47%', '--size': '2px', '--delay': '-5s', '--duration': '18s' } }
]

const router = useRouter()
const auth = useAuthStore()
const formRef = ref()
const registerFormRef = ref()
const loading = ref(false)
const registerLoading = ref(false)
const registerVisible = ref(false)
const form = reactive({ username: 'admin', password: '123456' })
const registerForm = reactive({ username: '', password: '', confirmPassword: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const dateLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date()))
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]{3,32}$/, message: '用户名需为 3-32 位字母、数字或下划线', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 72, message: '密码长度为 6-72 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: (_, value, callback) => (value === registerForm.password ? callback() : callback(new Error('两次输入的密码不一致'))), trigger: 'blur' }
  ]
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await auth.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.replace('/dashboard')
  } catch (err) {
    ElMessage.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  const valid = await registerFormRef.value?.validate().catch(() => false)
  if (!valid) return

  registerLoading.value = true
  try {
    await auth.register(registerForm.username, registerForm.password)
    await auth.login(registerForm.username, registerForm.password)
    registerVisible.value = false
    ElMessage.success('注册成功，欢迎进入工作台')
    router.replace('/dashboard')
  } catch (err) {
    ElMessage.error(err.message || '注册失败')
  } finally {
    registerLoading.value = false
  }
}
</script>
