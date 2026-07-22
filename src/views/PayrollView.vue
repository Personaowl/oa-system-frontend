<template>
  <div class="content-grid payroll-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">工资管理</h1>
        <p class="page-subtitle">按工资周期核算员工薪酬，跟踪发放状态并留存薪资明细。</p>
      </div>
      <div class="tool-row">
        <el-button :icon="Refresh" @click="resetPayroll">重置本期</el-button>
        <el-button type="primary" :icon="Plus" @click="openEditor()">录入工资</el-button>
      </div>
    </div>

    <div class="payroll-summary">
      <div class="metric-card panel"><div class="metric-card-head"><span class="metric-card-label">本期应发总额</span><el-icon><Wallet /></el-icon></div><strong>¥ {{ currency(summary.gross) }}</strong><small>基本工资、绩效与补贴合计</small></div>
      <div class="metric-card panel"><div class="metric-card-head"><span class="metric-card-label">实发总额</span><el-icon><Money /></el-icon></div><strong>¥ {{ currency(summary.net) }}</strong><small>扣除社保、公积金及个税后</small></div>
      <div class="metric-card panel"><div class="metric-card-head"><span class="metric-card-label">待发放人数</span><el-icon><Timer /></el-icon></div><strong>{{ summary.pending }}</strong><small>本期仍待确认或发放</small></div>
      <div class="metric-card panel"><div class="metric-card-head"><span class="metric-card-label">已发放人数</span><el-icon><CircleCheck /></el-icon></div><strong>{{ summary.paid }}</strong><small>已完成工资发放</small></div>
    </div>

    <section class="panel section">
      <SectionTitle title="工资明细" subtitle="主管仅可查看所属部门工资，超级管理员可维护全部记录。">
        <template #extra><div class="payroll-filters"><el-date-picker v-model="period" type="month" value-format="YYYY-MM" :clearable="false" @change="loadPayroll" /><el-select v-model="statusFilter" clearable placeholder="全部状态"><el-option label="待确认" value="PENDING" /><el-option label="已发放" value="PAID" /></el-select><el-button type="primary" @click="loadPayroll">查询</el-button></div></template>
      </SectionTitle>
      <el-table :data="filteredPayroll" row-key="id">
        <el-table-column min-width="130" label="员工"><template #default="{ row }"><div class="payroll-person"><strong>{{ row.name }}</strong><span>{{ row.jobNo }} · {{ row.department }}</span></div></template></el-table-column>
        <el-table-column width="112" label="基本工资"><template #default="{ row }">¥ {{ currency(row.baseSalary) }}</template></el-table-column>
        <el-table-column width="102" label="绩效/补贴"><template #default="{ row }">¥ {{ currency(row.performance + row.allowance) }}</template></el-table-column>
        <el-table-column width="110" label="应发"><template #default="{ row }"><strong>¥ {{ currency(gross(row)) }}</strong></template></el-table-column>
        <el-table-column width="110" label="扣款"><template #default="{ row }">¥ {{ currency(deductions(row)) }}</template></el-table-column>
        <el-table-column width="118" label="实发"><template #default="{ row }"><strong class="net-pay">¥ {{ currency(net(row)) }}</strong></template></el-table-column>
        <el-table-column width="94" label="状态"><template #default="{ row }"><el-tag :type="row.status === 'PAID' ? 'success' : 'warning'" effect="plain">{{ row.status === 'PAID' ? '已发放' : '待确认' }}</el-tag></template></el-table-column>
        <el-table-column fixed="right" width="154" label="操作"><template #default="{ row }"><el-button link type="primary" @click="openEditor(row)">编辑</el-button><el-button v-if="row.status !== 'PAID'" link type="success" @click="markPaid(row)">确认发放</el-button><el-button v-else link type="info" @click="showSlip(row)">工资条</el-button></template></el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="editorVisible" :title="editingId ? '编辑工资明细' : '录入工资明细'" width="620px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="payroll-form">
        <el-form-item label="员工" prop="employeeId"><el-select v-model="form.employeeId" filterable :disabled="Boolean(editingId)" @change="fillEmployee"><el-option v-for="employee in accessibleEmployees" :key="employee.id" :label="`${employee.name}（${employee.jobNo}）`" :value="employee.id" /></el-select></el-form-item>
        <div class="payroll-form-grid"><el-form-item label="基本工资" prop="baseSalary"><el-input-number v-model="form.baseSalary" :min="0" :precision="2" controls-position="right" /></el-form-item><el-form-item label="绩效工资"><el-input-number v-model="form.performance" :min="0" :precision="2" controls-position="right" /></el-form-item><el-form-item label="补贴"><el-input-number v-model="form.allowance" :min="0" :precision="2" controls-position="right" /></el-form-item><el-form-item label="社保/公积金"><el-input-number v-model="form.insurance" :min="0" :precision="2" controls-position="right" /></el-form-item><el-form-item label="个人所得税"><el-input-number v-model="form.tax" :min="0" :precision="2" controls-position="right" /></el-form-item><el-form-item label="其他扣款"><el-input-number v-model="form.otherDeduction" :min="0" :precision="2" controls-position="right" /></el-form-item></div>
        <div class="payroll-preview">预计实发 <strong>¥ {{ currency(net(form)) }}</strong></div>
      </el-form>
      <template #footer><el-button @click="editorVisible = false">取消</el-button><el-button type="primary" @click="savePayroll">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="slipVisible" title="工资条" width="480px"><div v-if="selected" class="pay-slip"><div class="pay-slip-head"><strong>{{ period }} 工资条</strong><span>{{ selected.name }} · {{ selected.department }}</span></div><div class="pay-slip-row"><span>应发工资</span><strong>¥ {{ currency(gross(selected)) }}</strong></div><div class="pay-slip-row"><span>扣款合计</span><strong>- ¥ {{ currency(deductions(selected)) }}</strong></div><div class="pay-slip-row total"><span>实发工资</span><strong>¥ {{ currency(net(selected)) }}</strong></div><p>工资已通过系统确认发放，如有疑问请联系人事部门。</p></div></el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, Money, Plus, Refresh, Timer, Wallet } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { useOaStore } from '../stores/oa'
