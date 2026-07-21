import { computed, reactive, readonly } from 'vue'
import { loadJSON, saveJSON } from '../utils/storage'

const AUTH_KEY = 'oa-auth'
const AVATAR_KEY = 'oa-avatar-by-username'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const LOGIN_PATH = '/api/v1/auth/login'
const REGISTER_PATH = '/api/v1/auth/register'
const CURRENT_USER_PATH = '/api/v1/users/me'
const ACCOUNT_PATH = '/api/v1/users/me/account'

const roleMap = {
  ADMIN: '超级管理员',
  ROLE_ADMIN: '超级管理员',
  SUPER_ADMIN: '超级管理员',
  HR: 'HR 人事',
  ROLE_HR: 'HR 人事',
  MANAGER: '部门主管',
  ROLE_MANAGER: '部门主管',
  EMPLOYEE: '普通员工',
  ROLE_EMPLOYEE: '普通员工'
}

const state = reactive({
  token: '',
  profile: null
})

const avatarsByUsername = loadJSON(AVATAR_KEY, {}) || {}

const saved = loadJSON(AUTH_KEY, null)
if (saved?.token && saved?.profile && !String(saved.token).startsWith('demo-')) {
  state.token = saved.token
  state.profile = saved.profile
} else if (saved) {
  localStorage.removeItem(AUTH_KEY)
}

function persist() {
  if (state.token && state.profile) {
    saveJSON(AUTH_KEY, { token: state.token, profile: state.profile })
  } else {
    localStorage.removeItem(AUTH_KEY)
  }
}

function persistAvatars() {
  saveJSON(AVATAR_KEY, avatarsByUsername)
}

function defaultAvatar(name) {
  return String(name).trim().slice(0, 1).toUpperCase() || 'U'
}

function apiUrl(path) {
  return `${API_BASE_URL}${path}`
}

async function parseBody(response) {
  const raw = await response.text()
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return { message: raw }
  }
}

function getMessage(body, fallback) {
  return body?.message || body?.msg || body?.error || fallback
}

function unwrap(body) {
  return body?.data ?? body?.result ?? body
}

function hasBusinessError(body) {
  if (body?.success === false) return true
  const code = Number(body?.code)
  return Number.isFinite(code) && code >= 400
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(apiUrl(path), {
      credentials: 'include',
      ...options
    })
  } catch {
    throw new Error('无法连接认证服务，请确认后端已启动')
  }

  const body = await parseBody(response)
  if (response.status === 401 && path !== LOGIN_PATH && path !== REGISTER_PATH) {
    logout()
    window.dispatchEvent(new Event('auth-expired'))
    throw new Error('登录状态已过期，请重新登录')
  }
  if (!response.ok || hasBusinessError(body)) {
    throw new Error(getMessage(body, `请求失败（${response.status}）`))
  }

  return { body, response }
}

function normalizeToken(value) {
  if (!value) return ''
  return String(value).replace(/^Bearer\s+/i, '')
}

function extractToken(payload, response) {
  const headerToken = response.headers.get('authorization') || response.headers.get('x-access-token')
  const rawToken = payload?.accessToken
    ?? payload?.access_token
    ?? payload?.token
    ?? payload?.jwt
    ?? payload?.authorization
    ?? headerToken
    ?? (typeof payload === 'string' ? payload : '')
  return normalizeToken(rawToken)
}

function asText(value) {
  if (!value) return ''
  if (typeof value === 'object') return value.name || value.label || value.title || value.code || ''
  return String(value)
}

function resolveRole(profile) {
  const rawRole = profile.roleName ?? profile.roleCode ?? profile.role ?? profile.roles ?? profile.authorities ?? ''
  const role = Array.isArray(rawRole) ? rawRole[0] : rawRole
  const code = asText(role)
  return roleMap[code.toUpperCase()] || code || '普通员工'
}

function normalizeProfile(source, username) {
  const profile = source?.user ?? source?.profile ?? source ?? {}
  const accountUsername = profile.username || profile.account || username
  const name = profile.name || profile.realName || profile.nickname || profile.username || profile.account || username
  const department = asText(
    profile.departmentName
      ?? profile.deptName
      ?? profile.department
      ?? profile.dept
      ?? profile.org
      ?? profile.organization
  ) || '未分配部门'

  return {
    id: profile.id ?? profile.userId ?? profile.uid ?? username,
    username: accountUsername,
    name,
    role: resolveRole(profile),
    department,
    avatar: avatarsByUsername[accountUsername] || defaultAvatar(name)
  }
}

export function useAuthStore() {
  const isAuthed = computed(() => Boolean(state.token))
  const role = computed(() => state.profile?.role || '')

  async function login(username, password) {
    const { body: loginBody, response: loginResponse } = await request(LOGIN_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })

    const token = extractToken(unwrap(loginBody), loginResponse)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const { body: userBody } = await request(CURRENT_USER_PATH, { headers })

    state.token = token || `cookie-session-${Date.now()}`
    state.profile = normalizeProfile(unwrap(userBody), username)
    persist()
    return state.profile
  }

  async function register(username, password) {
    await request(REGISTER_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
  }

  async function updateAccount({ username, currentPassword, newPassword }) {
    const previousUsername = state.profile?.username
    const payload = { currentPassword }
    if (username?.trim()) payload.username = username.trim()
    if (newPassword) payload.newPassword = newPassword

    const { body } = await request(ACCOUNT_PATH, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    })

    const updated = unwrap(body)
    const nextUsername = updated?.username || payload.username || state.profile?.username
    if (previousUsername && nextUsername && previousUsername !== nextUsername && avatarsByUsername[previousUsername]) {
      avatarsByUsername[nextUsername] = avatarsByUsername[previousUsername]
      delete avatarsByUsername[previousUsername]
      persistAvatars()
    }
    await login(nextUsername, newPassword || currentPassword)
    return state.profile
  }

  function setAvatar(avatar) {
    const username = state.profile?.username
    if (!username || !state.profile) return

    if (avatar) {
      avatarsByUsername[username] = avatar
    } else {
      delete avatarsByUsername[username]
    }
    state.profile.avatar = avatar || defaultAvatar(state.profile.name)
    persistAvatars()
    persist()
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
    register,
    updateAccount,
    setAvatar,
    logout
  }
}
