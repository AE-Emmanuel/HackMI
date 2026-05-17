import { useState, useRef, useEffect } from 'react'
import { sendChat } from '../api/client'
import './ChatBar.css'

const MAX_EXCHANGES = 8

export default function ChatBar({ sessionId }) {
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [focused,      setFocused]      = useState(false)
  const [isThinking,   setIsThinking]   = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const textareaRef  = useRef(null)
  const bottomRef    = useRef(null)
  const exchangeCount = messages.filter(m => m.role === 'user').length

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const handleChange = (e) => {
    setInput(e.target.value)
    const ta = textareaRef.current
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  const handleSend = async () => {
    if (!input.trim() || isThinking || limitReached) return

    const text = input.trim()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    setMessages(prev => [...prev, { role: 'user', text }])
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

    setMessages(prev => [...prev, { role: 'ai', text: answer }])
    setIsThinking(false)

    if (exchangeCount + 1 >= MAX_EXCHANGES) {
      setLimitReached(true)
    }
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
        <div className="chatbar-history">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg chat-msg-${m.role}`}>
              <span className="chat-msg-label">{m.role === 'user' ? 'You' : 'SkillDNA'}</span>
              <p className="chat-msg-text">{m.text}</p>
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
          <div ref={bottomRef} />
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
          <button className="chatbar-send" onClick={handleSend}
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

      {!limitReached && (
        <p className="chatbar-hint">
          {exchangeCount > 0
            ? `${MAX_EXCHANGES - exchangeCount} message${MAX_EXCHANGES - exchangeCount !== 1 ? 's' : ''} remaining · Shift+Enter for new line`
            : 'Press Enter to send · Shift+Enter for new line · Try: "Why is role #1 best for me?"'}
        </p>
      )}
    </div>
  )
}
