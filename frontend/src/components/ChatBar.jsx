import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { sendChat } from '../api/client'
import './ChatBar.css'

const MAX_EXCHANGES = 8

const STARTER_CHIPS = [
  'Why is role #1 best for me?',
  'What skill should I learn first?',
  'Where can I find IBM SkillsBuild courses?',
]

export default function ChatBar({ sessionId }) {
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [focused,      setFocused]      = useState(false)
  const [isThinking,   setIsThinking]   = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [revealedTexts, setRevealedTexts] = useState({})

  const textareaRef        = useRef(null)
  const historyRef         = useRef(null)
  const nextIdRef          = useRef(0)
  const revealIntervalsRef = useRef({})

  const exchangeCount = messages.filter(m => m.role === 'user').length

  // Scroll to bottom whenever messages change or thinking state changes
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTo({
        top: historyRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages, isThinking])

  // Typewriter effect for new AI messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'ai') return
    const { id, text } = lastMsg
    if (revealedTexts[id] !== undefined) return

    setRevealedTexts(prev => ({ ...prev, [id]: '' }))
    let pos = 0
    const CHUNK = 12
    const TICK_MS = 18
    const iv = setInterval(() => {
      pos = Math.min(pos + CHUNK, text.length)
      setRevealedTexts(prev => ({ ...prev, [id]: text.slice(0, pos) }))
      if (pos >= text.length) {
        clearInterval(iv)
        delete revealIntervalsRef.current[id]
      }
    }, TICK_MS)
    revealIntervalsRef.current[id] = iv

    return () => {
      clearInterval(iv)
      delete revealIntervalsRef.current[id]
    }
  }, [messages])

  const handleChange = (e) => {
    setInput(e.target.value)
    const ta = textareaRef.current
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

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
          || "I couldn't answer that — try rephrasing or asking about a specific role / skill."
      }
    } catch (err) {
      answer = `Sorry, something went wrong: ${err?.message || String(err)}`
    }

    const aiMsgId = nextIdRef.current++
    setMessages(prev => [...prev, { role: 'ai', text: answer, id: aiMsgId }])
    setIsThinking(false)

    if (exchangeCount + 1 >= MAX_EXCHANGES) setLimitReached(true)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div className={`chatbar-outer ${hasMessages ? 'chatbar-has-history' : ''}`}>

      {/* ── Conversation history ── */}
      {hasMessages && (
        <div className="chatbar-history" ref={historyRef}>
          {messages.map((m) => (
            <div key={m.id} className={`chat-msg chat-msg-${m.role}`}>
              <span className="chat-msg-label">{m.role === 'user' ? 'You' : 'SkillDNA'}</span>
              {m.role === 'user' ? (
                <p className="chat-msg-text">{m.text}</p>
              ) : (
                <div className="chat-msg-text chat-msg-markdown">
                  <ReactMarkdown>{revealedTexts[m.id] ?? m.text}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="chat-msg chat-msg-ai">
              <span className="chat-msg-label">SkillDNA</span>
              <div className="chat-thinking">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Input row ── */}
      {limitReached ? (
        <div className="chatbar-limit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          You&apos;ve reached the {MAX_EXCHANGES}-message limit for this session.
          Upload a new resume to start a fresh conversation.
        </div>
      ) : (
        <div className={`chatbar-wrap ${focused ? 'chatbar-focused' : 'chatbar-idle'}`}>
          <textarea
            ref={textareaRef}
            className="chatbar-input"
            placeholder={sessionId ? 'Ask about a role, skill, or transition…' : 'Loading your analysis…'}
            value={input}
            rows={1}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={isThinking || !sessionId}
          />
          <button className="chatbar-send" onClick={() => handleSend()}
            disabled={!input.trim() || isThinking || !sessionId} aria-label="Send">
            {isThinking ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4"
                strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
      )}

      {/* ── Starter chips (shown only before first message) ── */}
      {!hasMessages && !limitReached && (
        <div className="chatbar-chips">
          {STARTER_CHIPS.map((q) => (
            <button
              key={q}
              className="chatbar-chip"
              disabled={isThinking || !sessionId}
              onClick={() => handleSend(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {!limitReached && (
        <p className="chatbar-hint">
          {exchangeCount > 0
            ? `${MAX_EXCHANGES - exchangeCount} message${MAX_EXCHANGES - exchangeCount !== 1 ? 's' : ''} remaining · Shift+Enter for new line`
            : 'Press Enter to send · Shift+Enter for new line'}
        </p>
      )}
    </div>
  )
}
