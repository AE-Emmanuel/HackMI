import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SkilldnaLogo from '../components/SkilldnaLogo'
import ThemeToggle from '../components/ThemeToggle'
import CareerPathwayMap from '../components/CareerPathwayMap'
import ChatBar from '../components/ChatBar'
import { useTheme } from '../context/ThemeContext'
import { payloadToTree } from '../api/transform'
import { fetchPayload } from '../api/client'
import '../styles/results.css'

export default function ResultsPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { theme } = useTheme()
  const dnaColor  = theme === 'dark' ? '#4d8fff' : '#1a6bff'

  // Payload may be passed in via navigation state (LoadingScreen → here)
  // or we re-fetch from the bridge if the user reloads the page.
  const initialPayload = location.state?.payload ?? null
  const sessionId      = location.state?.sessionId ?? null

  const [payload, setPayload] = useState(initialPayload)
  const [error,   setError]   = useState(null)
  const [missedIdx, setMissedIdx] = useState(0)

  // Re-fetch payload if we have a session id but no payload (e.g. reload).
  useEffect(() => {
    let cancelled = false
    if (payload || !sessionId) return
    const load = async () => {
      try {
        const res = await fetchPayload(sessionId)
        if (cancelled) return
        if (res.ready) setPayload(res.payload)
        else setError('Analysis still running — please give it a few seconds.')
      } catch (err) {
        if (!cancelled) setError(err?.message || String(err))
      }
    }
    load()
    return () => { cancelled = true }
  }, [payload, sessionId])

  // No session at all → bounce to landing.
  useEffect(() => {
    if (!sessionId && !payload) {
      const t = setTimeout(() => navigate('/', { replace: true }), 2400)
      return () => clearTimeout(t)
    }
  }, [sessionId, payload, navigate])

  const tree = useMemo(() => payloadToTree(payload || {}), [payload])

  // Cycle through missed-opportunities (result-page channel) every 9 s so
  // the band has visible motion without distracting from the map.
  useEffect(() => {
    if (!tree.missedResult || tree.missedResult.length === 0) return
    const id = setInterval(() => {
      setMissedIdx((i) => (i + 1) % tree.missedResult.length)
    }, 9000)
    return () => clearInterval(id)
  }, [tree.missedResult])

  return (
    <div className="results-root">

      {/* Top bar — back button intentionally removed per Phase F7 ask. */}
      <div className="results-topbar">
        <SkilldnaLogo />
        <div className="results-topbar-right">
          <ThemeToggle />
        </div>
      </div>

      {/* Heading */}
      <div className="results-heading">
        <h1 className="results-title">Your Career Pathway Map</h1>
        <p className="results-subtitle">
          Start from your skills → select a role → explore Michigan industries → discover what to learn next.
        </p>

        {/* Signature insight */}
        {tree.signatureInsight && (
          <p className="results-signature">{tree.signatureInsight}</p>
        )}

        {/* Rotating "you may have missed" band */}
        {tree.missedResult && tree.missedResult.length > 0 && (
          <div className="results-missed-band">
            <span className="results-missed-tag">You may have missed</span>
            <span key={missedIdx} className="results-missed-text">
              {tree.missedResult[missedIdx]}
            </span>
          </div>
        )}

        {error && <p className="results-error">{error}</p>}
      </div>

      {/* Career pathway tree — 3/4 of remaining height */}
      <div className="results-map-section">
        <CareerPathwayMap
          color={dnaColor}
          userSkills={tree.userSkills}
          roles={tree.roles}
        />
      </div>

      {/* Chat bar — 1/4 of remaining height */}
      <div className="results-chat-section">
        <ChatBar sessionId={sessionId} />
      </div>

    </div>
  )
}
