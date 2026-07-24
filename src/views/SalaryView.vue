<template>
  <div class="content-grid salary-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">薪资管理</h1>
        <p class="page-subtitle">{{ scopeDescription }}</p>
      </div>
      <el-button :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <div class="salary-summary">
      <article class="salary-stat salary-stat--blue">
        <span>当前员工</span><strong>{{ filteredRows.length }}</strong><small>当前筛选范围</small>
      </article>
      <article class="salary-stat salary-stat--violet">
        <span>基础薪资合计</span><strong>{{ money(summary.base) }}</strong><small>按职级标准统计</small>
      </article>
      <article class="salary-stat salary-stat--green">
        <span>绩效合计</span><strong>{{ money(summary.performance) }}</strong><small>直接维护金额</small>
      </article>
      <article class="salary-stat salary-stat--orange">
        <span>预计实发合计</span><strong>{{ money(summary.payable) }}</strong><small>基础 + 绩效 - 扣除</small>
      </article>
    </div>

    <section class="panel section">
      <SectionTitle title="员工薪资档案" subtitle="基础薪资由13A至20C职级统一确定，绩效与扣除工资可直接编辑。">
        <template #extra>
          <div class="salary-filters">
            <el-input v-model="keyword" clearable placeholder="姓名 / 登录账号" />
            <el-select v-if="departmentOptions.length > 1" v-model="departmentFilter" clearable placeholder="全部部门">
              <el-option v-for="item in departmentOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
        </template>
      </SectionTitle>

      <el-table v-loading="loading" :data="filteredRows" border>
        <el-table-column prop="displayName" label="员工" min-width="120" />
        <el-table-column prop="username" label="登录账号" min-width="140" />
        <el-table-column prop="departmentName" label="部门" min-width="130" />
        <el-table-column label="职级" width="90" align="center">
          <template #default="{ row }"><el-tag effect="plain">{{ row.salaryGrade || '13A' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="月基础薪资" min-width="140" align="right">
          <template #default="{ row }">{{ money(row.salary) }}</template>
        </el-table-column>
        <el-table-column label="绩效" min-width="120" align="right">
          <template #default="{ row }"><span class="positive">+ {{ money(row.performanceSalary) }}</span></template>
        </el-table-column>
        <el-table-column label="扣除" min-width="120" align="right">
          <template #default="{ row }"><span class="negative">- {{ money(row.deductionSalary) }}</span></template>
        </el-table-column>
        <el-table-column label="预计实发" min-width="145" align="right">
          <template #default="{ row }"><strong>{{ money(payable(row)) }}</strong></template>
        </el-table-column>
        <el-table-column v-if="canUpdate" label="操作" width="90" fixed="right" align="center">
          <template #default="{ row }"><el-button link type="primary" @click="openEditor(row)">编辑</el-button></template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" title="编辑员工薪资" width="500px" destroy-on-close>
      <div class="employee-card">
        <div class="employee-avatar">{{ String(form.displayName || '员').slice(0, 1) }}</div>
        <div><strong>{{ form.displayName }}</strong><span>{{ form.departmentName }} · {{ form.username }}</span></div>
      </div>
      <el-form label-position="top" @submit.prevent="save">
        <el-form-item label="薪资职级">
          <el-select v-model="form.salaryGrade" style="width: 100%">
            <el-option v-for="grade in grades" :key="grade.code" :label="`${grade.code} · ${money(grade.baseSalary)}`" :value="grade.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="月基础薪资">
          <el-input :model-value="money(selectedBaseSalary)" disabled />
        </el-form-item>
        <div class="money-fields">
          <el-form-item label="绩效工资">
            <el-input-number v-model="form.performanceSalary" :min="0" :max="9999999999.99" :precision="2" :step="100" controls-position="right" />
          </el-form-item>
          <el-form-item label="扣除工资">
            <el-input-number v-model="form.deductionSalary" :min="0" :max="9999999999.99" :precision="2" :step="100" controls-position="right" />
          </el-form-item>
        </div>
        <div class="pay-preview">
          <span>预计实发</span>
          <strong>{{ money(editorPayable) }}</strong>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存薪资</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { listDepartments, listSalaries, listSalaryGrades, updateSalaryDetail } from '../api/organization'
import SectionTitle from '../components/SectionTitle.vue'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const rows = ref([])
const grades = ref([])
const departments = ref([])
const keyword = ref('')
const departmentFilter = ref(null)
const form = reactive({ id: '', displayName: '', username: '', departmentName: '', salaryGrade: '13A', performanceSalary: 0, deductionSalary: 0 })

