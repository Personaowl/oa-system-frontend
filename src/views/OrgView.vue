<template>
  <div class="content-grid org-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">部门管理</h1>
        <p class="page-subtitle">维护企业部门层级、负责人和角色权限。</p>
      </div>
      <div class="tool-row">
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
        <el-button v-if="canExportDepartments" :loading="exporting" :icon="Download" @click="exportDepartmentData">导出 Excel</el-button>
        <el-button v-if="canCreateDepartment" type="primary" :icon="Plus" @click="openDepartment()">新增部门</el-button>
      </div>
    </div>

    <div class="org-panels">
      <section class="panel section">
        <SectionTitle title="部门管理" subtitle="人数由部门下的有效员工实时统计，无需手工录入。" />
        <div class="table-wrap">
          <el-table v-loading="loading" class="department-table" :data="departments" border>
            <el-table-column prop="name" label="部门名称" min-width="180" />
            <el-table-column label="负责人" min-width="210">
              <template #default="{ row }">
                <div v-if="row.managerNames?.length" class="manager-tags">
                  <el-tag type="primary" effect="light">{{ row.managerNames[0] }}</el-tag>
                  <el-tag v-for="name in row.managerNames.slice(1)" :key="name" type="info" effect="plain">{{ name }}</el-tag>
                </div>
                <span v-else>未指定</span>
              </template>
            </el-table-column>
            <el-table-column prop="employeeCount" label="人数" width="90" align="center" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template>
            </el-table-column>
            <el-table-column v-if="canUpdateDepartment || canDeleteDepartment" label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button v-if="canUpdateDepartment" link type="primary" @click="openDepartment(row)">编辑</el-button>
                <el-button v-if="canDeleteDepartment" link type="danger" @click="removeDepartment(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>

    </div>

    <el-dialog v-model="departmentDialogVisible" :title="departmentForm.id ? '编辑部门' : '新增部门'" width="460px" destroy-on-close>
      <el-form ref="departmentFormRef" :model="departmentForm" :rules="departmentRules" label-position="top">
        <el-form-item label="部门名称" prop="name"><el-input v-model="departmentForm.name" maxlength="64" show-word-limit /></el-form-item>
        <el-form-item label="上级部门">
          <el-select v-model="departmentForm.parentId" clearable placeholder="无（根部门）" style="width: 100%">
            <el-option v-for="item in parentDepartmentOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="主负责人">
          <el-select v-model="departmentForm.managerId" clearable filterable placeholder="可选，请选择部门主管" no-data-text="暂无可选的部门主管" style="width: 100%">
            <el-option v-for="item in managerOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <div class="form-help">主负责人作为默认审批人；部门可再配置多名协同主管。</div>
        </el-form-item>
        <el-form-item label="协同主管">
          <el-select v-model="departmentForm.assistantManagerIds" multiple clearable filterable collapse-tags :max-collapse-tags="3" placeholder="可选，可配置多名主管" no-data-text="暂无可选的部门主管" style="width: 100%">
            <el-option v-for="item in assistantManagerOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <template #label>
            <span class="field-label-with-help">显示顺序
              <el-tooltip content="用于控制部门在列表中的先后顺序，数值越小越靠前；相同时按创建顺序排列。" placement="top">
                <el-icon><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input-number v-model="departmentForm.sortOrder" :min="0" controls-position="right" style="width: 100%" />
          <div class="form-help">例如：总部填 0、研发部填 10、行政部填 20，后续可在中间插入新部门。</div>
        </el-form-item>
        <el-form-item label="状态"><el-switch v-model="departmentForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="departmentDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveDepartment">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Plus, QuestionFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import {
  createDepartment, deleteDepartment, exportDepartments,
  listDepartments, listUsers,
  updateDepartment
} from '../api/organization'
import SectionTitle from '../components/SectionTitle.vue'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const departments = ref([])
const employees = ref([])
const departmentDialogVisible = ref(false)
const departmentFormRef = ref()
const departmentForm = reactive({ id: '', name: '', parentId: null, managerId: null, assistantManagerIds: [], sortOrder: 0, enabled: true })

const canCreateDepartment = computed(() => auth.hasPermission('sys:dept:create'))
const canExportDepartments = computed(() => auth.hasPermission('sys:dept:list'))
const canUpdateDepartment = computed(() => auth.hasPermission('sys:dept:update'))
const canDeleteDepartment = computed(() => auth.hasPermission('sys:dept:delete'))
const departmentOptions = computed(() => departments.value.filter((item) => item.status === 1).map((item) => ({ label: item.name, value: item.id })))
const parentDepartmentOptions = computed(() => departmentOptions.value.filter((item) => item.value !== departmentForm.id))
const managerOptions = computed(() => employees.value
  .filter((item) => item.status === 1)
  .map((item) => ({ label: item.displayName, value: item.id })))
