import { useAuthStore } from '../stores/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const BASE_PATH = '/api/v1/ai/knowledge-docs'
const USER_ID_HEADER = 'X-User-Id'

function unwrap(body) {
  return body?.data ?? body?.result ?? body
}

function message(body, fallback) {
  return body?.message || body?.msg || body?.error || fallback
}

function failed(body) {
  const code = Number(body?.code)
  return body?.success === false || (Number.isFinite(code) && code >= 400)
}

function query(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  return search.size ? `?${search}` : ''
}

async function request(path, options = {}) {
  const auth = useAuthStore()
  const headers = new Headers(options.headers)

  // The upload endpoint consumes multipart/form-data. Let the browser set its
  // boundary instead of forcing an incorrect JSON content type.
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (auth.state.token && !auth.state.token.startsWith('cookie-session-')) {
    headers.set('Authorization', `Bearer ${auth.state.token}`)
  }

  // The controller accepts X-User-Id for audit fields. Only send it when the
  // profile id is numeric because Spring binds this header to Long.
  const userId = auth.state.profile?.id
  if (userId !== undefined && userId !== null && /^\d+$/.test(String(userId))) {
    headers.set(USER_ID_HEADER, String(userId))
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...options, headers })
  } catch {
    throw new Error('无法连接 AI 服务，请确认后端已启动')
  }

  const raw = await response.text()
  let body = null
  try {
    body = raw ? JSON.parse(raw) : null
  } catch {
    body = { message: raw }
  }

  if (response.status === 401) {
    auth.logout()
    window.dispatchEvent(new Event('auth-expired'))
    throw new Error('登录状态已过期，请重新登录')
  }
  if (!response.ok || failed(body)) {
    throw new Error(message(body, `请求失败（${response.status}）`))
  }

  return unwrap(body)
}

export function createKnowledgeDoc(formData) {
  return request(BASE_PATH, { method: 'POST', body: formData })
}

export function getKnowledgeDocPage(params = {}) {
  return request(`${BASE_PATH}${query(params)}`)
}

export function getKnowledgeDocDetail(id) {
  return request(`${BASE_PATH}/${id}`)
}

export function updateKnowledgeDoc(id, payload) {
  return request(`${BASE_PATH}/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

// The backend declares remark as @RequestParam, not a JSON request body.
export function approveKnowledgeDoc(id, remark = '') {
  return request(`${BASE_PATH}/${id}/approve${query({ remark })}`, { method: 'POST' })
}

export function reindexKnowledgeDoc(id) {
  return request(`${BASE_PATH}/${id}/reindex`, { method: 'POST' })
}

export function retireKnowledgeDoc(id) {
  return request(`${BASE_PATH}/${id}/retire`, { method: 'POST' })
}

export function deleteKnowledgeDoc(id) {
  return request(`${BASE_PATH}/${id}`, { method: 'DELETE' })
}

export function getKnowledgeDocChunks(id, params = {}) {
  return request(`${BASE_PATH}/${id}/chunks${query(params)}`)
}
