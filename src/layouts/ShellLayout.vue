<template>
  <div class="split-layout app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">
          <el-icon><OfficeBuilding /></el-icon>
        </div>
        <div>
          <strong>OA 办公管理系统</strong>
          <span>Vue3 + Element Plus Demo</span>
        </div>
      </div>

      <div class="sidebar-caption">企业工作空间</div>

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

      <div class="sidebar-footer">
        <span class="sidebar-footer-dot"></span>
        <div>
          <strong>系统运行正常</strong>
          <span>Demo Environment</span>
        </div>
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
        <div class="topbar-date">{{ dateLabel }}</div>
        <div class="right-tools">
          <el-tag effect="plain" type="success">{{ auth.state.profile?.department }}</el-tag>
          <el-avatar :size="32">{{ auth.state.profile?.avatar }}</el-avatar>
          <div>
            <div style="font-size: 13px">{{ auth.state.profile?.name }}</div>
            <div class="muted" style="font-size: 12px">{{ auth.state.profile?.role }}</div>
          </div>
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
  </div>
</template>

<script setup>
import { computed, nextTick, onErrorCaptured, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  OfficeBuilding,
  DataLine,
  UserFilled,
  Calendar,
  DocumentChecked,
  Bell,
  TrendCharts,
  SwitchButton,
  RefreshRight
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const activePath = computed(() => route.path)
const pageError = ref(null)
const viewVersion = ref(0)
const dateLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date()))
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

function retryPage() {
  pageError.value = null
  nextTick(() => {
    viewVersion.value += 1
  })
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>
