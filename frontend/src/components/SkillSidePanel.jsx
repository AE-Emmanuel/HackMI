import { useEffect, useRef } from 'react'
import './SkillSidePanel.css'

const PANEL_W = 360
const PANEL_MAX_H = 520
const EDGE_PAD = 20

export default function SkillSidePanel({ skill, screenY, onClose }) {
  const panelRef = useRef(null)

  // Clamp vertical position so it stays within viewport
  const panelH = Math.min(PANEL_MAX_H, window.innerHeight - 80)
  const rawTop = screenY - panelH / 2
  const top = Math.max(60, Math.min(rawTop, window.innerHeight - panelH - EDGE_PAD))

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="ssp-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="ssp-panel"
        style={{ top, right: EDGE_PAD, maxHeight: panelH }}
        onClick={e => e.stopPropagation()}
      >
        {/* Connector nub pointing left toward the node */}
        <div className="ssp-nub" style={{ top: panelH / 2 - 8 }} />

        <div className="ssp-header">
          <span className="ssp-badge">Suggested Skill</span>
          <button className="ssp-close" onClick={onClose} aria-label="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <h2 className="ssp-title">{skill.name}</h2>

        <div className="ssp-body">
          <p className="ssp-para">{skill.detail}</p>

          <div className="ssp-section">
            <h4>Transferability</h4>
            <p>{skill.transferability}</p>
          </div>

          <div className="ssp-section">
            <h4>How to Develop This Skill</h4>
            <p>{skill.opportunities}</p>
          </div>

          {skill.matchScore != null && (
            <div className="ssp-score">
              <div className="ssp-score-row">
                <span className="ssp-score-label">Skill Match</span>
                <span className="ssp-score-pct">{skill.matchScore}%</span>
              </div>
              <div className="ssp-score-track">
                <div className="ssp-score-fill" style={{ width: `${skill.matchScore}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
