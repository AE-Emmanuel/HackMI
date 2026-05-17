import { useState, useRef, useEffect } from 'react'
import './ChatBar.css'

const MAX_EXCHANGES = 3

const MOCK_RESPONSES = [
  "Based on your forklift, quality control, and team leadership experience, you're a strong fit for Supply Chain Coordinator roles paying $55,000–$78,000 in Michigan. Companies like Amazon, GM, and Stellantis actively post these openings. Your 91% match score on Team Leadership is your biggest asset here.",
  "To bridge into Data Analytics, start with Excel advanced functions and Power BI — both free to learn on Microsoft Learn. Your inventory tracking background means you already understand the data; you just need the tools. Most Supply Chain Analyst roles in Michigan list Power BI as a preferred skill, not a requirement.",
  "Your Process Optimization and Assembly Line Management experience translates well into Lean Manufacturing roles. A free online Lean 101 course (available through Michigan Works!) typically takes 8–10 hours and gives you the terminology employers look for. Six Sigma Green Belt certification is a longer step but can add $12,000–$18,000 to your salary range.",
]

export default function ChatBar() {
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

    // Mock agent response — swap with real API call when backend is ready
    await new Promise(r => setTimeout(r, 1400 + Math.random() * 800))

    const responseIdx = Math.min(exchangeCount, MOCK_RESPONSES.length - 1)
    setMessages(prev => [...prev, { role: 'ai', text: MOCK_RESPONSES[responseIdx] }])
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
          You've reached the {MAX_EXCHANGES}-message limit for this session.
          Upload a new resume to start a fresh conversation.
        </div>
      ) : (
        <div className={`chatbar-wrap ${focused ? 'chatbar-focused' : 'chatbar-idle'}`}>
          <textarea
            ref={textareaRef}
            className="chatbar-input"
            placeholder="Ask Question"
            value={input}
            rows={1}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={isThinking}
          />
          <button className="chatbar-send" onClick={handleSend}
            disabled={!input.trim() || isThinking} aria-label="Send">
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
            : 'Press Enter to send · Shift+Enter for new line'}
        </p>
      )}
    </div>
  )
}
