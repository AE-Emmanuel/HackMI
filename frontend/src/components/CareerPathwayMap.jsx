import { useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react'
import './CareerPathwayMap.css'

// ── SVG bezier line helper ─────────────────────────────────────────────────
function makePath(ax, ay, bx, by, opacity, color) {
  const mx = (ax + bx) / 2
  return `<path d="M ${ax} ${ay} C ${mx} ${ay} ${mx} ${by} ${bx} ${by}"
    stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.8"
    fill="none" stroke-dasharray="6 4"/>`
}

// ── Column level label ─────────────────────────────────────────────────────
function ColHeader({ step, label }) {
  return (
    <div className="cpm-col-header">
      <span className="cpm-col-header-num">{step}</span>
      <span className="cpm-col-header-text">{label}</span>
    </div>
  )
}

// ── Smooth expand wrapper ──────────────────────────────────────────────────
function ExpandSection({ open, children }) {
  return (
    <div className={`cpm-expand-wrap${open ? ' cpm-open' : ''}`}>
      <div className="cpm-expand-inner">{children}</div>
    </div>
  )
}

// ── Fallback content if the payload is empty ──────────────────────────────
const FALLBACK_SKILLS = []
const FALLBACK_ROLES = []

export default function CareerPathwayMap({
  color = '#1a6bff',
  userSkills = FALLBACK_SKILLS,
  roles = FALLBACK_ROLES,
}) {
  const scrollRef   = useRef(null)
  const mapRef      = useRef(null)
  const svgRef      = useRef(null)
  const skillsRef   = useRef(null)
  const hubRef      = useRef(null)
  const roleRefs    = useRef({})
  const indRefs     = useRef({})
  const skillRefs   = useRef({})
  const indColRef   = useRef(null)
  const skillColRef = useRef(null)

  const [skillsOpen,   setSkillsOpen]   = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)
  const [selectedInd,  setSelectedInd]  = useState(null)
  const [expandedSkill, setExpandedSkill] = useState(null)

  const selectedRoleData = roles.find(r => r.id === selectedRole) ?? null
  const selectedIndData  = selectedRoleData?.industries.find(i => i.id === selectedInd) ?? null

  // Reset selection if data shape changes (e.g. new analysis).
  useEffect(() => {
    setSelectedRole(null)
    setSelectedInd(null)
    setExpandedSkill(null)
  }, [roles])

  // ── SVG line drawing ─────────────────────────────────────────────────────
  const drawLines = useCallback(() => {
    const mapEl = mapRef.current
    const svgEl = svgRef.current
    if (!mapEl || !svgEl) return

    const mr = mapEl.getBoundingClientRect()
    svgEl.setAttribute('width',  mapEl.scrollWidth)
    svgEl.setAttribute('height', mapEl.scrollHeight)

    const conn = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      // Guard against zero-sized nodes during transitions — re-measure later.
      if (r.width === 0 && r.height === 0) return null
      return {
        rx: r.right - mr.left,
        lx: r.left  - mr.left,
        my: r.top   - mr.top + r.height / 2,
      }
    }

    const paths = []
    const sp = conn(skillsRef.current)
    const hp = conn(hubRef.current)
    if (sp && hp) paths.push(makePath(sp.rx, sp.my, hp.lx, hp.my, 1, color))

    roles.forEach(role => {
      const rp = conn(roleRefs.current[role.id])
      if (hp && rp) {
        const op = !selectedRole || selectedRole === role.id ? 1 : 0.1
        paths.push(makePath(hp.rx, hp.my, rp.lx, rp.my, op, color))
      }
    })

    if (selectedRoleData) {
      const srp = conn(roleRefs.current[selectedRole])
      selectedRoleData.industries.forEach(ind => {
        const ip = conn(indRefs.current[ind.id])
        if (srp && ip) {
          const op = !selectedInd || selectedInd === ind.id ? 1 : 0.1
          paths.push(makePath(srp.rx, srp.my, ip.lx, ip.my, op, color))
        }
      })
    }

    if (selectedIndData) {
      const sip = conn(indRefs.current[selectedInd])
      selectedIndData.skills.forEach(sk => {
        const skp = conn(skillRefs.current[sk.id])
        if (sip && skp) paths.push(makePath(sip.rx, sip.my, skp.lx, skp.my, 1, color))
      })
    }

    svgEl.innerHTML = paths.join('')
  }, [selectedRole, selectedInd, color, selectedRoleData, selectedIndData, roles])

  // ── Center child columns on their parent node, then redraw SVG ───────────
  useLayoutEffect(() => {
    const mapEl = mapRef.current
    if (!mapEl) { drawLines(); return }
    const mr = mapEl.getBoundingClientRect()

    if (selectedRole && indColRef.current && roleRefs.current[selectedRole]) {
      const rr = roleRefs.current[selectedRole].getBoundingClientRect()
      const roleCenter = rr.top - mr.top + rr.height / 2
      const colH = indColRef.current.offsetHeight
      indColRef.current.style.marginTop = `${Math.max(0, roleCenter - colH / 2)}px`
    }

    if (selectedInd && skillColRef.current && indRefs.current[selectedInd]) {
      const ir = indRefs.current[selectedInd].getBoundingClientRect()
      const indCenter = ir.top - mr.top + ir.height / 2
      const colH = skillColRef.current.offsetHeight
      skillColRef.current.style.marginTop = `${Math.max(0, indCenter - colH / 2)}px`
    }

    drawLines()
  })

  useEffect(() => {
    const ro = new ResizeObserver(drawLines)
    if (mapRef.current) ro.observe(mapRef.current)
    return () => ro.disconnect()
  }, [drawLines])

  // ── Robustness: rAF-driven redraw during expand animations + a tail
  //                redraw at the end so the final positions are correct. ──
  useEffect(() => {
    let id1, id2, id3
    const t0 = performance.now()
    const tick = () => {
      drawLines()
      const elapsed = performance.now() - t0
      if (elapsed < 700) id1 = requestAnimationFrame(tick)
    }
    id1 = requestAnimationFrame(tick)
    id2 = setTimeout(drawLines, 350)
    id3 = setTimeout(drawLines, 750)
    return () => {
      cancelAnimationFrame(id1)
      clearTimeout(id2)
      clearTimeout(id3)
    }
  }, [skillsOpen, selectedRole, selectedInd, expandedSkill, roles, drawLines])

  // ── Center-then-animate-left: initial mount centers the map; expanding ──
  //    a column slides it leftward (so the new column has room on the right). ─
  useLayoutEffect(() => {
    const scrollEl = scrollRef.current
    const mapEl    = mapRef.current
    if (!scrollEl || !mapEl) return
    if (selectedRole) return  // only auto-center on initial mount
    const hubEl = hubRef.current
    if (!hubEl) return

    // Reset any padding from a prior render.
    mapEl.style.paddingLeft = ''

    const hubRect = hubEl.getBoundingClientRect()
    const mapRect = mapEl.getBoundingClientRect()
    const hubFromContentLeft = hubRect.left + hubRect.width / 2 - mapRect.left
    const halfVP = scrollEl.clientWidth / 2

    // If the hub is too close to the left edge, add padding so scrollTo can reach it.
    if (hubFromContentLeft < halfVP) {
      mapEl.style.paddingLeft = `${halfVP - hubFromContentLeft + 36}px`
    }

    // Re-measure after padding change (layout needs a rAF beat).
    requestAnimationFrame(() => {
      const h2 = hubEl.getBoundingClientRect()
      const m2 = mapEl.getBoundingClientRect()
      const hubMidX2 = h2.left + h2.width / 2 - m2.left
      scrollEl.scrollTo({ left: Math.max(0, hubMidX2 - halfVP), behavior: 'auto' })
    })
  }, [roles])

  useEffect(() => {
    if (!selectedRole) return
    const t = setTimeout(() => {
      const scrollEl = scrollRef.current
      const roleEl   = roleRefs.current[selectedRole]
      if (!scrollEl || !roleEl) return

      // Use getBoundingClientRect so dynamic paddingLeft doesn't skew offsetLeft.
      const containerRect = scrollEl.getBoundingClientRect()
      const nodeRect      = roleEl.getBoundingClientRect()
      const nodeScrollLeft = scrollEl.scrollLeft + nodeRect.left - containerRect.left
      const targetTop     = scrollEl.scrollTop + nodeRect.top - containerRect.top
                            - containerRect.height / 2 + nodeRect.height / 2

      scrollEl.scrollTo({
        left: Math.max(0, nodeScrollLeft - scrollEl.clientWidth * 0.28),
        top:  Math.max(0, targetTop),
        behavior: 'smooth',
      })
    }, 80)
    return () => clearTimeout(t)
  }, [selectedRole])

  useEffect(() => {
    if (!selectedInd) return
    const t = setTimeout(() => {
      const scrollEl = scrollRef.current
      const indEl    = indRefs.current[selectedInd]
      if (!scrollEl || !indEl) return

      const containerRect = scrollEl.getBoundingClientRect()
      const nodeRect      = indEl.getBoundingClientRect()
      const nodeScrollLeft = scrollEl.scrollLeft + nodeRect.left - containerRect.left
      const targetTop     = scrollEl.scrollTop + nodeRect.top - containerRect.top
                            - containerRect.height / 2 + nodeRect.height / 2

      scrollEl.scrollTo({
        left: Math.max(0, nodeScrollLeft - scrollEl.clientWidth * 0.28),
        top:  Math.max(0, targetTop),
        behavior: 'smooth',
      })
    }, 80)
    return () => clearTimeout(t)
  }, [selectedInd])

  useEffect(() => {
    if (!expandedSkill) return
    const t = setTimeout(() => {
      const scrollEl = scrollRef.current
      const skillEl  = skillRefs.current[expandedSkill]
      if (!scrollEl || !skillEl) return

      const containerRect = scrollEl.getBoundingClientRect()
      const nodeRect      = skillEl.getBoundingClientRect()
      const targetTop     = scrollEl.scrollTop + nodeRect.top - containerRect.top
                            - containerRect.height / 2 + nodeRect.height / 2

      scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
    }, 120)
    return () => clearTimeout(t)
  }, [expandedSkill])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onRoleClick = (role) => {
    if (selectedRole === role.id) return
    setSelectedRole(role.id)
    setSelectedInd(null)
    setExpandedSkill(null)
  }
  const onRoleDeselect = (e) => {
    e.stopPropagation()
    setSelectedRole(null); setSelectedInd(null); setExpandedSkill(null)
  }
  const onIndClick = (ind) => {
    if (selectedInd === ind.id) return
    setSelectedInd(ind.id)
    setExpandedSkill(null)
  }
  const onIndDeselect = (e) => {
    e.stopPropagation()
    setSelectedInd(null); setExpandedSkill(null)
  }
  const onSkillClick = (sk) => {
    setExpandedSkill(prev => prev === sk.id ? null : sk.id)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!roles || roles.length === 0) {
    return (
      <div className="cpm-empty">
        <p>No analysis loaded yet.</p>
        <p className="cpm-empty-sub">Upload a resume to see your career pathway map.</p>
      </div>
    )
  }

  return (
    <div className="cpm-scroll" ref={scrollRef}>
      <div className="cpm-map" ref={mapRef}>
        <svg ref={svgRef} className="cpm-svg" />

        {/* ── Col 1: My Skills ── */}
        <div className="cpm-col">
          <ColHeader step="1" label="Your Skills" />
          <div
            className={`cpm-node cpm-node-skills${skillsOpen ? ' cpm-selected' : ''}`}
            ref={skillsRef}
            onClick={() => setSkillsOpen(v => !v)}
          >
            <div className="cpm-skills-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <div className="cpm-node-title">My Skills</div>
            <div className="cpm-node-sub">Existing Skills</div>
            <div className="cpm-node-count">{userSkills.length} skills · click to expand</div>
            {skillsOpen && (
              <button className="cpm-x" onClick={e => { e.stopPropagation(); setSkillsOpen(false) }}>×</button>
            )}

            <ExpandSection open={skillsOpen}>
              <div className="cpm-divider" />
              <div className="cpm-tag-grid">
                {userSkills.length === 0 && (
                  <span className="cpm-tag cpm-tag-muted">No matched skills detected.</span>
                )}
                {userSkills.map((s, i) => (
                  <span key={i} className="cpm-tag">{s}</span>
                ))}
              </div>
            </ExpandSection>
          </div>
        </div>

        {/* ── Col 2: SDE / Skill DNA Engine hub ── */}
        <div className="cpm-col">
          <ColHeader step="2" label="AI Match" />
          <div className="cpm-node cpm-node-hub" ref={hubRef}>
            <div className="cpm-hub-pulse" />
            <div className="cpm-hub-pulse cpm-hub-pulse-2" />
            <div className="cpm-node-title">SDE</div>
            <div className="cpm-node-sub">SKILL DNA ENGINE</div>
          </div>
        </div>

        {/* ── Col 3: Roles ── */}
        <div className="cpm-col cpm-col-roles">
          <ColHeader step="3" label="Job Roles" />
          {roles.map(role => {
            const isSel  = selectedRole === role.id
            const isBlur = !!selectedRole && !isSel
            return (
              <div key={role.id}
                ref={el => { roleRefs.current[role.id] = el }}
                className={`cpm-node cpm-node-role${isSel ? ' cpm-selected' : ''}${isBlur ? ' cpm-blurred' : ''}`}
                onClick={() => onRoleClick(role)}
              >
                <div className="cpm-match-pill">{role.matchPct}% match</div>
                <div className="cpm-node-title">{role.title}</div>
                <div className="cpm-node-sub">{role.salaryRange}</div>
                {isSel && (
                  <button className="cpm-x" onClick={onRoleDeselect}>×</button>
                )}

                <ExpandSection open={isSel}>
                  <div className="cpm-divider" />
                  <p className="cpm-expand-text">{role.definition}</p>
                  <p className="cpm-expand-hint">→ Select an industry to continue</p>
                </ExpandSection>
              </div>
            )
          })}
        </div>

        {/* ── Col 4: Industries ── */}
        {selectedRoleData && (
          <div className="cpm-col cpm-col-enter cpm-col-child" ref={indColRef}>
            <ColHeader step="4" label="Michigan Industries" />
            {selectedRoleData.industries.map(ind => {
              const isSel  = selectedInd === ind.id
              const isBlur = !!selectedInd && !isSel
              return (
                <div key={ind.id}
                  ref={el => { indRefs.current[ind.id] = el }}
                  className={`cpm-node cpm-node-industry${isSel ? ' cpm-selected' : ''}${isBlur ? ' cpm-blurred' : ''}`}
                  onClick={() => onIndClick(ind)}
                >
                  <div className="cpm-acceptance-pill">{ind.acceptance}% acceptance</div>
                  <div className="cpm-node-title">{ind.name}</div>
                  {isSel && (
                    <button className="cpm-x" onClick={onIndDeselect}>×</button>
                  )}

                  <ExpandSection open={isSel}>
                    <div className="cpm-divider" />
                    <p className="cpm-expand-text">{ind.description}</p>
                    <p className="cpm-expand-hint">→ Select a required skill to learn more</p>
                  </ExpandSection>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Col 5: Required Skills ── */}
        {selectedIndData && (
          <div className="cpm-col cpm-col-enter cpm-col-child" ref={skillColRef}>
            <ColHeader step="5" label="Skills to Learn" />
            {selectedIndData.skills.length === 0 && (
              <div className="cpm-node cpm-node-skill cpm-node-empty">
                <div className="cpm-node-title">No skill gaps</div>
                <div className="cpm-node-sub">You already match this industry's core skills.</div>
              </div>
            )}
            {selectedIndData.skills.map(sk => {
              const isOpen = expandedSkill === sk.id
              return (
                <div key={sk.id}
                  ref={el => { skillRefs.current[sk.id] = el }}
                  className={`cpm-node cpm-node-skill${isOpen ? ' cpm-selected' : ''}${sk.is_match ? ' cpm-node-skill-match' : ''}`}
                  onClick={() => onSkillClick(sk)}
                >
                  <div className="cpm-skill-label">
                    {sk.is_match ? 'Already Yours' : 'Required Skill'}
                  </div>
                  <div className="cpm-node-title">{sk.name}</div>
                  {!isOpen && <div className="cpm-skill-cta">Click to see courses →</div>}
                  {isOpen && (
                    <button className="cpm-x" onClick={e => { e.stopPropagation(); setExpandedSkill(null) }}>×</button>
                  )}

                  <ExpandSection open={isOpen}>
                    <div className="cpm-divider" />
                    <p className="cpm-expand-text">{sk.detail}</p>
                    <div className="cpm-courses-label">Top Courses &amp; Resources</div>
                    <ul className="cpm-courses">
                      {sk.courses.map((c, i) => (
                        <li key={i}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                          {c}
                        </li>
                      ))}
                    </ul>
                    <div className="cpm-prep-label">How to Prepare</div>
                    <p className="cpm-expand-text">{sk.prep}</p>
                  </ExpandSection>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