import SectionTitle from '../components/SectionTitle.vue'

const auth = useAuthStore()
const oa = useOaStore()
const period = ref(new Date().toISOString().slice(0, 7))
const statusFilter = ref('')
const editorVisible = ref(false), slipVisible = ref(false), editingId = ref(null), selected = ref(null), formRef = ref()
const payroll = ref([
  { id: 1, employeeId: 'u1', name: '系统管理员', jobNo: 'EMP-0001', department: '信息中心', baseSalary: 15000, performance: 3200, allowance: 900, insurance: 1560, tax: 1380, otherDeduction: 0, status: 'PAID' },
  { id: 2, employeeId: 'u2', name: '林雨晴', jobNo: 'EMP-0002', department: '人力资源部', baseSalary: 9800, performance: 1800, allowance: 600, insurance: 1060, tax: 420, otherDeduction: 0, status: 'PENDING' },
  { id: 3, employeeId: 'u3', name: '周启明', jobNo: 'EMP-0003', department: '研发部', baseSalary: 13800, performance: 3000, allowance: 900, insurance: 1480, tax: 1120, otherDeduction: 0, status: 'PENDING' },
  { id: 4, employeeId: 'u4', name: '陈思远', jobNo: 'EMP-0004', department: '研发部', baseSalary: 9800, performance: 1900, allowance: 600, insurance: 1060, tax: 440, otherDeduction: 0, status: 'PENDING' }
])
const form = reactive({ employeeId: '', name: '', jobNo: '', department: '', baseSalary: 0, performance: 0, allowance: 0, insurance: 0, tax: 0, otherDeduction: 0, status: 'PENDING' })
const rules = { employeeId: [{ required: true, message: '请选择员工', trigger: 'change' }], baseSalary: [{ required: true, message: '请输入基本工资', trigger: 'change' }] }
const accessibleEmployees = computed(() => auth.role.value === '部门主管' ? oa.state.employees.filter((item) => item.department === auth.state.profile?.department) : oa.state.employees)
const filteredPayroll = computed(() => payroll.value.filter((item) => (!statusFilter.value || item.status === statusFilter.value) && (auth.role.value !== '部门主管' || item.department === auth.state.profile?.department)))
const gross = (item) => Number(item.baseSalary || 0) + Number(item.performance || 0) + Number(item.allowance || 0)
const deductions = (item) => Number(item.insurance || 0) + Number(item.tax || 0) + Number(item.otherDeduction || 0)
const net = (item) => Math.max(0, gross(item) - deductions(item))
const currency = (value) => new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))
const summary = computed(() => ({ gross: filteredPayroll.value.reduce((sum, item) => sum + gross(item), 0), net: filteredPayroll.value.reduce((sum, item) => sum + net(item), 0), pending: filteredPayroll.value.filter((item) => item.status !== 'PAID').length, paid: filteredPayroll.value.filter((item) => item.status === 'PAID').length }))
function loadPayroll() { ElMessage.success(`已加载 ${period.value} 工资周期数据`) }
function resetPayroll() { statusFilter.value = ''; loadPayroll() }
function fillEmployee(id) { const employee = accessibleEmployees.value.find((item) => item.id === id); if (employee) Object.assign(form, { name: employee.name, jobNo: employee.jobNo, department: employee.department }) }
function openEditor(row = null) { editingId.value = row?.id || null; Object.assign(form, row ? { ...row } : { employeeId: '', name: '', jobNo: '', department: '', baseSalary: 0, performance: 0, allowance: 0, insurance: 0, tax: 0, otherDeduction: 0, status: 'PENDING' }); editorVisible.value = true }
async function savePayroll() { const valid = await formRef.value?.validate().catch(() => false); if (!valid) return; if (editingId.value) { const index = payroll.value.findIndex((item) => item.id === editingId.value); payroll.value[index] = { ...form } } else { payroll.value.push({ ...form, id: Date.now() }) }; editorVisible.value = false; ElMessage.success('工资明细已保存') }
function markPaid(row) { row.status = 'PAID'; ElMessage.success(`${row.name} 的工资已确认发放`) }
function showSlip(row) { selected.value = row; slipVisible.value = true }
</script>

