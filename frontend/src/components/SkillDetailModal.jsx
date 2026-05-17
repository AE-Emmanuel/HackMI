import './SkillDetailModal.css'

export default function SkillDetailModal({ skill, onClose }) {
  const isUser = skill.kind === 'user'

  return (
    <div className="sdm-backdrop" onClick={onClose}>
      <div className="sdm-card" onClick={e => e.stopPropagation()}>

        <div className="sdm-header">
          <div className="sdm-badge">{isUser ? 'Your Skill' : 'Suggested Skill'}</div>
          <button className="sdm-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <h2 className="sdm-title">{skill.name}</h2>

        <div className="sdm-body">
          <p>{skill.detail}</p>

          <div className="sdm-section">
            <h4>Transferability</h4>
            <p>{skill.transferability}</p>
          </div>

          <div className="sdm-section">
            <h4>{isUser ? 'Career Opportunities' : 'How to Develop This Skill'}</h4>
            <p>{skill.opportunities}</p>
          </div>

          {skill.matchScore && (
            <div className="sdm-score-row">
              <span className="sdm-score-label">Match Score</span>
              <div className="sdm-score-bar-wrap">
                <div className="sdm-score-bar" style={{ width: `${skill.matchScore}%` }} />
              </div>
              <span className="sdm-score-pct">{skill.matchScore}%</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
