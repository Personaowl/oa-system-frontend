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

function streamTextFromPayload(payload) {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') return ''

  const candidates = [
    payload.answer,
    payload.delta,
    payload.content,
    payload.text,
    payload.data?.answer,
    payload.data?.delta,
    payload.data?.content,
    payload.data?.text,
    payload.choices?.[0]?.delta?.content,
    payload.choices?.[0]?.text
  ]
  return candidates.find((value) => typeof value === 'string') || ''
}

function streamMetaFromPayload(payload) {
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload
  return {
    sessionId: data?.sessionId ?? payload?.sessionId,
    citations: data?.citations || payload?.citations || []
  }
}

function mergeStreamAnswer(current, incoming) {
  if (!incoming) return current
  if (!current) return incoming
  if (incoming === current || current.endsWith(incoming)) return current
  if (incoming.startsWith(current)) return incoming
  return current + incoming
}

function parseStreamPayload(raw) {
  const text = String(raw || '').trim()
  if (!text || text === '[DONE]') return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function chatAiStream(payload, { onChunk, signal } = {}) {
  const auth = useAuthStore()
  const headers = new Headers({
    Accept: 'text/event-stream',
    'Content-Type': 'application/json'
  })
  if (auth.state.token && !auth.state.token.startsWith('cookie-session-')) {
    headers.set('Authorization', `Bearer ${auth.state.token}`)
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${AI_PATH}/chats/stream`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ ...payload, stream: true }),
      signal
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new Error('AI 流式请求失败,请确认后端服务已启动')
  }

  if (response.status === 401) {
    auth.logout()
    window.dispatchEvent(new Event('auth-expired'))
    throw new Error('登录状态已过期，请重新登录')
  }
  if (!response.ok) {
    const body = await parseBody(response)
    throw new Error(getMessage(body, `?????${response.status}?`))
  }
  if (!response.body) throw new Error('AI 服务未返回可读取的流式响应')

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let answer = ''
  let sessionId = null
  let citations = []
  let lastPayload = null

  // Do not immediately continue parsing the next SSE frame after updating Vue.
  // A rAF callback resolves before the browser paints, so add a macrotask after
  // it to give the DOM an actual paint opportunity when several frames arrive
  // in the same fetch read (which is common behind gateways/proxies).
  const waitForRender = () => new Promise((resolve) => {
    const defer = () => setTimeout(resolve, 0)
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(defer)
    else defer()
  })

  const consumeEvent = async (raw) => {
    const parsed = parseStreamPayload(raw)
    if (parsed === null) return

    lastPayload = parsed
    const normalized = parsed && typeof parsed === 'object' ? unwrap(parsed) : parsed
    const meta = streamMetaFromPayload(parsed && typeof parsed === 'object' ? parsed : {})
    if (meta.sessionId !== undefined && meta.sessionId !== null) sessionId = meta.sessionId
    if (meta.citations?.length) citations = meta.citations

    const chunk = streamTextFromPayload(normalized)
    if (!chunk) return
    answer = mergeStreamAnswer(answer, chunk)
    await onChunk?.({ text: chunk, answer, payload: parsed })
    await waitForRender()
  }

  const findJsonEnd = (text, start) => {
    let depth = 0
    let inString = false
    let escaped = false
    for (let index = start; index < text.length; index += 1) {
      const char = text[index]
      if (inString) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') inString = false
        continue
      }
      if (char === '"') {
        inString = true
      } else if (char === '{') {
        depth += 1
      } else if (char === '}') {
        depth -= 1
        if (depth === 0) return index + 1
      }
    }
    return -1
  }

  const consumeBuffer = async (flush = false) => {
    const text = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    let cursor = 0

    while (cursor < text.length) {
      const marker = text.indexOf('data:', cursor)
      if (marker < 0) {
        if (cursor === 0 && flush && text.trim()) await consumeEvent(text.trim())
        buffer = flush ? '' : text.slice(cursor)
        return
      }

      const valueStart = marker + 5
      let start = valueStart
      while (start < text.length && /[ \t]/.test(text[start])) start += 1

      if (text[start] === '{') {
        const end = findJsonEnd(text, start)
        if (end < 0) {
          buffer = text.slice(marker)
          return
        }
        await consumeEvent(text.slice(start, end))
        cursor = end
        continue
      }

      const nextMarker = text.indexOf('data:', start)
      if (nextMarker < 0 && !flush) {
        buffer = text.slice(marker)
        return
      }
      const end = nextMarker < 0 ? text.length : nextMarker
      await consumeEvent(text.slice(start, end).trim())
      cursor = end
    }

    buffer = ''
  }

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    await consumeBuffer(done)
    if (done) break
  }

  return { sessionId, answer, citations, payload: lastPayload }
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
