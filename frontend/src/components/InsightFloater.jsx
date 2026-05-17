import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import DnaHelix from './DnaHelix'
import { useTheme } from '../context/ThemeContext'
import { sendChat } from '../api/client'
import './InsightFloater.css'

const MAX_EXCHANGES = 8

const STARTER_CHIPS = [
  'Why is role #1 best for me?',
  'What skill should I learn first?',
  'Where can I find IBM SkillsBuild courses?',
]

export default function InsightFloater({ allInsights = [], sessionId }) {
  const { theme }  = useTheme()
  const dnaColor   = theme === 'dark' ? '#4d8fff' : '#1a6bff'

  // Panel open/close — history persists across toggles
  const [open, setOpen]               = useState(false)
  const [insightIdx, setInsightIdx]   = useState(0)

  // Chat state (intentionally kept outside close/open so history survives)
  const [messages,      setMessages]     = useState([])
  const [input,         setInput]        = useState('')
  const [isThinking,    setIsThinking]   = useState(false)
  const [limitReached,  setLimitReached] = useState(false)
  const [revealedTexts, setRevealedTexts] = useState({})

  const nextIdRef          = useRef(0)
  const revealIntervalsRef = useRef({})
  const historyRef         = useRef(null)
  const textareaRef        = useRef(null)
  const floaterRef         = useRef(null)

  const exchangeCount = messages.filter(m => m.role === 'user').length
  const hasMessages   = messages.length > 0

  // ── Rotate insights while open ──────────────────────────────────────────
  useEffect(() => {
    if (!open || allInsights.length === 0) return
    const id = setInterval(() => setInsightIdx(i => (i + 1) % allInsights.length), 8000)
    return () => clearInterval(id)
  }, [open, allInsights.length])

  // ── Scroll chat to bottom ────────────────────────────────────────────────
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isThinking])

  // ── Typewriter effect for AI messages ───────────────────────────────────
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'ai') return
    const { id, text } = lastMsg
    if (revealedTexts[id] !== undefined) return

    setRevealedTexts(prev => ({ ...prev, [id]: '' }))
    let pos = 0
    const CHUNK = 14
    const TICK_MS = 16
    const iv = setInterval(() => {
      pos = Math.min(pos + CHUNK, text.length)
      setRevealedTexts(prev => ({ ...prev, [id]: text.slice(0, pos) }))
      if (pos >= text.length) { clearInterval(iv); delete revealIntervalsRef.current[id] }
    }, TICK_MS)
    revealIntervalsRef.current[id] = iv
    return () => { clearInterval(iv); delete revealIntervalsRef.current[id] }
  }, [messages])

  // ── Click-away to close ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (floaterRef.current && !floaterRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async (overrideText) => {
    const text = (overrideText !== undefined ? overrideText : input).trim()
    if (!text || isThinking || limitReached) return

    if (overrideText === undefined) {
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }

    const userMsgId = nextIdRef.current++
    setMessages(prev => [...prev, { role: 'user', text, id: userMsgId }])
    setIsThinking(true)

    let answer
    try {
      if (!sessionId) {
        answer = "I don't have your session yet — please re-analyze a resume."
      } else {
        const res = await sendChat(sessionId, text)
        answer = (res?.answer || '').trim()
          || "I couldn't answer that — try rephrasing."
      }
    } catch (err) {
      answer = `Something went wrong: ${err?.message || String(err)}`
    }

    const aiMsgId = nextIdRef.current++
    setMessages(prev => [...prev, { role: 'ai', text: answer, id: aiMsgId }])
    setIsThinking(false)

    if (exchangeCount + 1 >= MAX_EXCHANGES) setLimitReached(true)
  }

  const handleChange = (e) => {
    setInput(e.target.value)
    const ta = textareaRef.current
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 100) + 'px'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div ref={floaterRef} className={`sdi-floater${open ? ' sdi-open' : ''}`}>

      {/* ── Expanded panel ── */}
      {open && (
        <div className="sdi-panel">

          {/* Header */}
          <div className="sdi-header">
            <div className="sdi-header-left">
              <div className="sdi-header-dna">
                <DnaHelix width={32} height={32} color={dnaColor} speed={0.4} />
              </div>
              <div>
                <div className="sdi-header-title">SKILL DNA INSIGHTS</div>
                <div className="sdi-header-sub">Career Intelligence · Michigan LMI</div>
              </div>
            </div>
            <button className="sdi-close" onClick={() => setOpen(false)} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Rotating insight strip */}
          {allInsights.length > 0 && (
            <div className="sdi-insight-strip">
              <span className="sdi-insight-icon">💡</span>
              <p key={insightIdx} className="sdi-insight-text">{allInsights[insightIdx]}</p>
              {allInsights.length > 1 && (
                <div className="sdi-insight-dots">
                  {allInsights.map((_, i) => (
                    <span key={i} className={`sdi-dot${i === insightIdx ? ' active' : ''}`}
                      onClick={() => setInsightIdx(i)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat body */}
          <div className="sdi-body" ref={historyRef}>
            {!hasMessages && (
              <div className="sdi-welcome">
                <p>Ask me anything about your career pathway, skills, or Michigan job market.</p>
                {!limitReached && (
                  <div className="sdi-chips">
                    {STARTER_CHIPS.map((q) => (
                      <button key={q} className="sdi-chip"
                        disabled={isThinking || !sessionId}
                        onClick={() => handleSend(q)}>{q}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`sdi-msg sdi-msg-${m.role}`}>
                <span className="sdi-msg-label">{m.role === 'user' ? 'You' : 'SkillDNA'}</span>
                {m.role === 'user' ? (
                  <p className="sdi-msg-text">{m.text}</p>
                ) : (
                  <div className="sdi-msg-text sdi-msg-markdown">
                    <ReactMarkdown>{revealedTexts[m.id] ?? m.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="sdi-msg sdi-msg-ai">
                <span className="sdi-msg-label">SkillDNA</span>
                <div className="sdi-thinking"><span /><span /><span /></div>
              </div>
            )}
          </div>

          {/* Input footer */}
          <div className="sdi-footer">
            {limitReached ? (
              <div className="sdi-limit">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {MAX_EXCHANGES}-message limit reached. Upload a new resume to reset.
              </div>
            ) : (
              <>
                <div className={`sdi-input-wrap${input ? ' sdi-active' : ''}`}>
                  <textarea
                    ref={textareaRef}
                    className="sdi-input"
                    placeholder={sessionId ? 'Ask about a role or skill…' : 'Analyzing…'}
                    value={input}
                    rows={1}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    disabled={isThinking || !sessionId}
                  />
                  <button className="sdi-send" onClick={() => handleSend()}
                    disabled={!input.trim() || isThinking || !sessionId} aria-label="Send">
                    {isThinking ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.4"
                        strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    )}
                  </button>
                </div>
                {exchangeCount > 0 && (
                  <p className="sdi-hint">
                    {MAX_EXCHANGES - exchangeCount} message{MAX_EXCHANGES - exchangeCount !== 1 ? 's' : ''} left
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Trigger button ── */}
      <button
        className="sdi-btn"
        onClick={() => setOpen(v => !v)}
        title="SKILL DNA INSIGHTS"
        aria-label="Open SKILL DNA INSIGHTS"
      >
        <DnaHelix width={56} height={56} color={dnaColor} speed={open ? 0.6 : 0.25} />
        {!open && hasMessages && <span className="sdi-badge" />}
      </button>
    </div>
  )
}
