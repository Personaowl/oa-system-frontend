<template>
  <div class="content-grid">
    <div class="page-head">
      <div>
        <h1 class="page-title">组织权限</h1>
        <p class="page-subtitle">维护部门、员工与角色信息，模拟 user-service 的基础管理能力。</p>
      </div>
      <div class="tool-row">
        <el-button type="primary" :icon="Plus" @click="openDepartment()">新增部门</el-button>
        <el-button :icon="UserFilled" @click="openEmployee()">新增员工</el-button>
      </div>
    </div>

    <div class="panel section">
      <SectionTitle title="RBAC 角色权限" subtitle="前端菜单和路由会根据当前账号角色动态过滤。" />
      <div class="role-grid">
        <div v-for="item in roleMatrix" :key="item.role" class="panel-soft role-item">
          <div class="role-title">{{ item.role }}</div>
          <div class="role-tags">
            <el-tag v-for="permission in item.permissions" :key="permission" effect="plain" size="small">{{ permission }}</el-tag>
          </div>
        </div>
      </div>
    </div>

    <div class="two-col">
      <section class="panel section">
        <SectionTitle title="部门管理" subtitle="维护组织结构、负责人和部门人数。" />
        <el-table :data="oa.state.departments" border>
          <el-table-column prop="name" label="部门名称" min-width="150" />
          <el-table-column prop="manager" label="负责人" width="130" />
          <el-table-column prop="people" label="人数" width="100" align="center" />
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDepartment(row)">编辑</el-button>
              <el-button link type="danger" @click="removeDepartment(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="panel section">
        <SectionTitle title="员工管理" subtitle="按姓名、工号或部门筛选员工信息。">
          <template #extra>
            <div class="tool-row" style="gap: 8px">
              <el-input v-model="keyword" clearable placeholder="姓名 / 工号" style="width: 150px" />
              <el-select v-model="departmentFilter" clearable placeholder="全部部门" style="width: 130px">
                <el-option v-for="item in departmentOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </div>
          </template>
        </SectionTitle>
        <el-table :data="filteredEmployees" border height="410">
          <el-table-column prop="name" label="姓名" width="96" />
          <el-table-column prop="jobNo" label="工号" width="118" />
          <el-table-column prop="department" label="部门" min-width="120" />
          <el-table-column prop="role" label="角色" min-width="118" />
          <el-table-column prop="status" label="状态" width="88">
            <template #default="{ row }">
              <span class="status-pill" :class="row.status === '在岗' ? 'is-success' : 'is-warning'">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEmployee(row)">编辑</el-button>
              <el-button link type="danger" @click="removeEmployee(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog v-model="departmentDialogVisible" :title="departmentForm.id ? '编辑部门' : '新增部门'" width="440px" destroy-on-close>
      <el-form ref="departmentFormRef" :model="departmentForm" :rules="departmentRules" label-position="top">
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="departmentForm.name" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="负责人" prop="manager">
          <el-input v-model="departmentForm.manager" maxlength="20" />
        </el-form-item>
        <el-form-item label="初始人数" prop="people">
          <el-input-number v-model="departmentForm.people" :min="0" controls-position="right" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="departmentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDepartment">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="employeeDialogVisible" :title="employeeForm.id ? '编辑员工' : '新增员工'" width="620px" destroy-on-close>
      <el-form ref="employeeFormRef" :model="employeeForm" :rules="employeeRules" label-position="top" class="employee-form-grid">
        <el-form-item label="姓名" prop="name"><el-input v-model="employeeForm.name" /></el-form-item>
        <el-form-item label="工号" prop="jobNo"><el-input v-model="employeeForm.jobNo" /></el-form-item>
        <el-form-item label="联系电话" prop="phone"><el-input v-model="employeeForm.phone" /></el-form-item>
        <el-form-item label="部门" prop="department">
          <el-select v-model="employeeForm.department" style="width: 100%">
            <el-option v-for="item in departmentOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="employeeForm.role" style="width: 100%">
            <el-option v-for="item in roleOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="employeeForm.status">
            <el-radio value="在岗">在岗</el-radio>
            <el-radio value="试用">试用</el-radio>
            <el-radio value="离职">离职</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="employeeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEmployee">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, UserFilled } from '@element-plus/icons-vue'
