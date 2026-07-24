<template>
  <div class="content-grid rbac-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">角色权限</h1>
        <p class="page-subtitle">按业务需要创建角色并组合权限，用户重新登录后授权生效。</p>
      </div>
      <div class="tool-row">
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
        <el-button v-if="canCreate" type="primary" :icon="Plus" @click="openEditor()">新增角色</el-button>
      </div>
    </div>

    <div class="rbac-summary">
      <article><span>角色数量</span><strong>{{ roles.length }}</strong><small>包含启用与停用角色</small></article>
      <article><span>启用角色</span><strong>{{ enabledRoleCount }}</strong><small>可分配给员工</small></article>
      <article><span>系统权限</span><strong>{{ permissions.length }}</strong><small>由后端接口定义</small></article>
    </div>

    <section class="panel section">
      <SectionTitle title="角色列表" subtitle="角色本身不写入业务代码，实际能力由下方勾选的权限组合决定。" />
      <el-table v-loading="loading" :data="roleMatrix" border>
        <el-table-column label="角色" min-width="190">
          <template #default="{ row }">
            <div class="role-cell"><span class="role-mark"></span><div><strong>{{ row.name }}</strong><small>{{ row.code }}</small></div></div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="已分配权限" min-width="430">
          <template #default="{ row }">
            <div v-if="row.permissionItems.length" class="permission-preview">
              <el-tag v-for="permission in row.permissionItems.slice(0, 8)" :key="permission.id" effect="light" round>{{ permission.name }}</el-tag>
              <el-tag v-if="row.permissionItems.length > 8" type="info" effect="plain" round>+{{ row.permissionItems.length - 8 }}</el-tag>
            </div>
            <span v-else class="empty-text">暂未分配权限</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canAssign" link type="primary" @click="openPermissionEditor(row)">授权</el-button>
            <el-button v-if="canUpdate" link type="primary" @click="openEditor(row)">编辑</el-button>
            <el-button v-if="canDelete" link type="danger" @click="removeRole(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="roleDialogVisible" :title="roleForm.id ? '编辑角色' : '新增角色'" width="500px" destroy-on-close>
      <el-form ref="roleFormRef" :model="roleForm" :rules="roleRules" label-position="top">
        <el-form-item label="角色名称" prop="name"><el-input v-model="roleForm.name" maxlength="64" placeholder="例如：财务专员" /></el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="roleForm.code" maxlength="64" placeholder="例如：FINANCE_SPECIALIST" />
          <div class="form-help">使用字母开头，可包含数字、下划线和短横线；保存后统一转为大写。</div>
        </el-form-item>
        <el-form-item label="状态"><el-switch v-model="roleForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRole">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="permissionDialogVisible" title="分配角色权限" width="min(900px, 94vw)" destroy-on-close>
      <div class="permission-role">
        <div><strong>{{ selectedRole?.name }}</strong><span>{{ selectedRole?.code }}</span></div>
        <el-tag>{{ selectedPermissionIds.length }} 项权限</el-tag>
      </div>
      <div class="permission-toolbar">
        <el-input v-model="permissionKeyword" clearable placeholder="搜索权限名称或编码" />
        <el-button @click="selectVisiblePermissions">选择当前结果</el-button>
        <el-button @click="selectedPermissionIds = []">清空</el-button>
      </div>
      <el-scrollbar max-height="480px" class="permission-groups">
        <section v-for="group in filteredPermissionGroups" :key="group.key" class="permission-group">
          <header><strong>{{ group.label }}</strong><span>{{ group.items.length }} 项</span></header>
          <el-checkbox-group v-model="selectedPermissionIds" class="permission-checks">
            <el-checkbox
              v-for="permission in group.items"
              :key="permission.id"
              :value="String(permission.id)"
              @change="(checked) => handlePermissionToggle(permission, checked)"
            >
              <span class="permission-option"><strong>{{ permission.name }}</strong><small>{{ permission.code }}</small></span>
            </el-checkbox>
          </el-checkbox-group>
        </section>
      </el-scrollbar>
      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="savePermissions">保存授权</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { assignRolePermissions, createRole, deleteRole, listPermissions, listRoles, updateRole } from '../api/organization'