const canUpdate = computed(() => auth.hasPermission('sys:salary:update'))
const scopeDescription = computed(() => '集中维护权限范围内员工的职级、月基础薪资、绩效和扣除工资。')
const departmentOptions = computed(() => {
  const source = departments.value.length
    ? departments.value.filter((item) => item.status === 1).map((item) => ({ label: item.name, value: item.id }))
    : rows.value.filter((item) => item.departmentId).map((item) => ({ label: item.departmentName || '未命名部门', value: item.departmentId }))
  return [...new Map(source.map((item) => [String(item.value), item])).values()]
})
const filteredRows = computed(() => {
  const needle = keyword.value.trim().toLowerCase()
  return rows.value.filter((item) => {
    const matchKeyword = !needle || String(item.displayName || '').toLowerCase().includes(needle) || String(item.username || '').toLowerCase().includes(needle)
    return matchKeyword && (!departmentFilter.value || String(item.departmentId) === String(departmentFilter.value))
  })
})
const summary = computed(() => filteredRows.value.reduce((result, item) => {
  result.base += Number(item.salary || 0)
  result.performance += Number(item.performanceSalary || 0)
  result.deduction += Number(item.deductionSalary || 0)
  result.payable += payable(item)
  return result
}, { base: 0, performance: 0, deduction: 0, payable: 0 }))
const selectedBaseSalary = computed(() => Number(grades.value.find((item) => item.code === form.salaryGrade)?.baseSalary || 0))
const editorPayable = computed(() => Math.max(0, selectedBaseSalary.value + Number(form.performanceSalary || 0) - Number(form.deductionSalary || 0)))

function money(value) {
  return Number(value || 0).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 })
}

function payable(row) {
  return Number(row.payableSalary ?? (Number(row.salary || 0) + Number(row.performanceSalary || 0) - Number(row.deductionSalary || 0)))
}

async function loadAll() {
  loading.value = true
  try {
    const requests = [
      listSalaries({ page: 1, size: 100 }),
      listSalaryGrades()
    ]
    if (auth.hasPermission('sys:dept:list')) requests.push(listDepartments())
    const [salaryPage, gradeRows, departmentRows] = await Promise.all(requests)
    rows.value = salaryPage?.records || []
    grades.value = gradeRows || []
    departments.value = departmentRows || []
  } catch (error) {
    ElMessage.error(error.message || '薪资数据加载失败')
  } finally {
    loading.value = false
  }
}

function openEditor(row) {
  Object.assign(form, {
    id: row.id,
    displayName: row.displayName,
    username: row.username,
    departmentName: row.departmentName || '未分配部门',
    salaryGrade: row.salaryGrade || '13A',
    performanceSalary: Number(row.performanceSalary || 0),
    deductionSalary: Number(row.deductionSalary || 0)
  })
  dialogVisible.value = true
}

async function save() {
  if (Number(form.deductionSalary || 0) > selectedBaseSalary.value + Number(form.performanceSalary || 0)) {
    ElMessage.warning('扣除工资不能超过基础薪资与绩效工资之和')
    return
  }
  saving.value = true
  try {
    await updateSalaryDetail(form.id, {
      salaryGrade: form.salaryGrade,
      performanceSalary: Number(form.performanceSalary || 0),
      deductionSalary: Number(form.deductionSalary || 0)
    })
    dialogVisible.value = false
    ElMessage.success('薪资已保存')
    await loadAll()
  } catch (error) {
    ElMessage.error(error.message || '薪资保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped>
.salary-summary { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 14px; }
.salary-stat { position: relative; overflow: hidden; min-height: 118px; padding: 20px; border: 1px solid rgba(135, 156, 203, .18); border-radius: 18px; box-shadow: 0 12px 30px rgba(51, 72, 118, .08); }
.salary-stat::after { content: ''; position: absolute; right: -24px; bottom: -38px; width: 110px; height: 110px; border: 18px solid rgba(255,255,255,.45); border-radius: 50%; }
.salary-stat span, .salary-stat small { display: block; position: relative; z-index: 1; color: #64748b; }
.salary-stat strong { display: block; position: relative; z-index: 1; margin: 10px 0 5px; color: #172033; font-size: 24px; font-variant-numeric: tabular-nums; }
.salary-stat--blue { background: linear-gradient(135deg, #edf6ff, #f7fbff); }
.salary-stat--violet { background: linear-gradient(135deg, #f1efff, #faf9ff); }
.salary-stat--green { background: linear-gradient(135deg, #eafaf4, #f7fdfa); }
.salary-stat--orange { background: linear-gradient(135deg, #fff4e8, #fffbf5); }
.salary-filters { display: flex; gap: 8px; }
.salary-filters .el-input { width: 190px; }
.salary-filters .el-select { width: 155px; }
.positive { color: #15956b; }
.negative { color: #dc6f55; }
.employee-card { display: flex; align-items: center; gap: 12px; padding: 14px; margin-bottom: 18px; border-radius: 14px; background: #f4f7ff; }
.employee-avatar { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 13px; color: white; font-weight: 700; background: linear-gradient(145deg, #6486f6, #8c6aee); }
.employee-card strong, .employee-card span { display: block; }
.employee-card span { margin-top: 3px; color: var(--muted); font-size: 12px; }
.money-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.money-fields .el-input-number { width: 100%; }
.pay-preview { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 12px; background: #f0faf6; }
.pay-preview span { color: #587268; }
.pay-preview strong { color: #11875e; font-size: 20px; }
@media (max-width: 1100px) { .salary-summary { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) {
  .salary-summary, .money-fields { grid-template-columns: 1fr; }
  .salary-filters { width: 100%; flex-wrap: wrap; }
  .salary-filters .el-input, .salary-filters .el-select { flex: 1 1 150px; }
}
</style>
