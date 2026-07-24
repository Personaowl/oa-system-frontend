<template>
  <div class="content-grid employee-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">员工管理</h1>
        <p class="page-subtitle">{{ scopeDescription }}</p>
      </div>
      <div class="tool-row">
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
        <el-button v-if="canExportUsers" :loading="exporting" :icon="Download" @click="exportEmployeeData">导出 Excel</el-button>
        <el-button v-if="canCreateUser" type="primary" :icon="Plus" @click="openEmployee()">新增员工</el-button>
      </div>
    </div>

    <section class="panel section">
      <SectionTitle title="员工档案" subtitle="员工账号、组织归属和角色信息均来自 user-service，薪资请前往独立的薪资管理页面维护。">
        <template #extra>
          <div class="employee-filter-row">
            <el-input v-model="keyword" clearable placeholder="姓名 / 登录账号" class="employee-search" />
            <el-select v-if="departmentOptions.length > 1" v-model="departmentFilter" clearable placeholder="全部部门" class="employee-department-filter">
              <el-option v-for="item in departmentOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
        </template>
      </SectionTitle>

      <div class="employee-summary">
        <div><span>当前范围</span><strong>{{ scopeName }}</strong></div>
        <div><span>员工数量</span><strong>{{ filteredEmployees.length }}</strong></div>
        <div><span>在职员工</span><strong>{{ activeEmployeeCount }}</strong></div>
      </div>

      <div class="table-wrap">
        <el-table v-loading="loading" :data="filteredEmployees" border>
          <el-table-column prop="displayName" label="姓名" width="130" />
          <el-table-column prop="username" label="登录账号" min-width="145" />
          <el-table-column prop="departmentName" label="部门" min-width="140" />
          <el-table-column label="角色" min-width="130">
            <template #default="{ row }">{{ roleNames(row) }}</template>
          </el-table-column>
          <el-table-column prop="phone" label="联系电话" width="145" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template>
          </el-table-column>
          <el-table-column v-if="canUpdateUser || canDeleteUser" label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button v-if="canUpdateUser" link type="primary" @click="openEmployee(row)">编辑</el-button>
              <el-button v-if="canDeleteUser" link type="danger" @click="removeEmployee(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog v-model="employeeDialogVisible" :title="employeeForm.id ? '编辑员工' : '新增员工'" width="650px" destroy-on-close>
      <el-form ref="employeeFormRef" :model="employeeForm" :rules="employeeRules" label-position="top" class="employee-form-grid">
        <el-form-item label="姓名" prop="displayName"><el-input v-model="employeeForm.displayName" maxlength="64" /></el-form-item>
        <el-form-item label="登录账号" prop="username"><el-input v-model="employeeForm.username" maxlength="64" /></el-form-item>
        <el-form-item :label="employeeForm.id ? '重置密码（留空则不修改）' : '初始密码'" :prop="employeeForm.id ? '' : 'password'">
          <el-input v-model="employeeForm.password" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="联系电话"><el-input v-model="employeeForm.phone" maxlength="32" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="employeeForm.email" maxlength="128" /></el-form-item>
        <el-form-item label="部门" prop="departmentId">
          <el-select v-model="employeeForm.departmentId" style="width: 100%">
            <el-option v-for="item in departmentOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="roleIds">
          <el-select v-model="employeeForm.roleIds" multiple style="width: 100%">
            <el-option v-for="item in enabledRoles" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态"><el-switch v-model="employeeForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="employeeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEmployee">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Plus } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { createUser, deleteUser, exportUsers, listDepartments, listRoles, listUsers, updateUser } from '../api/organization'
import SectionTitle from '../components/SectionTitle.vue'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const employees = ref([])
const departments = ref([])
const roles = ref([])
const keyword = ref('')
const departmentFilter = ref(null)
const employeeDialogVisible = ref(false)
const employeeFormRef = ref()
const employeeForm = reactive({ id: '', displayName: '', username: '', password: '', phone: '', email: '', departmentId: null, roleIds: [], enabled: true })

const canCreateUser = computed(() => auth.hasPermission('sys:user:create'))
const canExportUsers = computed(() => auth.hasPermission('sys:user:list'))
const canUpdateUser = computed(() => auth.hasPermission('sys:user:update'))
const canDeleteUser = computed(() => auth.hasPermission('sys:user:delete'))
const enabledRoles = computed(() => roles.value.filter((item) => item.status === 1))
const isManager = computed(() => auth.role.value === '部门主管')
const scopeName = computed(() => isManager.value ? (auth.state.profile?.department || '本部门') : '全部部门')
const scopeDescription = computed(() => isManager.value ? '查看并管理所属部门员工，其他部门数据由后端自动隔离。' : '查看全部部门员工，并维护员工档案。')
const departmentOptions = computed(() => {
  const source = departments.value.length
    ? departments.value.filter((item) => item.status === 1).map((item) => ({ label: item.name, value: item.id }))
    : employees.value.filter((item) => item.departmentId).map((item) => ({ label: item.departmentName || '未命名部门', value: item.departmentId }))
  return [...new Map(source.map((item) => [String(item.value), item])).values()]
})
const filteredEmployees = computed(() => {
  const needle = keyword.value.trim().toLowerCase()
  return employees.value.filter((item) => {
    const matchesKeyword = !needle || String(item.displayName || '').toLowerCase().includes(needle) || String(item.username || '').toLowerCase().includes(needle)
    return matchesKeyword && (!departmentFilter.value || String(item.departmentId) === String(departmentFilter.value))
  })
})
const activeEmployeeCount = computed(() => filteredEmployees.value.filter((item) => item.status === 1).length)
const employeeRules = {
  displayName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  password: [{ required: true, min: 6, message: '初始密码至少 6 位', trigger: 'blur' }],
  departmentId: [{ required: true, message: '请选择部门', trigger: 'change' }],
  roleIds: [{ type: 'array', required: true, min: 1, message: '请至少选择一个角色', trigger: 'change' }]
}
const roleLabel = { ADMIN: '系统管理员', HR: 'HR 人事', MANAGER: '部门主管', EMPLOYEE: '普通员工' }