import SectionTitle from '../components/SectionTitle.vue'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const roles = ref([])
const permissions = ref([])
const roleDialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const roleFormRef = ref()
const roleForm = reactive({ id: '', name: '', code: '', enabled: true })
const selectedRole = ref(null)
const selectedPermissionIds = ref([])
const permissionKeyword = ref('')

const canCreate = computed(() => auth.hasPermission('sys:role:create'))
const canUpdate = computed(() => auth.hasPermission('sys:role:update'))
const canDelete = computed(() => auth.hasPermission('sys:role:delete'))
const canAssign = computed(() => auth.hasPermission('sys:role:assign-permission') && auth.hasPermission('sys:permission:list'))
const enabledRoleCount = computed(() => roles.value.filter((item) => item.status === 1).length)
const roleMatrix = computed(() => {
  const permissionMap = new Map(permissions.value.map((item) => [String(item.id), item]))
  return roles.value.map((role) => ({
    ...role,
    permissionItems: (role.permissionIds || []).map((id) => permissionMap.get(String(id))).filter(Boolean)
  }))
})
const permissionGroups = computed(() => {
  const labels = { sys: '组织与权限', data: '数据范围', attendance: '考勤管理', flow: '审批流程', notice: '公告通知', ai: 'AI 助手', user: '用户基础', system: '系统权限' }
  const groups = new Map()
  permissions.value.forEach((item) => {
    const key = String(item.code || 'other').split(':')[0]
    if (!groups.has(key)) groups.set(key, { key, label: labels[key] || '其他权限', items: [] })
    groups.get(key).items.push(item)
  })
  return [...groups.values()]
})
const filteredPermissionGroups = computed(() => {
  const needle = permissionKeyword.value.trim().toLowerCase()
  if (!needle) return permissionGroups.value
  return permissionGroups.value
    .map((group) => ({ ...group, items: group.items.filter((item) =>
      String(item.name || '').toLowerCase().includes(needle) || String(item.code || '').toLowerCase().includes(needle)) }))
    .filter((group) => group.items.length)
})
const roleRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[A-Za-z][A-Za-z0-9_-]*$/, message: '编码需以字母开头，只能包含字母、数字、下划线和短横线', trigger: 'blur' }
  ]
}

async function loadAll() {
  loading.value = true
  try {
    const [roleRows, permissionRows] = await Promise.all([
      listRoles(),
      auth.hasPermission('sys:permission:list') ? listPermissions() : Promise.resolve([])
    ])
    roles.value = roleRows || []
    permissions.value = permissionRows || []
  } catch (error) {
    ElMessage.error(error.message || '角色权限加载失败')
  } finally {
    loading.value = false
  }
}

function openEditor(role = null) {
  Object.assign(roleForm, role
    ? { id: role.id, name: role.name, code: role.code, enabled: role.status === 1 }
    : { id: '', name: '', code: '', enabled: true })
  roleDialogVisible.value = true
}

async function saveRole() {
  if (!(await roleFormRef.value?.validate().catch(() => false))) return
  saving.value = true
  try {
    const payload = { name: roleForm.name.trim(), code: roleForm.code.trim().toUpperCase(), status: roleForm.enabled ? 1 : 0 }
    if (roleForm.id) await updateRole(roleForm.id, payload)
    else await createRole(payload)
    roleDialogVisible.value = false
    ElMessage.success('角色已保存')
    await loadAll()
  } catch (error) {
    ElMessage.error(error.message || '角色保存失败')
  } finally {
    saving.value = false
  }
}

function openPermissionEditor(role) {
  selectedRole.value = role
  selectedPermissionIds.value = (role.permissionIds || []).map(String)
  permissionKeyword.value = ''
  permissionDialogVisible.value = true
}

