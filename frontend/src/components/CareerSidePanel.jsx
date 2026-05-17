import { useEffect } from 'react'
import './CareerSidePanel.css'

function getBadge(type) {
  return { skills: 'Your Profile', role: 'Career Role', industry: 'Industry', skill: 'Required Skill' }[type] ?? ''
}

export default function CareerSidePanel({ panel, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="csp-backdrop" onClick={onClose}>
      <div className="csp-panel" onClick={e => e.stopPropagation()}>
        <div className="csp-header">
          <span className="csp-badge">{getBadge(panel.type)}</span>
          <button className="csp-close" onClick={onClose} aria-label="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {panel.type === 'skills'   && <SkillsContent   data={panel.data} />}
        {panel.type === 'role'     && <RoleContent     data={panel.data} />}
        {panel.type === 'industry' && <IndustryContent data={panel.data} roleName={panel.roleName} />}
        {panel.type === 'skill'    && <SkillContent    data={panel.data} />}
      </div>
    </div>
  )
}

function SkillsContent({ data }) {
  return (
    <div className="csp-body">
      <h2 className="csp-title">Your Existing Skills</h2>
      <p className="csp-para">
        These skills were identified from your resume. Our AI used them to compute
        career pathway matches across Michigan's top in-demand roles.
      </p>
      <div className="csp-tag-grid">
        {data.map((s, i) => <span key={i} className="csp-tag">{s}</span>)}
      </div>
    </div>
  )
}

function RoleContent({ data }) {
  return (
    <div className="csp-body">
      <h2 className="csp-title">{data.title}</h2>
      <div className="csp-match-row">
        <span className="csp-match-pct">{data.matchPct}%</span>
        <span className="csp-match-label">skills match with your profile</span>
      </div>
      <div className="csp-score-track">
        <div className="csp-score-fill" style={{ width: `${data.matchPct}%` }} />
      </div>
      <p className="csp-para" style={{ marginTop: 16 }}>{data.definition}</p>
      <div className="csp-info-grid">
        <div className="csp-info-item">
          <span className="csp-info-label">Salary Range</span>
          <span className="csp-info-value">{data.salaryRange}</span>
        </div>
        <div className="csp-info-item">
          <span className="csp-info-label">Market</span>
          <span className="csp-info-value">Michigan, USA</span>
        </div>
      </div>
      <p className="csp-hint">Select an industry below to explore pathways →</p>
    </div>
  )
}

function IndustryContent({ data, roleName }) {
  return (
    <div className="csp-body">
      <h2 className="csp-title">{data.name}</h2>
      <div className="csp-acceptance">
        <strong>{data.acceptance}%</strong> of {roleName ?? 'role'} openings are in this industry
      </div>
      <div className="csp-score-track" style={{ marginBottom: 16 }}>
        <div className="csp-score-fill" style={{ width: `${data.acceptance}%` }} />
      </div>
      <p className="csp-para">{data.description}</p>
      <p className="csp-hint">Select a required skill to see courses & preparation →</p>
    </div>
  )
}

function SkillContent({ data }) {
  return (
    <div className="csp-body">
      <h2 className="csp-title">{data.name}</h2>
      <p className="csp-para">{data.detail}</p>
      <div className="csp-section-label">Top Courses & Resources</div>
      <ul className="csp-courses">
        {data.courses.map((c, i) => (
          <li key={i} className="csp-course-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            {c}
          </li>
        ))}
      </ul>
      <div className="csp-prep">
        <div className="csp-section-label">How to Prepare</div>
        <p className="csp-para">{data.prep}</p>
      </div>
    </div>
  )
}
