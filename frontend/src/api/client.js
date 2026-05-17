// SkillDNA API client.
//
// Wraps the FastAPI bridge defined in `api/main.py`. All URLs are relative
// and resolved by the Vite dev-server proxy (vite.config.js) in development,
// or by being served from the same origin in production.

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function _json(resp) {
  const ct = resp.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    const text = await resp.text()
    throw new Error(`Expected JSON, got: ${text.slice(0, 200)}`)
  }
  return resp.json()
}

// -- One-shot endpoints -------------------------------------------------------

export async function fetchTrending(n = 10) {
  const r = await fetch(`/trending?n=${n}`)
  if (!r.ok) throw new Error(`/trending failed (${r.status})`)
  return _json(r)
}

export async function fetchMissedOpportunities(n = 4) {
  const r = await fetch(`/missed-opportunities?n=${n}`)
  if (!r.ok) throw new Error(`/missed-opportunities failed (${r.status})`)
  return _json(r)
}

export async function uploadResume(file) {
  const fd = new FormData()
  fd.append('resume', file)
  const r = await fetch('/analyze', { method: 'POST', body: fd })
  if (!r.ok) {
    let detail = `/analyze failed (${r.status})`
    try {
      const j = await r.json()
      if (j && j.detail) detail = `${detail}: ${j.detail}`
    } catch {}
    throw new Error(detail)
  }
  return _json(r)
}

export async function fetchPayload(sessionId) {
  const r = await fetch(`/payload/${encodeURIComponent(sessionId)}`)
  if (r.status === 202) {
    const body = await _json(r)
    return { ready: false, ...body }
  }
  if (!r.ok) throw new Error(`/payload failed (${r.status})`)
  const payload = await _json(r)
  return { ready: true, payload }
}

export async function sendChat(sessionId, question) {
  const r = await fetch(`/chat/${encodeURIComponent(sessionId)}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ question }),
  })
  if (!r.ok) {
    let detail = `/chat failed (${r.status})`
    try {
      const j = await r.json()
      if (j && j.detail) detail = `${detail}: ${j.detail}`
    } catch {}
    throw new Error(detail)
  }
  return _json(r)
}

// -- SSE event stream ---------------------------------------------------------

/**
 * Subscribe to a pipeline run's events. Returns a function that closes
 * the underlying EventSource. The `onEvent` callback receives parsed
 * tracker Event objects.
 *
 * @param {string} sessionId
 * @param {(event: object) => void} onEvent
 * @param {() => void} [onClose]
 * @param {(err: any) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeToEvents(sessionId, onEvent, onClose, onError) {
  const es = new EventSource(`/events/${encodeURIComponent(sessionId)}`)
  es.onmessage = (msg) => {
    try {
      const parsed = JSON.parse(msg.data)
      onEvent && onEvent(parsed)
    } catch (e) {
      // Skip malformed lines but don't kill the stream.
    }
  }
  es.addEventListener('close', () => {
    es.close()
    onClose && onClose()
  })
  es.onerror = (err) => {
    // EventSource auto-retries on transient errors; only treat as fatal
    // once the server explicitly closed (es.readyState === 2).
    if (es.readyState === 2) {
      onError && onError(err)
      onClose && onClose()
    }
  }
  return () => { try { es.close() } catch {} }
}
