import { useState, useRef } from 'react'
import './ChatBar.css'

export default function ChatBar() {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef(null)

  const handleChange = (e) => {
    setValue(e.target.value)
    const ta = textareaRef.current
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }

  const handleSubmit = () => {
    if (!value.trim()) return
    // TODO: wire to backend chat agent
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="chatbar-outer">
      <div className={`chatbar-wrap ${focused ? 'chatbar-focused' : 'chatbar-idle'}`}>
        <textarea
          ref={textareaRef}
          className="chatbar-input"
          placeholder="Ask Question"
          value={value}
          rows={1}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <button
          className="chatbar-send"
          onClick={handleSubmit}
          disabled={!value.trim()}
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <p className="chatbar-hint">Press Enter to send · Shift+Enter for new line</p>
    </div>
  )
}
