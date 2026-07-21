<template>
  <div class="content-grid">
    <div class="page-head">
      <div>
        <h1 class="page-title">系统总览</h1>
        <p class="page-subtitle">聚合人事、考勤、审批、公告的核心指标，适合作为答辩演示首页。</p>
      </div>
      <div class="tool-row">
        <el-tag effect="plain" type="success">JWT 无状态</el-tag>
        <el-tag effect="plain" type="warning">Nacos 配置</el-tag>
        <el-tag effect="plain" type="info">Vue3 + Element Plus</el-tag>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard title="部门数量" :value="stats.departments" subtitle="组织架构已录入" :icon="OfficeBuilding" color="var(--primary)" />
      <StatCard title="员工总数" :value="stats.employees" subtitle="含主管、HR、员工" :icon="User" color="var(--primary-2)" />
      <StatCard title="待审批单" :value="stats.onLeave" subtitle="请假 / 加班待处理" :icon="Document" color="var(--accent)" />
      <StatCard title="今日打卡" :value="stats.punchToday" subtitle="今天的考勤记录" :icon="Clock" color="var(--success)" />
    </div>

    <div class="two-col">
      <ChartPanel :title="'近七天审批趋势'" subtitle="查看审批流转数量变化" :option="approvalOption" />
      <div class="panel section">
        <SectionTitle title="系统摘要" subtitle="适合讲解项目时快速过一遍功能模块。">
          <template #extra>
            <el-tag effect="plain">运行中</el-tag>
          </template>
        </SectionTitle>

        <div class="content-grid" style="gap: 12px">
          <div class="panel-soft" style="padding: 14px">
            <div class="muted" style="font-size: 13px">当前用户</div>
            <div style="margin-top: 8px; font-weight: 600">{{ auth.state.profile?.name }} / {{ auth.state.profile?.role }}</div>
          </div>
          <div class="panel-soft" style="padding: 14px">
            <div class="muted" style="font-size: 13px">今日异常考勤</div>
            <div style="margin-top: 8px; font-weight: 600">{{ stats.lateCount }} 条迟到记录</div>
          </div>
          <div class="panel-soft" style="padding: 14px">
            <div class="muted" style="font-size: 13px">公告状态</div>
            <div style="margin-top: 8px; font-weight: 600">{{ stats.noticeCount }} 条已发布通知</div>
          </div>
        </div>
      </div>
    </div>

    <div class="two-col">
      <ChartPanel :title="'部门人员分布'" subtitle="组织结构概览" :option="deptOption" />
      <div class="panel section">
        <SectionTitle title="快捷入口" subtitle="常用操作一眼可见，演示也更顺手。" />
        <div class="tool-row">
          <el-button type="primary" :icon="Calendar" @click="$router.push('/attendance')">考勤打卡</el-button>
          <el-button :icon="Document" @click="$router.push('/approval')">提交审批</el-button>
          <el-button :icon="Bell" @click="$router.push('/notice')">发布公告</el-button>
          <el-button :icon="TrendCharts" @click="$router.push('/board')">查看看板</el-button>
        </div>
        <div style="margin-top: 18px" class="panel-soft">
          <el-table :data="attendanceToday" height="220">
            <el-table-column prop="time" label="时间" width="170" />
            <el-table-column prop="employee" label="员工" width="110" />
            <el-table-column prop="type" label="类型" width="110" />
            <el-table-column prop="result" label="结果" width="100">
              <template #default="{ row }">
                <span class="status-pill" :class="pillClass(row.result)">{{ row.result }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="note" label="备注" />
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { OfficeBuilding, User, Document, Clock, Calendar, Bell, TrendCharts } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { useOaStore } from '../stores/oa'
import StatCard from '../components/StatCard.vue'
import SectionTitle from '../components/SectionTitle.vue'
import ChartPanel from '../components/ChartPanel.vue'

const auth = useAuthStore()
const oa = useOaStore()
const stats = oa.stats
const attendanceToday = oa.attendanceToday

const deptOption = computed(() => ({
  tooltip: { trigger: 'item' },
  grid: { left: 30, right: 18, top: 24, bottom: 20, containLabel: true },
  xAxis: { type: 'category', data: oa.state.departments.map((item) => item.name), axisLabel: { interval: 0, rotate: 18 } },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'bar',
      data: oa.state.departments.map((item) => item.people),
      barWidth: 28,
      itemStyle: { borderRadius: [8, 8, 0, 0], color: '#0f766e' }
    }
  ]
}))

const approvalOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 30, right: 18, top: 24, bottom: 20, containLabel: true },
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'line',
      smooth: true,
      data: [4, 7, 5, 8, 11, 9, 6],
      symbolSize: 8,
      lineStyle: { width: 3, color: '#2563eb' },
      itemStyle: { color: '#2563eb' },
      areaStyle: { color: 'rgba(37, 99, 235, 0.12)' }
    }
  ]
}))

function pillClass(result) {
  if (result === '正常') return 'is-success'
  if (result === '迟到') return 'is-warning'
  return 'is-info'
}
</script>
