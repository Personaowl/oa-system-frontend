<template>
  <div class="login-layout">
    <section class="login-showcase">
      <header class="login-brand">
        <div class="login-brand-mark">
          <el-icon :size="22"><OfficeBuilding /></el-icon>
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

      <footer class="login-showcase-foot">
        <span><i></i>服务健康度 99.98%</span>
        <span>Enterprise OA Platform</span>
      </footer>
    </section>

    <section class="login-form-section">
      <div class="login-form-shell">
        <div class="login-form-header">
          <span class="login-kicker">WORKSPACE ACCESS</span>
          <h2>登录工作台</h2>
          <p>使用企业账号继续办公。</p>
        </div>

        <div class="demo-account-section">
          <div class="demo-account-label">快速选择角色</div>
          <el-radio-group v-model="selectedDemo" class="demo-account-picker" @change="applyDemo">
            <el-radio-button v-for="item in demoRoles" :key="item.username" :label="item.username">
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
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

        <div class="login-form-footnote">
          <el-icon><CircleCheckFilled /></el-icon>
          <span>本地演示环境，数据仅保存在当前浏览器。</span>
        </div>
      </div>
    </section>
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
  CircleCheckFilled,
  DocumentChecked,
  Lock,
  OfficeBuilding,
  User
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const formRef = ref()
const loading = ref(false)
const selectedDemo = ref('admin')
const form = reactive({ username: 'admin', password: '123456' })
const demoRoles = [
  { username: 'admin', label: '管理员' },
  { username: 'hr', label: 'HR 人事' },
  { username: 'manager', label: '部门主管' },
  { username: 'employee', label: '普通员工' }
]
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const dateLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date()))

function applyDemo(username) {
  const account = auth.demoAccounts.find((item) => item.username === username)
  if (!account) return
  form.username = account.username
  form.password = account.password
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    auth.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.replace('/dashboard')
  } catch (err) {
    ElMessage.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>
