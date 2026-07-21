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

      <el-menu
        router
        :default-active="activePath"
        background-color="transparent"
        text-color="#d9e2f2"
        active-text-color="#8df5e7"
      >
        <el-menu-item v-for="item in visibleMenuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <section class="main-area">
      <header class="topbar">
        <div class="breadcrumb">
          {{ route.meta.title || '总览' }}
        </div>
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
        <router-view />
      </main>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  OfficeBuilding,
  DataLine,
  UserFilled,
  Calendar,
  DocumentChecked,
  Bell,
  TrendCharts,
  SwitchButton
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const activePath = computed(() => route.path)
const menuItems = [
  { path: '/dashboard', label: '总览', icon: DataLine },
  { path: '/org', label: '组织权限', icon: UserFilled, roles: ['超级管理员', 'HR 人事'] },
  { path: '/attendance', label: '考勤打卡', icon: Calendar },
  { path: '/approval', label: '审批流程', icon: DocumentChecked },
  { path: '/notice', label: '公告通知', icon: Bell },
  { path: '/board', label: '数据看板', icon: TrendCharts, roles: ['超级管理员', 'HR 人事', '部门主管'] }
]
const visibleMenuItems = computed(() => menuItems.filter((item) => !item.roles || item.roles.includes(auth.role.value)))

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>
