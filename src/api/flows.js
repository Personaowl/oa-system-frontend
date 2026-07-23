import { useAuthStore } from '../stores/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const FLOW_PATH = '/api/v1/flows'

function queryString(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}

function unwrap(body) {
  return body?.data ?? body?.result ?? body
}

async function parseBody(response) {
  const raw = await response.text()
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return { message: raw } }
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
    throw new Error('无法连接审批服务，请确认网关和审批服务已启动')
  }

  const body = await parseBody(response)
  if (response.status === 401) {
    auth.logout()
    window.dispatchEvent(new Event('auth-expired'))
    throw new Error('登录状态已过期，请重新登录')
  }
  if (!response.ok || (body?.code !== undefined && String(body.code) !== '0')) {
    throw new Error(body?.message || body?.msg || `请求失败（${response.status}）`)
  }
  return unwrap(body)
}

export const listMyFlowRequests = () => request(`${FLOW_PATH}/requests/mine`)
export const listFlowApprovers = () => request(`${FLOW_PATH}/approvers`)
export const listTodoFlowTasks = () => request(`${FLOW_PATH}/tasks/todo`)
export const listDoneFlowTasks = () => request(`${FLOW_PATH}/tasks/done`)
export const getFlowRequest = (id) => request(`${FLOW_PATH}/requests/${id}`)
export const searchFlowRequests = (params) => request(`${FLOW_PATH}/search${queryString(params)}`)
export const rebuildFlowSearchIndex = () => request(`${FLOW_PATH}/search/reindex`, { method: 'POST' })

export const submitLeaveRequest = (payload) => request(`${FLOW_PATH}/leave-requests`, {
  method: 'POST',
  body: JSON.stringify(payload)
})

export const submitOvertimeRequest = (payload) => request(`${FLOW_PATH}/overtime-requests`, {
  method: 'POST',
  body: JSON.stringify(payload)
})

export const reviewFlowTask = (id, payload) => request(`${FLOW_PATH}/tasks/${id}/approve`, {
  method: 'POST',
  body: JSON.stringify(payload)
})