function roleNames(row) {
  if (roles.value.length) {
    const selected = new Set((row.roleIds || []).map(String))
    const names = roles.value.filter((item) => selected.has(String(item.id))).map((item) => item.name)
    if (names.length) return names.join('、')
  }
  return (row.roleCodes || []).map((code) => roleLabel[code] || code).join('、') || '未分配'
}

async function loadAll() {
  loading.value = true
  try {
    const optionalRequests = []
    if (auth.hasPermission('sys:dept:list')) optionalRequests.push(listDepartments().then((data) => { departments.value = data || [] }))
    if (auth.hasPermission('sys:role:list')) optionalRequests.push(listRoles().then((data) => { roles.value = data || [] }))
    const userPage = await listUsers({ page: 1, size: 100 })
    employees.value = userPage?.records || []
    await Promise.all(optionalRequests)
  } catch (error) {
    ElMessage.error(error.message || '员工数据加载失败')
  } finally { loading.value = false }
}

async function exportEmployeeData() {
  exporting.value = true
  try {
    const fileName = await exportUsers({
      keyword: keyword.value.trim() || undefined,
      departmentId: departmentFilter.value || undefined
    })
    ElMessage.success(`已导出 ${fileName}`)
  } catch (error) {
    ElMessage.error(error.message || '员工数据导出失败')
  } finally {
    exporting.value = false
  }
}

function openEmployee(row = null) {
  const employeeRole = enabledRoles.value.find((item) => item.code === 'EMPLOYEE')
  Object.assign(employeeForm, row ? {
    id: row.id, displayName: row.displayName, username: row.username, password: '', phone: row.phone || '', email: row.email || '', departmentId: row.departmentId, roleIds: [...(row.roleIds || [])], enabled: row.status === 1
  } : {
    id: '', displayName: '', username: '', password: '123456', phone: '', email: '', departmentId: departmentOptions.value[0]?.value || null, roleIds: employeeRole ? [employeeRole.id] : [], enabled: true
  })
  employeeDialogVisible.value = true
}

async function saveEmployee() {
  const valid = employeeForm.id
    ? await employeeFormRef.value?.validateField(['displayName', 'username', 'departmentId', 'roleIds']).then(() => true).catch(() => false)
    : await employeeFormRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const common = { username: employeeForm.username, displayName: employeeForm.displayName, departmentId: employeeForm.departmentId, phone: employeeForm.phone || null, email: employeeForm.email || null, status: employeeForm.enabled ? 1 : 0, roleIds: employeeForm.roleIds }
    if (employeeForm.id) await updateUser(employeeForm.id, { ...common, newPassword: employeeForm.password || null })
    else await createUser({ ...common, password: employeeForm.password })
    employeeDialogVisible.value = false
    ElMessage.success('员工信息已保存')
    await loadAll()
  } catch (error) { ElMessage.error(error.message || '保存失败') } finally { saving.value = false }
}

async function removeEmployee(row) {
  try {
    await ElMessageBox.confirm(`确认删除员工“${row.displayName}”吗？`, '删除员工', { type: 'warning' })
    await deleteUser(row.id)
    ElMessage.success('员工已删除')
    await loadAll()
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '删除失败') }
}

onMounted(loadAll)
</script>

<style scoped>
.table-wrap { width: 100%; overflow-x: auto; }
.employee-filter-row { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.employee-search { width: 190px; }
.employee-department-filter { width: 160px; }
.employee-summary { display: grid; grid-template-columns: repeat(3, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
.employee-summary > div { padding: 14px 16px; border: 1px solid var(--line); border-radius: 12px; background: #f8fafc; }
.employee-summary span { display: block; color: var(--muted); font-size: 12px; }
.employee-summary strong { display: block; margin-top: 5px; color: var(--text); font-size: 18px; }
@media (max-width: 760px) {
  .employee-summary { grid-template-columns: 1fr; }
  .employee-filter-row { width: 100%; justify-content: stretch; }
  .employee-search, .employee-department-filter { flex: 1 1 150px; }
}
</style>