import { useOaStore } from '../stores/oa'
import SectionTitle from '../components/SectionTitle.vue'

const oa = useOaStore()
const keyword = ref('')
const departmentFilter = ref('')
const departmentDialogVisible = ref(false)
const employeeDialogVisible = ref(false)
const departmentFormRef = ref()
const employeeFormRef = ref()

const departmentForm = reactive({ id: '', name: '', manager: '', people: 0 })
const employeeForm = reactive({ id: '', name: '', jobNo: '', department: '', role: '', status: '在岗', phone: '' })
const roleOptions = ['超级管理员', 'HR 人事', '部门主管', '普通员工']
const roleMatrix = [
  { role: '超级管理员', permissions: ['全部菜单', '组织权限', '公告发布', '数据看板'] },
  { role: 'HR 人事', permissions: ['组织权限', '公告发布', '数据看板', '考勤查询'] },
  { role: '部门主管', permissions: ['部门审批', '公告查看', '数据看板', '考勤打卡'] },
  { role: '普通员工', permissions: ['考勤打卡', '提交审批', '公告查看'] }
]

const departmentRules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  manager: [{ required: true, message: '请输入负责人', trigger: 'blur' }]
}
const employeeRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  jobNo: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  department: [{ required: true, message: '请选择部门', trigger: 'change' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const departmentOptions = computed(() => oa.departmentOptions.value)
const filteredEmployees = computed(() => {
  const needle = keyword.value.trim().toLowerCase()
  return oa.state.employees.filter((item) => {
    const matchedKeyword = !needle || item.name.toLowerCase().includes(needle) || item.jobNo.toLowerCase().includes(needle)
    const matchedDepartment = !departmentFilter.value || item.department === departmentFilter.value
    return matchedKeyword && matchedDepartment
  })
})

function openDepartment(row = null) {
  Object.assign(departmentForm, row || { id: '', name: '', manager: '', people: 0 })
  departmentDialogVisible.value = true
}

function openEmployee(row = null) {
  Object.assign(employeeForm, row || {
    id: '',
    name: '',
    jobNo: `EMP-${String(oa.state.employees.length + 1).padStart(4, '0')}`,
    department: departmentOptions.value[0]?.value || '',
    role: '普通员工',
    status: '在岗',
    phone: ''
  })
  employeeDialogVisible.value = true
}

async function saveDepartment() {
  const valid = await departmentFormRef.value?.validate().catch(() => false)
  if (!valid) return
  oa.upsertDepartment({ ...departmentForm })
  departmentDialogVisible.value = false
  ElMessage.success('部门信息已保存')
}

async function saveEmployee() {
  const valid = await employeeFormRef.value?.validate().catch(() => false)
  if (!valid) return
  const duplicated = oa.state.employees.some((item) => item.jobNo === employeeForm.jobNo && item.id !== employeeForm.id)
  if (duplicated) {
    ElMessage.warning('工号已存在，请更换后保存')
    return
  }
  oa.upsertEmployee({ ...employeeForm })
  employeeDialogVisible.value = false
  ElMessage.success('员工信息已保存')
}

async function removeDepartment(row) {
  if (oa.state.employees.some((item) => item.department === row.name)) {
    ElMessage.warning('该部门仍有关联员工，无法删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确认删除“${row.name}”吗？`, '删除部门', { type: 'warning' })
    oa.removeDepartment(row.id)
    ElMessage.success('部门已删除')
  } catch {
    // User cancelled the confirmation dialog.
  }
}

async function removeEmployee(row) {
  try {
    await ElMessageBox.confirm(`确认删除员工“${row.name}”吗？`, '删除员工', { type: 'warning' })
    oa.removeEmployee(row.id)
    ElMessage.success('员工已删除')
  } catch {
    // User cancelled the confirmation dialog.
  }
}
</script>
