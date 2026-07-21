<template>
  <div class="content-grid">
    <div class="page-head">
      <div>
        <h1 class="page-title">考勤打卡</h1>
        <p class="page-subtitle">支持上班、下班打卡，展示当日记录与考勤状态。</p>
      </div>
      <div class="tool-row">
        <el-button type="primary" :icon="Clock" @click="doPunch('上班打卡')">上班打卡</el-button>
        <el-button :icon="Finished" @click="doPunch('下班打卡')">下班打卡</el-button>
      </div>
    </div>

    <div class="three-col">
      <StatCard title="今日记录" :value="attendanceToday.length" subtitle="打卡流水数量" :icon="Calendar" color="var(--primary)" />
      <StatCard title="迟到次数" :value="stats.lateCount" subtitle="历史迟到记录" :icon="WarningFilled" color="var(--warning)" />
      <StatCard title="当前班次" value="标准班" subtitle="9:00 - 18:00" :icon="Timer" color="var(--success)" />
    </div>

    <div class="two-col">
      <div class="panel section">
        <SectionTitle title="今日打卡" subtitle="你的个人打卡操作会出现在这里。">
          <template #extra>
            <el-tag effect="plain" type="success">定位校验通过</el-tag>
          </template>
        </SectionTitle>

        <el-table :data="attendanceToday" border height="360">
          <el-table-column prop="time" label="时间" width="170" />
          <el-table-column prop="employee" label="员工" width="120" />
          <el-table-column prop="department" label="部门" width="120" />
          <el-table-column prop="type" label="类型" width="110" />
          <el-table-column prop="result" label="结果" width="100">
            <template #default="{ row }">
              <span class="status-pill" :class="pillClass(row.result)">{{ row.result }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="note" label="备注" />
        </el-table>
      </div>

      <div class="panel section">
        <SectionTitle title="打卡说明" subtitle="适合演示时快速讲清楚当前功能。" />
        <el-timeline>
          <el-timeline-item timestamp="上班打卡" placement="top">点击按钮后写入本地演示记录。</el-timeline-item>
          <el-timeline-item timestamp="重复拦截" placement="top">同类同日重复操作会给出提示。</el-timeline-item>
          <el-timeline-item timestamp="接后端时" placement="top">这里可以直接替换成 attendance-service 接口。</el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { Calendar, Clock, Finished, Timer, WarningFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { useOaStore } from '../stores/oa'
import SectionTitle from '../components/SectionTitle.vue'
import StatCard from '../components/StatCard.vue'

const auth = useAuthStore()
const oa = useOaStore()
const stats = oa.stats
const attendanceToday = oa.attendanceToday

function doPunch(type) {
  try {
    oa.punch(auth.state.profile, type)
    ElMessage.success(`${type} 成功`)
  } catch (err) {
    ElMessage.warning(err.message)
  }
}

function pillClass(result) {
  if (result === '正常') return 'is-success'
  if (result === '迟到') return 'is-warning'
  return 'is-info'
}
</script>
