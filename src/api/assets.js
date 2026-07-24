import { useAuthStore } from '../stores/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

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
  if (auth.state.token && !auth.state.token.startsWith('cookie-session-')) headers.set('Authorization', `Bearer ${auth.state.token}`)
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...options, headers })
  } catch {
    throw new Error('无法连接资产服务，请确认网关和 asset-service 已启动')
  }
  const raw = await response.text()
  let body = null
  try { body = raw ? JSON.parse(raw) : null } catch { body = { message: raw } }
  if (response.status === 401) {
    auth.logout()
    window.dispatchEvent(new Event('auth-expired'))
    throw new Error('登录状态已过期，请重新登录')
  }
  if (!response.ok || (body?.code && body.code !== '0')) throw new Error(body?.message || `请求失败（${response.status}）`)
  return body?.data ?? body?.result ?? body
}

const json = (method, payload) => ({ method, body: JSON.stringify(payload) })

export const getAssetOverview = () => request('/api/v1/assets/overview')
export const listSupplies = (params = {}) => request(`/api/v1/assets/supplies${queryString(params)}`)
export const createSupply = (payload) => request('/api/v1/assets/supplies', json('POST', payload))
export const updateSupply = (id, payload) => request(`/api/v1/assets/supplies/${id}`, json('PUT', payload))
export const applySupply = (payload) => request('/api/v1/assets/supply-requests', json('POST', payload))
export const listMySupplyRequests = () => request('/api/v1/assets/supply-requests/mine')
export const listReviewableSupplyRequests = (pendingOnly = false) => request(`/api/v1/assets/supply-requests/reviewable${queryString({ pendingOnly })}`)
export const reviewSupplyRequest = (id, payload) => request(`/api/v1/assets/supply-requests/${id}/review`, json('POST', payload))
export const issueSupplyRequest = (id) => request(`/api/v1/assets/supply-requests/${id}/issue`, { method: 'POST' })
export const cancelSupplyRequest = (id) => request(`/api/v1/assets/supply-requests/${id}/cancel`, { method: 'POST' })
export const listFixedAssets = (params = {}) => request(`/api/v1/assets/fixed-assets${queryString(params)}`)
export const createFixedAsset = (payload) => request('/api/v1/assets/fixed-assets', json('POST', payload))
export const updateFixedAsset = (id, payload) => request(`/api/v1/assets/fixed-assets/${id}`, json('PUT', payload))
export const assignFixedAsset = (id, payload) => request(`/api/v1/assets/fixed-assets/${id}/assign`, json('POST', payload))
export const returnFixedAsset = (id, payload) => request(`/api/v1/assets/fixed-assets/${id}/return`, json('POST', payload))
export const deleteFixedAsset = (id) => request(`/api/v1/assets/fixed-assets/${id}`, { method: 'DELETE' })