function handlePermissionToggle(permission, checked) {
  if (!checked || !permission.code?.startsWith('data:scope:')) return
  const currentPermissionId = String(permission.id)
  const dataScopePermissionIds = new Set(
    permissions.value
      .filter((item) => item.code?.startsWith('data:scope:'))
      .map((item) => String(item.id))
  )
  selectedPermissionIds.value = selectedPermissionIds.value.filter(
    (permissionId) =>
      !dataScopePermissionIds.has(String(permissionId)) ||
      String(permissionId) === currentPermissionId
  )
}

function selectVisiblePermissions() {
  const selectedDataScopeId = selectedPermissionIds.value.find((permissionId) =>
    permissions.value.some((item) =>
      String(item.id) === String(permissionId) && item.code?.startsWith('data:scope:')
    )
  )
  selectedPermissionIds.value = [...new Set([
    ...selectedPermissionIds.value,
    ...filteredPermissionGroups.value.flatMap((group) =>
      group.items
        .filter((item) => !item.code?.startsWith('data:scope:') || String(item.id) === selectedDataScopeId)
        .map((item) => String(item.id))
    )
  ])]
}

async function savePermissions() {
  saving.value = true
  try {
    await assignRolePermissions(selectedRole.value.id, selectedPermissionIds.value.map(Number))
    permissionDialogVisible.value = false
    ElMessage.success('角色权限已更新，相关用户重新登录后生效')
    await loadAll()
  } catch (error) {
    ElMessage.error(error.message || '权限保存失败')
  } finally {
    saving.value = false
  }
}

async function removeRole(role) {
  try {
    await ElMessageBox.confirm(`确认删除角色“${role.name}”吗？已分配给员工的角色不能删除。`, '删除角色', { type: 'warning' })
    await deleteRole(role.id)
    ElMessage.success('角色已删除')
    await loadAll()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '角色删除失败')
  }
}

onMounted(loadAll)
</script>

<style scoped>
.rbac-summary { display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); gap: 14px; }
.rbac-summary article { padding: 18px 20px; border: 1px solid #dfe8f7; border-radius: 18px; background: linear-gradient(145deg, #f4f7ff, #fff); box-shadow: 0 10px 28px rgba(56, 75, 118, .07); }
.rbac-summary span, .rbac-summary small { display: block; color: var(--muted); }
.rbac-summary strong { display: block; margin: 8px 0 4px; color: #315fd6; font-size: 28px; }
.role-cell { display: flex; align-items: center; gap: 11px; }
.role-cell strong, .role-cell small { display: block; }
.role-cell small { margin-top: 3px; color: var(--muted); }
.role-mark { width: 10px; height: 36px; border-radius: 8px; background: linear-gradient(#5d84ef, #8a6ee9); }
.permission-preview { display: flex; flex-wrap: wrap; gap: 6px; }
.empty-text { color: var(--muted); }
.form-help { margin-top: 6px; color: var(--muted); font-size: 12px; }
.permission-role, .permission-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.permission-role { padding: 14px 16px; border-radius: 14px; background: #f2f6ff; }
.permission-role strong, .permission-role span { display: block; }
.permission-role span { margin-top: 3px; color: var(--muted); font-size: 12px; }
.permission-toolbar { margin: 14px 0; justify-content: flex-end; }
.permission-toolbar .el-input { width: 280px; margin-right: auto; }
.permission-groups { padding-right: 8px; }
.permission-group { margin-bottom: 12px; padding: 15px; border: 1px solid var(--line); border-radius: 14px; }
.permission-group header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.permission-group header span { color: var(--muted); font-size: 12px; }
.permission-checks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px 12px; }
.permission-checks .el-checkbox { height: auto; min-height: 42px; margin: 0; padding: 8px; border-radius: 10px; background: #f8fafc; }
.permission-option strong, .permission-option small { display: block; white-space: normal; }
.permission-option small { margin-top: 2px; color: var(--muted); font-size: 11px; }
@media (max-width: 760px) {
  .rbac-summary, .permission-checks { grid-template-columns: 1fr; }
  .permission-toolbar { flex-wrap: wrap; }
  .permission-toolbar .el-input { width: 100%; }
}
</style>
