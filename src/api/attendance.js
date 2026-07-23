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
  if (auth.state.token && !auth.state.token.startsWith('cookie-session-')) {
    headers.set('Authorization', `Bearer ${auth.state.token}`)
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...options, headers })
  } catch {
    throw new Error('无法连接考勤服务，请确认网关和考勤服务已启动')
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

export const checkIn = () => request('/api/v1/attendance/check-in', { method: 'POST' })
export const checkOut = () => request('/api/v1/attendance/check-out', { method: 'POST' })
export const getTodayStatus = () => request('/api/v1/attendance/today')
export const getAttendanceScope = () => request('/api/v1/attendance/scope')
export const listAttendanceRecords = (params) => request(`/api/v1/attendance/records${queryString(params)}`)
export async function listAllAttendanceRecords(params = {}) {
  const first = await listAttendanceRecords({ ...params, page: 1, size: 100 })
  const items = [...(first?.items || [])]
  const total = Number(first?.total || items.length)
  const pageCount = Math.ceil(total / 100)
  if (pageCount > 1) {
    const pages = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) =>
        listAttendanceRecords({ ...params, page: index + 2, size: 100 }))
    )
    pages.forEach((page) => items.push(...(page?.items || [])))
  }
  return { ...first, items, total }
}
export const getMonthlyStatistics = (month) => request(`/api/v1/attendance/statistics/monthly${queryString({ month })}`)
export const getAttendanceSummary = (params) => request(`/api/v1/attendance/statistics/summary${queryString(params)}`)
export const getAttendanceRule = () => request('/api/v1/attendance/rules/current')
export const updateAttendanceRule = (payload) => request('/api/v1/attendance/rules/current', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
export const createAttendanceCorrection = (payload) => request('/api/v1/attendance/corrections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
export const listMyAttendanceCorrections = () => request('/api/v1/attendance/corrections/mine')
export const listPendingAttendanceCorrections = () => request('/api/v1/attendance/corrections/pending')
export const reviewAttendanceCorrection = (id, payload) => request(`/api/v1/attendance/corrections/${id}/review`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
export const getTodayWorkSchedule = () => request('/api/v1/attendance/schedules/today')
export const listCalendarOverrides = (params) => request(`/api/v1/attendance/schedules/calendar${queryString(params)}`)
export const updateCalendarOverride = (workDate, payload) => request(`/api/v1/attendance/schedules/calendar/${workDate}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
export const deleteCalendarOverride = (workDate) => request(`/api/v1/attendance/schedules/calendar/${workDate}`, { method: 'DELETE' })
export const listAttendanceShifts = () => request('/api/v1/attendance/schedules/shifts')
export const createAttendanceShift = (payload) => request('/api/v1/attendance/schedules/shifts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
export const updateAttendanceShift = (id, payload) => request(`/api/v1/attendance/schedules/shifts/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
export const listShiftAssignments = () => request('/api/v1/attendance/schedules/assignments')
export const createShiftAssignment = (payload) => request('/api/v1/attendance/schedules/assignments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
export const deleteShiftAssignment = (id) => request(`/api/v1/attendance/schedules/assignments/${id}`, { method: 'DELETE' })
