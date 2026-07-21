<template>
  <div class="login-layout">
    <section class="login-showcase">
      <header class="login-brand">
        <div class="login-brand-mark">
          <img :src="appIcon" alt="OA 管理系统" />
        </div>
        <div>
          <span>PERSONA OFFICE</span>
          <strong>OA 办公管理系统</strong>
        </div>
      </header>

      <div class="login-showcase-body">
        <div class="login-intro">
          <div class="login-status"><span></span>办公服务稳定运行</div>
          <h1>OA 办公管理系统</h1>
          <p>让待办、审批和组织事务始终处在清晰的节奏里。</p>
        </div>

        <div class="login-motion-scene" aria-hidden="true">
          <div class="motion-line motion-line-one"></div>
          <div class="motion-line motion-line-two"></div>
          <div class="motion-line motion-line-three"></div>
          <div class="motion-card motion-card-approval">
            <div class="motion-card-icon is-teal"><el-icon><DocumentChecked /></el-icon></div>
            <span>审批</span>
          </div>
          <div class="motion-card motion-card-attendance">
            <div class="motion-card-icon is-amber"><el-icon><Calendar /></el-icon></div>
            <span>考勤</span>
          </div>
          <div class="motion-card motion-card-notice">
            <div class="motion-card-icon is-blue"><el-icon><Bell /></el-icon></div>
            <span>通知</span>
          </div>
          <div class="motion-core">OA</div>
        </div>

        <section class="login-preview" aria-label="OA 工作台预览">
          <div class="login-preview-head">
            <div>
              <span>今日工作</span>
              <strong>{{ dateLabel }}</strong>
            </div>
            <el-tag effect="plain" type="success">在线</el-tag>
          </div>

          <div class="login-preview-stats">
            <div>
              <span>待审批</span>
              <strong>03</strong>
            </div>
            <div>
              <span>已打卡</span>
              <strong>86%</strong>
            </div>
            <div>
              <span>新通知</span>
              <strong>05</strong>
            </div>
          </div>

          <div class="login-preview-list">
            <div class="login-task">
              <div class="login-task-icon is-teal"><el-icon><DocumentChecked /></el-icon></div>
              <div><strong>审批待办</strong><span>3 条申请等待处理</span></div>
              <time>10:30</time>
            </div>
            <div class="login-task">
              <div class="login-task-icon is-amber"><el-icon><Calendar /></el-icon></div>
              <div><strong>考勤汇总</strong><span>研发部异常数据已更新</span></div>
              <time>14:00</time>
            </div>
            <div class="login-task">
              <div class="login-task-icon is-blue"><el-icon><Bell /></el-icon></div>
              <div><strong>公告通知</strong><span>本周联调安排已发布</span></div>
              <time>今天</time>
            </div>
          </div>
        </section>
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
  Calendar,
  DocumentChecked,
  Lock,
  User
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import appIcon from '../../picture/wut-oa-icon.png'

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
