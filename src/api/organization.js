import { useAuthStore } from '../stores/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function unwrap(body) {
  return body?.data ?? body?.result ?? body
}

async function parseBody(response) {
  const raw = await response.text()
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return { message: raw } }
}

function queryString(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  return search.size ? `?${search}` : ''
}

async function request(path, options = {}) {
  const auth = useAuthStore()
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (auth.state.token && !auth.state.token.startsWith('cookie-session-')) {
    headers.set('Authorization', `Bearer ${auth.state.token}`)
  }
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...options, headers })
  } catch {
    throw new Error('无法连接用户服务，请确认网关和用户服务已启动')
  }
  const body = await parseBody(response)
  if (response.status === 401) {
    auth.logout()
    window.dispatchEvent(new Event('auth-expired'))
    throw new Error('登录状态已过期，请重新登录')
  }
  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || body?.msg || `请求失败（${response.status}）`)
  }
  return unwrap(body)
}

function exportFileName(response, fallbackName) {
  const disposition = response.headers.get('Content-Disposition') || ''
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (utf8Name) {
    try { return decodeURIComponent(utf8Name) } catch { /* use fallback parser */ }
  }
  return disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName
}

async function downloadExport(path, fallbackName) {
  const auth = useAuthStore()
  const headers = new Headers()
  if (auth.state.token && !auth.state.token.startsWith('cookie-session-')) {
    headers.set('Authorization', `Bearer ${auth.state.token}`)
  }
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', headers })
  } catch {
    throw new Error('无法连接用户服务，请确认网关和用户服务已启动')
  }
  if (response.status === 401) {
    auth.logout()
    window.dispatchEvent(new Event('auth-expired'))
    throw new Error('登录状态已过期，请重新登录')
  }
  if (!response.ok) {
    const body = await parseBody(response)
    throw new Error(body?.message || body?.msg || `导出失败（${response.status}）`)
  }

  const blob = await response.blob()
  const fileName = exportFileName(response, fallbackName)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return fileName
}

export const listDepartments = () => request('/api/v1/departments')
export const exportDepartments = () => downloadExport('/api/v1/departments/export', '部门数据.xlsx')
export const createDepartment = (payload) => request('/api/v1/departments', { method: 'POST', body: JSON.stringify(payload) })
export const updateDepartment = (id, payload) => request(`/api/v1/departments/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
export const deleteDepartment = (id) => request(`/api/v1/departments/${id}`, { method: 'DELETE' })

export const listUsers = (params) => request(`/api/v1/users${queryString(params)}`)
export const exportUsers = (params = {}) => downloadExport(`/api/v1/users/export${queryString(params)}`, '员工数据.xlsx')
export const createUser = (payload) => request('/api/v1/users', { method: 'POST', body: JSON.stringify(payload) })
export const updateUser = (id, payload) => request(`/api/v1/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
export const deleteUser = (id) => request(`/api/v1/users/${id}`, { method: 'DELETE' })
export const updateUserSalary = (id, salary) => request(`/api/v1/users/${id}/salary`, { method: 'PUT', body: JSON.stringify({ salary }) })

export const listRoles = () => request('/api/v1/roles')
export const listPermissions = () => request('/api/v1/permissions')
