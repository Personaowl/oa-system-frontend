<template>
  <div class="login-layout">
    <section class="login-hero">
      <div>
        <h1>OA 办公管理系统</h1>
        <p>
          这是一个基于 Vue3 和 Element Plus 的前端演示壳子，覆盖登录、组织权限、考勤打卡、审批流转、公告通知和数据看板。
          目前接的是本地演示数据，后面可以很方便地替换成你的 Spring Cloud 接口。
        </p>
      </div>

      <div class="three-col">
        <div class="panel-soft" style="padding: 14px">
          <div style="font-size: 13px; opacity: 0.86">登录账号</div>
          <div style="margin-top: 8px; font-size: 18px; font-weight: 700">admin / hr / manager / employee</div>
        </div>
        <div class="panel-soft" style="padding: 14px">
          <div style="font-size: 13px; opacity: 0.86">默认密码</div>
          <div style="margin-top: 8px; font-size: 18px; font-weight: 700">123456</div>
        </div>
        <div class="panel-soft" style="padding: 14px">
          <div style="font-size: 13px; opacity: 0.86">架构特点</div>
          <div style="margin-top: 8px; font-size: 18px; font-weight: 700">前后端分离</div>
        </div>
      </div>
    </section>

    <section class="login-card-wrap">
      <div class="login-card">
        <h2>欢迎回来</h2>
        <div class="hint">请输入演示账号登录系统。</div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @keyup.enter="handleLogin">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="admin" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" placeholder="123456" show-password type="password" />
          </el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="handleLogin">登录系统</el-button>
        </el-form>

        <div style="margin-top: 18px; font-size: 12px; color: var(--muted); line-height: 1.8">
          可直接使用 `admin / 123456` 进入总览，或切换成 HR、主管、员工账号看不同菜单。
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const formRef = ref()
const loading = ref(false)
const form = reactive({ username: 'admin', password: '123456' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  await formRef.value?.validate()
  loading.value = true
  try {
    auth.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (err) {
    ElMessage.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>
