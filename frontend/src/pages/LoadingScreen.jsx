import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DnaSpinner from '../components/DnaSpinner'
import { subscribeToEvents, fetchPayload } from '../api/client'
import { useTheme } from '../context/ThemeContext'
import '../styles/loading.css'

// Human-friendly labels for the tracker's NODE_LABELS keys (kept in sync
// with `skilldna/tracker.py::NODE_LABELS`).
const NODE_LABEL = {
  resume_intelligence:    'Agent 1 — Resume Intelligence',
  github_intelligence:    'Sub-agent — GitHub Intelligence',
  skill_translation:      'Agent 2 — Skill Translation',
  labor_market:           'Agent 3 — Labor Market Intelligence',
  upskilling:             'Agent 4 — Upskilling Intelligence',
  missing_opportunities:  "Sub-agent — What You're Missing",
  orchestration:          'Agent 5 — Orchestration',
}

// Default playful rotating messages the loader shows BEFORE any real
// tracker events land (gives the demo a sense of motion in the first 2 s).
const PRELUDE_MESSAGES = [
  'Parsing your resume…',
  'Indexing 10,000 Michigan job rows…',
  'Spinning up the deterministic tools layer…',
  'Warming up the watsonx Granite model…',
]

// How long to show each in-flight event line before rotating to the next.
const EVENT_ROTATE_MS = 2400

export default function LoadingScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const sessionId  = location.state?.sessionId
  const startedAt  = location.state?.startedAt || Date.now()

  const { theme } = useTheme()
  const spinnerColor = theme === 'dark' ? '#4d8fff' : '#1a6bff'

  const [events, setEvents] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState(null)
  const [pipelineDone, setPipelineDone] = useState(false)
  const navTriggered = useRef(false)

  // No session in nav state → user landed directly. Bounce them back.
  useEffect(() => {
    if (!sessionId) {
      navigate('/resume', { replace: true })
    }
  }, [sessionId, navigate])

  // Tick the elapsed counter every 100 ms (dynamic time display).
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 100)
    return () => clearInterval(id)
  }, [startedAt])

  // Subscribe to the SSE stream of tracker events.
  useEffect(() => {
    if (!sessionId) return
    const stop = subscribeToEvents(
      sessionId,
      (event) => {
        setEvents((prev) => [...prev, event])
        if (event.kind === 'pipeline_end' || event.kind === 'pipeline_summary') {
          setPipelineDone(true)
        }
        if (event.kind === 'error') {
          setErrorMsg(event.summary || 'Pipeline error')
          setPipelineDone(true)
        }
      },
      () => { setPipelineDone(true) },
      (err) => { setErrorMsg('Lost connection to the pipeline event stream.') },
    )
    return () => stop()
  }, [sessionId])

  // Once the pipeline reports done, fetch the payload and navigate.
  useEffect(() => {
    if (!pipelineDone || !sessionId || navTriggered.current) return
    if (errorMsg) return
    navTriggered.current = true
    let cancelled = false
    const go = async () => {
      // Pipeline writes the payload on the worker thread; give it a beat
      // and then poll a few times before giving up.
      for (let attempt = 0; attempt < 15; attempt++) {
        try {
          const res = await fetchPayload(sessionId)
          if (cancelled) return
          if (res.ready) {
            navigate('/results', {
              replace: true,
              state: { sessionId, payload: res.payload, elapsedMs: Date.now() - startedAt },
            })
            return
          }
        } catch (err) {
          // last attempt's error will surface below
          if (attempt === 14) setErrorMsg(err?.message || String(err))
        }
        await new Promise((r) => setTimeout(r, 350))
      }
      if (!cancelled) setErrorMsg('Payload was never produced. Check the backend logs.')
    }
    go()
    return () => { cancelled = true }
  }, [pipelineDone, sessionId, navigate, errorMsg, startedAt])

  // Cycle through the "currently doing X" line so the screen feels alive.
  useEffect(() => {
    if (events.length === 0) return
    const id = setInterval(() => {
      setCurrentIdx((i) => (i + 1) % events.length)
    }, EVENT_ROTATE_MS)
    return () => clearInterval(id)
  }, [events.length])

  // --- Derived display ----------------------------------------------------

  const lastNodeEnd = [...events].reverse().find((e) => e.kind === 'node_end')
  const completedNodes = events.filter((e) => e.kind === 'node_end').map((e) => e.node)
  const totalNodes = 7  // resume_intelligence, github_intelligence, skill_translation,
                         // labor_market, upskilling, missing_opportunities, orchestration

  const eventsForRotation = events.filter((e) =>
    ['node_start', 'node_end', 'llm_start', 'llm_end', 'pipeline_summary'].includes(e.kind)
  )
  const rotatingEvent = eventsForRotation.length
    ? eventsForRotation[currentIdx % eventsForRotation.length]
    : null

  const rotatingText = rotatingEvent
    ? renderEventLine(rotatingEvent)
    : PRELUDE_MESSAGES[Math.floor((elapsed / 800) % PRELUDE_MESSAGES.length)]

  const progressPct = Math.min(
    100,
    Math.round((completedNodes.length / totalNodes) * 100)
  )
  const elapsedSeconds = (elapsed / 1000).toFixed(1)

  return (
    <div className="loading-root">
      <div className="loading-stack">
        <DnaSpinner width={260} height={62} color={spinnerColor} speed={1} />

        <div className="loading-headline">
          {errorMsg ? 'Something went wrong' : 'Analyzing your career DNA…'}
        </div>

        {!errorMsg && (
          <div className="loading-rotating-line">{rotatingText}</div>
        )}

        {errorMsg && (
          <div className="loading-error">
            <p>{errorMsg}</p>
            <button className="loading-retry" onClick={() => navigate('/resume')}>
              Back to upload
            </button>
          </div>
        )}

        {!errorMsg && (
          <>
            <div className="loading-progress-track">
              <div
                className="loading-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="loading-meta">
              <span>
                {lastNodeEnd
                  ? `Last completed: ${NODE_LABEL[lastNodeEnd.node] || lastNodeEnd.node}`
                  : 'Booting agentic workflow…'}
              </span>
              <span className="loading-elapsed">
                {elapsedSeconds}s · {progressPct}%
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function renderEventLine(event) {
  const label = NODE_LABEL[event?.node] || event?.node
  switch (event.kind) {
    case 'node_start':
      return `${label}: starting…`
    case 'node_end': {
      const clean = (event.summary || '').split(' | ')[0]
      return `${label}: ${clean}`
    }
    case 'llm_start':
      return `${label || 'Pipeline'}: calling watsonx Granite…`
    case 'llm_end': {
      const clean = (event.summary || '').split(' | usage=')[0]
      return `${label || 'Pipeline'}: ${clean}`
    }
    case 'pipeline_summary':
      return 'All agents complete — building your pathway…'
    default:
      return event.summary || event.kind
  }
}
