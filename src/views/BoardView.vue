<template>
  <div class="content-grid board-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">数据看板</h1>
        <p class="page-subtitle">如果你想在答辩里展示“大数据可视化”，这一页可以直接往上顶。</p>
      </div>
      <el-tag effect="plain" type="success">自动刷新演示数据</el-tag>
    </div>

    <div class="stat-grid">
      <StatCard title="活跃部门" :value="stats.departments" subtitle="组织结构" :icon="OfficeBuilding" color="var(--primary)" />
      <StatCard title="异常打卡" :value="stats.lateCount" subtitle="迟到 / 早退" :icon="WarningFilled" color="var(--warning)" />
      <StatCard title="审批待办" :value="stats.onLeave" subtitle="待办流程" :icon="Clock" color="var(--accent)" />
      <StatCard title="公告数量" :value="stats.noticeCount" subtitle="通知触达" :icon="Bell" color="var(--primary-2)" />
    </div>

    <div class="two-col">
      <ChartPanel title="考勤趋势" subtitle="近七天打卡与异常走势" :option="attendanceOption" />
      <ChartPanel title="审批占比" subtitle="不同状态单据分布" :option="approvalPieOption" />
    </div>

    <div class="panel section">
      <SectionTitle title="数据明细" subtitle="本地演示数据，后续可换成真实统计接口。" />
      <el-table :data="oa.state.departments" border>
        <el-table-column prop="name" label="部门" />
        <el-table-column prop="manager" label="负责人" width="140" />
        <el-table-column prop="people" label="人数" width="100" />
        <el-table-column label="占比">
          <template #default="{ row }">
            <el-progress :percentage="Math.round((row.people / stats.employees) * 100)" />
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bell, Clock, OfficeBuilding, WarningFilled } from '@element-plus/icons-vue'
import { useOaStore } from '../stores/oa'
import StatCard from '../components/StatCard.vue'
import SectionTitle from '../components/SectionTitle.vue'
import ChartPanel from '../components/ChartPanel.vue'

const oa = useOaStore()
const stats = oa.stats
const pending = oa.approvalPending
const done = oa.approvalDone

const attendanceOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['打卡', '迟到'] },
  grid: { left: 30, right: 20, top: 40, bottom: 20, containLabel: true },
  xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
  yAxis: { type: 'value' },
  series: [
    { name: '打卡', type: 'bar', data: [26, 28, 27, 30, 29, 22, 19], itemStyle: { color: '#2563eb' } },
    { name: '迟到', type: 'line', data: [1, 2, 1, 3, 1, 0, 1], smooth: true, itemStyle: { color: '#d97706' } }
  ]
}))

const approvalPieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { top: 20 },
  series: [
    {
      type: 'pie',
      radius: ['40%', '68%'],
      data: [
        { value: pending.value.length, name: '待审批' },
        { value: done.value.filter((item) => item.status === '已通过').length, name: '已通过' },
        { value: done.value.filter((item) => item.status === '已驳回').length, name: '已驳回' }
      ]
    }
  ]
}))
</script>