<style scoped>
.payroll-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }.payroll-summary .metric-card { padding: 18px; }.payroll-summary strong { display: block; margin-top: 18px; color: var(--text); font-size: 24px; }.payroll-summary small { display: block; margin-top: 7px; color: var(--muted); font-size: 12px; }.payroll-filters { display: flex; gap: 8px; }.payroll-filters .el-select { width: 116px; }.payroll-person { display: grid; gap: 4px; }.payroll-person span { color: var(--muted); font-size: 12px; }.net-pay { color: var(--success); }.payroll-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 14px; }.payroll-form .el-select, .payroll-form .el-input-number { width: 100%; }.payroll-preview { margin-top: 4px; padding: 14px; border-left: 3px solid var(--primary); background: #f4f8ff; color: var(--muted); }.payroll-preview strong { margin-left: 9px; color: var(--primary); font-size: 20px; }.pay-slip { padding: 4px; }.pay-slip-head { display: grid; gap: 5px; margin-bottom: 18px; }.pay-slip-head strong { font-size: 18px; }.pay-slip-head span, .pay-slip p { color: var(--muted); font-size: 13px; }.pay-slip-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); }.pay-slip-row.total { border-bottom: 0; color: var(--primary); font-size: 16px; }.pay-slip-row.total strong { font-size: 20px; }@media (max-width: 1120px) { .payroll-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } }@media (max-width: 760px) { .payroll-summary, .payroll-form-grid { grid-template-columns: 1fr; }.payroll-filters { flex-wrap: wrap; } }
</style>