const assistantManagerOptions = computed(() => managerOptions.value
  .filter((item) => String(item.value) !== String(departmentForm.managerId || '')))
const departmentRules = { name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }] }

async function loadAll() {
  loading.value = true
  try {
    const [departmentData, userPage] = await Promise.all([
      listDepartments(),
      auth.hasPermission('sys:user:list') ? listUsers({ page: 1, size: 100 }) : Promise.resolve({ records: [] })
    ])
    departments.value = departmentData || []
    employees.value = userPage?.records || []
  } catch (error) {
    ElMessage.error(error.message || '组织数据加载失败')
  } finally { loading.value = false }
}

async function exportDepartmentData() {
  exporting.value = true
  try {
    const fileName = await exportDepartments()
    ElMessage.success(`已导出 ${fileName}`)
  } catch (error) {
    ElMessage.error(error.message || '部门数据导出失败')
  } finally {
    exporting.value = false
  }
}

function openDepartment(row = null) {
  Object.assign(departmentForm, row ? {
    id: row.id,
    name: row.name,
    parentId: row.parentId || null,
    managerId: row.managerId || null,
    assistantManagerIds: (row.managerIds || []).filter((id) => String(id) !== String(row.managerId || '')),
    sortOrder: row.sortOrder || 0,
    enabled: row.status === 1
  } : { id: '', name: '', parentId: null, managerId: null, assistantManagerIds: [], sortOrder: 0, enabled: true })
  departmentDialogVisible.value = true
}

async function saveDepartment() {
  if (!(await departmentFormRef.value?.validate().catch(() => false))) return
  saving.value = true
  try {
    const payload = {
      name: departmentForm.name,
      parentId: departmentForm.parentId || 0,
      managerId: departmentForm.managerId || null,
      assistantManagerIds: departmentForm.assistantManagerIds || [],
      sortOrder: departmentForm.sortOrder,
      status: departmentForm.enabled ? 1 : 0
    }
    if (departmentForm.id) await updateDepartment(departmentForm.id, payload)
    else await createDepartment(payload)
    departmentDialogVisible.value = false
    ElMessage.success('部门信息已保存')
    await loadAll()
  } catch (error) { ElMessage.error(error.message || '保存失败') } finally { saving.value = false }
}

async function removeDepartment(row) {
  try {
    await ElMessageBox.confirm(`确认删除“${row.name}”吗？`, '删除部门', { type: 'warning' })
    await deleteDepartment(row.id)
    ElMessage.success('部门已删除')
    await loadAll()
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '删除失败') }
}

onMounted(loadAll)
</script>

<style scoped>
.org-panels { display: grid; gap: 16px; }
.table-wrap { width: 100%; overflow-x: auto; }
.department-table { min-width: 620px; }
.employee-table { min-width: 920px; }
.org-filter-row { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.org-search { width: 180px; }
.org-department-filter { width: 150px; }
.field-label-with-help { display: inline-flex; align-items: center; gap: 5px; }
.field-label-with-help .el-icon { color: var(--muted); cursor: help; }
.manager-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.form-help { margin-top: 6px; color: var(--muted); font-size: 12px; line-height: 1.5; }
.rbac-overview { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px 20px; margin-bottom: 16px; border: 1px solid #dbeafe; border-radius: 14px; background: linear-gradient(135deg, #eff6ff, #f8fbff); }
.rbac-overview-title { color: #173968; font-size: 18px; font-weight: 700; }
.rbac-overview-desc { margin-top: 5px; color: var(--muted); font-size: 13px; }
.rbac-stat-list { display: flex; gap: 10px; flex-shrink: 0; }
.rbac-stat { min-width: 82px; padding: 10px 14px; border-radius: 10px; background: rgb(255 255 255 / 82%); text-align: center; box-shadow: 0 4px 14px rgb(37 99 235 / 8%); }
.rbac-stat strong { display: block; color: #2563eb; font-size: 22px; line-height: 1.1; }
.rbac-stat span { color: var(--muted); font-size: 12px; }
.role-collapse { max-height: 52vh; overflow-y: auto; border-top: 0; }
.role-collapse-title { display: flex; align-items: center; gap: 12px; width: calc(100% - 26px); padding: 7px 2px; }
.role-avatar { width: 10px; height: 10px; flex: 0 0 10px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 0 4px rgb(59 130 246 / 10%); }
.role-identity { display: flex; flex: 1; flex-direction: column; min-width: 0; line-height: 1.35; }
.role-identity strong { color: var(--text); font-size: 14px; }
.role-identity small { color: var(--muted); font-size: 11px; font-weight: 500; }
.permission-list { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 46px 18px; }
@media (max-width: 760px) {
  .org-filter-row { width: 100%; justify-content: stretch; }
  .org-search, .org-department-filter { flex: 1 1 150px; }
  .rbac-overview { align-items: flex-start; flex-direction: column; }
  .permission-list { padding-left: 8px; }
}
</style>
