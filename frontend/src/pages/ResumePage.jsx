import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SkilldnaLogo from '../components/SkilldnaLogo'
import DnaHelix from '../components/DnaHelix'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { uploadResume } from '../api/client'
import '../styles/resume.css'

const SIZE_PER_KB = 0.18
const MIN_CARD_HEIGHT = 120
const MAX_CARD_HEIGHT = 520

// Backend accepts .txt, .md, .docx, .pdf, .rtf — exposed via the resume_loader.
const ACCEPTED_EXTENSIONS = '.pdf,.docx,.doc,.txt,.md,.rtf,application/pdf'

function fileIsSupported(f) {
  if (!f) return false
  const name = (f.name || '').toLowerCase()
  return (
    name.endsWith('.pdf') ||
    name.endsWith('.docx') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.rtf')
  )
}

export default function ResumePage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const dnaColor = theme === 'dark' ? '#4d8fff' : '#1a6bff'

  const [file,       setFile]       = useState(null)
  const [cardHeight, setCardHeight] = useState(MIN_CARD_HEIGHT)
  const [isDragging, setIsDragging] = useState(false)
  const [isSending,  setIsSending]  = useState(false)
  const [error,      setError]      = useState(null)
  const inputRef = useRef(null)

  const handleFile = (f) => {
    setError(null)
    if (!f) return
    if (!fileIsSupported(f)) {
      setError(`Unsupported file type. Accepted: PDF, DOCX, TXT, MD, RTF.`)
      return
    }
    setFile(f)
    const sizeKB = f.size / 1024
    const computed = MIN_CARD_HEIGHT + sizeKB * SIZE_PER_KB
    setCardHeight(Math.min(Math.max(computed, MIN_CARD_HEIGHT), MAX_CARD_HEIGHT))
  }

  const handleRemove = () => {
    setFile(null)
    setError(null)
    setCardHeight(MIN_CARD_HEIGHT)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleSend = async () => {
    if (!file) return
    setIsSending(true)
    setError(null)
    try {
      const startedAt = Date.now()
      const { session_id, filename } = await uploadResume(file)
      // Navigate to the loading screen, which subscribes to /events/{id} and
      // routes onward to /results once the pipeline finishes.
      navigate('/loading', {
        state: {
          sessionId: session_id,
          filename: filename || file.name,
          startedAt,
        },
      })
    } catch (err) {
      setError(err?.message || String(err))
      setIsSending(false)
    }
  }

  return (
    <div className="resume-root">

      {/* Background DNA watermark — horizontal + vertical cross */}
      <div className="resume-bg-dna">
        <div className="resume-bg-dna-h">
          <DnaHelix width={1800} height={220} color={dnaColor} speed={0.3} />
        </div>
        <div className="resume-bg-dna-v">
          <DnaHelix width={1000} height={220} color={dnaColor} speed={0.25} />
        </div>
      </div>

      {/* Top bar */}
      <div className="resume-topbar">
        <SkilldnaLogo />
        <ThemeToggle />
      </div>

      {/* Upload / card area */}
      <div className="resume-center">
        {!file ? (
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div className="upload-plus-btn">
              <span className="upload-plus-icon">+</span>
            </div>
            <p className="upload-hint">Upload your resume</p>
            <p className="upload-hint-sub">PDF · DOCX · TXT · click or drag &amp; drop</p>
            {error && <p className="upload-error">{error}</p>}
          </div>
        ) : (
          <div className="resume-card-wrap">
            <div className="resume-card" style={{ height: `${cardHeight}px` }}>
              <div className="resume-card-inner">
                <div className="resume-card-icon">
                  <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
                    <rect x="1" y="1" width="28" height="38" rx="3"
                      fill="var(--blue-pale)" stroke="var(--blue-primary)" strokeWidth="1.5"/>
                    <rect x="6" y="9"  width="18" height="2" rx="1" fill="var(--blue-primary)" opacity="0.5"/>
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
                <span className="resume-card-badge">Ready</span>
              </div>

              <div className="resume-card-lines">
                {Array.from({ length: Math.floor((cardHeight - 80) / 18) }).map((_, i) => (
                  <div key={i} className="resume-card-line"
                    style={{ width: `${60 + (i % 5) * 8}%`, opacity: 0.12 + (i % 3) * 0.04 }} />
                ))}
              </div>
              <button className="resume-card-remove" onClick={handleRemove} title="Remove">✕</button>
            </div>

            <button className="send-btn" onClick={handleSend} disabled={isSending}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              {isSending ? 'Uploading…' : 'Analyze Resume'}
            </button>
            {error && <p className="upload-error" style={{ marginTop: 10 }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
