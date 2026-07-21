import { useAuthStore } from '../stores/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const NOTICE_PATH = '/api/v1/notices'

function apiUrl(path) {
  return `${API_BASE_URL}${path}`
}

function unwrap(body) {
  return body?.data ?? body?.result ?? body
}

function getMessage(body, fallback) {
  return body?.message || body?.msg || body?.error || fallback
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

function isBusinessError(body) {
  if (body?.success === false) return true
  const code = Number(body?.code)
  return Number.isFinite(code) && code >= 400
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
    response = await fetch(apiUrl(path), {
      credentials: 'include',
      ...options,
      headers
    })
  } catch {
    throw new Error('无法连接公告服务，请确认后端已启动')
  }

  const body = await parseBody(response)
  if (response.status === 401) {
    auth.logout()
    window.dispatchEvent(new Event('auth-expired'))
    throw new Error('登录状态已过期，请重新登录')
  }
  if (!response.ok || isBusinessError(body)) {
    throw new Error(getMessage(body, `请求失败（${response.status}）`))
  }
  return unwrap(body)
}

function queryString(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}

export function createNotice(payload) {
  return request(NOTICE_PATH, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateNotice(id, payload) {
  return request(`${NOTICE_PATH}/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteNotice(id) {
  return request(`${NOTICE_PATH}/${id}`, { method: 'DELETE' })
}

export function publishNotice(id) {
  return request(`${NOTICE_PATH}/${id}/publish`, { method: 'POST' })
}

export function offlineNotice(id) {
  return request(`${NOTICE_PATH}/${id}/offline`, { method: 'POST' })
}

export function listManagedNotices(params) {
  return request(`${NOTICE_PATH}${queryString(params)}`)
}

export function getManagedNotice(id) {
  return request(`${NOTICE_PATH}/${id}`)
}

export function listPublicNotices(params) {
  return request(`${NOTICE_PATH}/public${queryString(params)}`)
}

export function getPublicNotice(id) {
  return request(`${NOTICE_PATH}/public/${id}`)
}

export function markNoticeRead(id) {
  return request(`${NOTICE_PATH}/${id}/read`, { method: 'POST' })
}

export function getUnreadNoticeCount() {
  return request(`${NOTICE_PATH}/public/unread-count`)
}
