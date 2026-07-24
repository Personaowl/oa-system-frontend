import { useAuthStore } from '../stores/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const BASE_PATH = '/api/v1/ai/chat-logs'

function unwrap(body) { return body?.data ?? body?.result ?? body }
function message(body, fallback) { return body?.message || body?.msg || body?.error || fallback }
function failed(body) { const code = Number(body?.code); return body?.success === false || (Number.isFinite(code) && code >= 400) }
function query(params = {}) { const search = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') search.set(key, String(value)) }); return search.size ? `?${search}` : '' }

async function request(path) {
  const auth = useAuthStore()
  const headers = new Headers()
  if (auth.state.token && !auth.state.token.startsWith('cookie-session-')) headers.set('Authorization', `Bearer ${auth.state.token}`)
  let response
  try { response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', headers }) } catch { throw new Error('无法连接 AI 服务，请确认后端已启动') }
  const raw = await response.text()
  let body = null
  try { body = raw ? JSON.parse(raw) : null } catch { body = { message: raw } }
  if (response.status === 401) { auth.logout(); window.dispatchEvent(new Event('auth-expired')); throw new Error('登录状态已过期，请重新登录') }
  if (!response.ok || failed(body)) throw new Error(message(body, `请求失败（${response.status}）`))
  return unwrap(body)
}

export function getChatLogPage(params = {}) { return request(`${BASE_PATH}${query(params)}`) }
export function getChatLogDetail(id) { return request(`${BASE_PATH}/${id}`) }
