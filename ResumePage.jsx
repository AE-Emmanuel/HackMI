import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DnaLetterI from '../components/DnaLetterI'
import DnaSpinner from '../components/DnaSpinner'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import '../styles/resume.css'

const SIZE_PER_KB = 0.18
const MIN_CARD_HEIGHT = 120
const MAX_CARD_HEIGHT = 520

// Mock API call — swap the URL and logic when backend is ready
async function mockSendResume(file) {
  await new Promise(resolve => setTimeout(resolve, 4000))
  return { success: true, jobId: 'mock-123' }
}

export default function ResumePage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const dnaColor = theme === 'dark' ? '#4d8fff' : '#1a6bff'

  const [file, setFile] = useState(null)
  const [cardHeight, setCardHeight] = useState(MIN_CARD_HEIGHT)
  const [isDragging, setIsDragging] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (!f || f.type !== 'application/pdf') return
    setFile(f)
    const sizeKB = f.size / 1024
    const computed = MIN_CARD_HEIGHT + sizeKB * SIZE_PER_KB
    setCardHeight(Math.min(Math.max(computed, MIN_CARD_HEIGHT), MAX_CARD_HEIGHT))
  }

  const handleInputChange = (e) => handleFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleRemove = () => {
    setFile(null)
    setCardHeight(MIN_CARD_HEIGHT)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleSend = async () => {
    if (!file) return
    setIsSending(true)
    try {
      await mockSendResume(file)
      navigate('/results')
    } catch {
      setIsSending(false)
    }
  }

  return (
    <div className="resume-root">

      {/* Send loading overlay */}
      {isSending && (
        <div className="send-loading-overlay">
          <div className="send-loading-inner">
            <DnaSpinner width={420} height={90} color={dnaColor} speed={1.1} />
            <p className="send-loading-label">Analyzing your resume…</p>
            <p className="send-loading-sub">Our AI agent is mapping your skills to career opportunities</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="resume-topbar">
        {/* Logo — click to go home */}
        <button className="resume-logo-btn" onClick={() => navigate('/')} title="Go to home">
          <DnaLetterI height={36} color={dnaColor} />
        </button>

        <div className="resume-topbar-right">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Upload / card area */}
      <div className="resume-center">
        {!file ? (
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
            <div className="upload-plus-btn">
              <span className="upload-plus-icon">+</span>
            </div>
            <p className="upload-hint">Upload your resume</p>
            <p className="upload-hint-sub">PDF only · Click or drag & drop</p>
          </div>
        ) : (
          <div className="resume-card-wrap">
            <div
              className="resume-card"
              style={{ height: `${cardHeight}px` }}
            >
              <div className="resume-card-inner">
                <div className="resume-card-icon">
                  <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
                    <rect x="1" y="1" width="28" height="38" rx="3" fill="var(--blue-pale)" stroke="var(--blue-primary)" strokeWidth="1.5"/>
                    <rect x="6" y="9" width="18" height="2" rx="1" fill="var(--blue-primary)" opacity="0.5"/>
                    <rect x="6" y="14" width="18" height="2" rx="1" fill="var(--blue-primary)" opacity="0.5"/>
                    <rect x="6" y="19" width="13" height="2" rx="1" fill="var(--blue-primary)" opacity="0.3"/>
                    <rect x="6" y="24" width="16" height="2" rx="1" fill="var(--blue-primary)" opacity="0.3"/>
                    <rect x="6" y="29" width="10" height="2" rx="1" fill="var(--blue-primary)" opacity="0.2"/>
                  </svg>
                </div>
                <div className="resume-card-info">
                  <p className="resume-card-name">{file.name}</p>
                  <p className="resume-card-size">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="resume-card-status">
                  <span className="resume-card-badge">Ready</span>
                </div>
              </div>

              <div className="resume-card-lines">
                {Array.from({ length: Math.floor((cardHeight - 80) / 18) }).map((_, i) => (
                  <div
                    key={i}
                    className="resume-card-line"
                    style={{ width: `${60 + (i % 5) * 8}%`, opacity: 0.12 + (i % 3) * 0.04 }}
                  />
                ))}
              </div>

              <button className="resume-card-remove" onClick={handleRemove} title="Remove">✕</button>
            </div>

            {/* Send button */}
            <button className="send-btn" onClick={handleSend}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Analyze Resume
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
