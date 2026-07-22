import { useAuthStore } from '../stores/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const AI_PATH = '/api/v1/ai'

function unwrap(body) {
  return body?.data ?? body?.result ?? body
}

function getMessage(body, fallback) {
  return body?.message || body?.msg || body?.error || fallback
}

function isBusinessError(body) {
  if (body?.success === false) return true
  const code = Number(body?.code)
  return Number.isFinite(code) && code >= 400
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

function queryString(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const text = search.toString()
  return text ? `?${text}` : ''
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
    throw new Error('无法连接 AI 服务，请确认后端已启动')
  }

  const body = await parseBody(response)
  if (response.status === 401) {
    auth.logout()
    window.dispatchEvent(new Event('auth-expired'))
    throw new Error('登录状态已过期，请重新登录')
  }
  if (!response.ok || isBusinessError(body)) throw new Error(getMessage(body, `请求失败（${response.status}）`))
  return unwrap(body)
}

export function chatAi(payload) {
  return request(`${AI_PATH}/chats`, { method: 'POST', body: JSON.stringify(payload) })
}

export function getChatSessionPage(params = {}) {
  return request(`${AI_PATH}/chat-sessions${queryString(params)}`)
}

export function getChatSessionDetail(id) {
  return request(`${AI_PATH}/chat-sessions/${id}`)
}

export function archiveChatSession(id) {
  return request(`${AI_PATH}/chat-sessions/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ARCHIVED' }) })
}

export function deleteChatSession(id) {
  return request(`${AI_PATH}/chat-sessions/${id}`, { method: 'DELETE' })
}
