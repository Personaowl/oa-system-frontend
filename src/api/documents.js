import { useAuthStore } from '../stores/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function unwrap(body) {
  return body?.data ?? body?.result ?? body
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
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
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
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers
    })
  } catch {
    throw new Error('无法连接文档服务，请确认网关和 document-service 已启动')
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

export const listDocumentWorkspaces = () =>
  request('/api/v1/document-workspaces')

export const listSharedDocuments = (params = {}) =>
  request(`/api/v1/documents${queryString(params)}`)

export const getSharedDocument = (id) =>
  request(`/api/v1/documents/${id}`)

export const createSharedDocument = (payload) =>
  request('/api/v1/documents', {
    method: 'POST',
    body: JSON.stringify(payload)
  })

export const updateSharedDocument = (id, payload) =>
  request(`/api/v1/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })

export const deleteSharedDocument = (id) =>
  request(`/api/v1/documents/${id}`, { method: 'DELETE' })
