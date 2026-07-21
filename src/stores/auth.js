import { reactive, computed, readonly } from 'vue'
import { loadJSON, saveJSON } from '../utils/storage'

const AUTH_KEY = 'oa-auth'

const demoAccounts = [
  { username: 'admin', password: '123456', name: '系统管理员', role: '超级管理员', department: '信息中心', avatar: 'A' },
  { username: 'hr', password: '123456', name: '林雨晴', role: 'HR 人事', department: '人力资源部', avatar: 'H' },
  { username: 'manager', password: '123456', name: '周启明', role: '部门主管', department: '研发部', avatar: 'M' },
  { username: 'employee', password: '123456', name: '陈思远', role: '普通员工', department: '研发部', avatar: 'E' }
]

const state = reactive({
  token: '',
  profile: null
})

const saved = loadJSON(AUTH_KEY, null)
if (saved?.token && saved?.profile) {
  state.token = saved.token
  state.profile = saved.profile
}

function persist() {
  if (state.token && state.profile) {
    saveJSON(AUTH_KEY, { token: state.token, profile: state.profile })
  } else {
    localStorage.removeItem(AUTH_KEY)
  }
}

export function useAuthStore() {
  const isAuthed = computed(() => Boolean(state.token))
  const role = computed(() => state.profile?.role || '')

  function login(username, password) {
    const account = demoAccounts.find((item) => item.username === username && item.password === password)
    if (!account) {
      throw new Error('账号或密码错误')
    }
    state.token = `demo-${account.username}-${Date.now()}`
    state.profile = {
      id: account.username,
      name: account.name,
      role: account.role,
      department: account.department,
      avatar: account.avatar
    }
    persist()
    return state.profile
  }

  function logout() {
    state.token = ''
    state.profile = null
    persist()
  }

  return {
    state: readonly(state),
    isAuthed,
    role,
    login,
    logout,
    demoAccounts
  }
}
