<template>
  <div class="content-grid dashboard-page">
    <section class="dashboard-welcome panel">
      <div>
        <div class="dashboard-welcome-kicker">PERSONAL WORKSPACE</div>
        <h1>你好，{{ auth.state.profile?.name }}</h1>
        <p>今天的组织、考勤与审批动态已经同步到工作台。</p>
      </div>
      <div class="dashboard-health">
        <span>平台状态</span>
        <strong>运行稳定</strong>
        <small>核心服务连接正常</small>
      </div>
    </section>

    <div class="stat-grid">
      <StatCard title="部门数量" :value="stats.departments" subtitle="组织架构已录入" :icon="OfficeBuilding" color="var(--primary)" />
      <StatCard title="员工总数" :value="stats.employees" subtitle="含主管、HR、员工" :icon="User" color="var(--primary-2)" />
      <StatCard title="待审批单" :value="stats.onLeave" subtitle="请假 / 加班待处理" :icon="Document" color="var(--accent)" />
      <StatCard title="今日打卡" :value="stats.punchToday" subtitle="今天的考勤记录" :icon="Clock" color="var(--success)" />
    </div>

    <div class="two-col">
      <ChartPanel title="审批流转趋势" subtitle="近七天单据处理量" :option="approvalOption" />
      <div class="panel section">
        <SectionTitle title="工作摘要" subtitle="当前工作空间的关键状态。">
          <template #extra>
            <el-tag effect="plain">运行中</el-tag>
          </template>
        </SectionTitle>

        <div class="summary-list">
          <div class="summary-row"><span>当前身份</span><strong>{{ auth.state.profile?.role }}</strong></div>
          <div class="summary-row"><span>今日异常考勤</span><strong>{{ stats.lateCount }} 条迟到记录</strong></div>
          <div class="summary-row"><span>已发布公告</span><strong>{{ stats.noticeCount }} 条</strong></div>
        </div>
      </div>
    </div>

    <div class="two-col">
      
      <div class="panel section">
        <SectionTitle title="常用操作" subtitle="高频工作可直接进入对应模块。" />
        <div class="quick-actions">
          <el-button type="primary" :icon="Calendar" @click="$router.push('/attendance')">考勤打卡</el-button>
          <el-button :icon="Document" @click="$router.push('/approval')">提交审批</el-button>
          <el-button :icon="Bell" @click="$router.push('/notice')">公告通知</el-button>
          <el-button :icon="TrendCharts" @click="$router.push('/board')">查看看板</el-button>
        </div>
        <el-table class="compact-table" :data="attendanceToday" height="205">
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
      <ChartPanel title="部门人员分布" subtitle="组织结构概览" :option="deptOption" />
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
      itemStyle: { borderRadius: [8, 8, 0, 0], color: '#2563eb' }
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
