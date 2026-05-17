import { useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react'
import './CareerPathwayMap.css'

// ── Placeholder data — replace with agent response from backend ────────────
const USER_SKILLS = [
  'Forklift Operation', 'Quality Control', 'Assembly Line Management',
  'Inventory Tracking', 'CNC Operation', 'Safety Compliance',
  'Team Leadership', 'Process Optimization',
]

const ROLES = [
  {
    id: 'r1', title: 'Supply Chain Coordinator', matchPct: 91,
    salaryRange: '$52,000 – $78,000',
    definition: 'Oversees end-to-end movement of goods from suppliers to customers, coordinating logistics, inventory, and vendor relationships. Top 5 fastest-growing role in Michigan with 2,400+ openings projected for 2025.',
    industries: [
      {
        id: 'r1i1', name: 'Automotive Manufacturing', acceptance: 78,
        description: 'Michigan automotive OEMs (GM, Ford, Stellantis) and Tier 1 suppliers are among the largest employers globally. The shift to EV production is creating new logistics roles around battery supply chains and just-in-time sequencing.',
        skills: [
          { id: 'r1i1s1', name: 'ERP Systems (SAP)', detail: 'SAP is the primary ERP platform at Michigan automotive OEMs. Coordinators use it daily for purchase orders, inventory tracking, and demand planning.', courses: ['SAP Learning Hub — Free, self-paced', 'Coursera: SAP Fundamentals (4 weeks)', 'MCCCD SAP Certificate Program'], prep: 'Start with SAP Learning Hub\'s free S/4HANA Supply Chain path (40–60 hrs). Most employers accept self-certification for entry roles.' },
          { id: 'r1i1s2', name: 'Demand Forecasting', detail: 'Uses historical data and market signals to predict future inventory needs, reducing overstock and stockouts across multi-tier supply chains.', courses: ['MIT OpenCourseWare: Supply Chain Analytics — Free', 'LinkedIn Learning: Demand Planning Fundamentals', 'APICS CPIM Certification Prep'], prep: 'Start with Excel FORECAST.ETS function. Progress to Power BI dashboards. APICS CPIM is the gold standard credential.' },
          { id: 'r1i1s3', name: 'Vendor Management', detail: 'Covers supplier selection, contract negotiation, performance monitoring, and relationship management to ensure reliable, cost-competitive supply.', courses: ['ISM Principles of Supply Management — Free intro', 'Coursera: Procurement & Sourcing (3 weeks)', 'Michigan Works! Procurement Basics Workshop'], prep: 'ISM offers free intro modules. Their CPSM certification is recognized across Michigan manufacturers.' },
        ],
      },
      {
        id: 'r1i2', name: 'Healthcare & Medical Devices', acceptance: 54,
        description: 'Michigan\'s medical device sector is centered around Ann Arbor, Detroit, and Grand Rapids. Supply chain roles require FDA compliance knowledge. Stryker, Autocam Medical, and Gentex are major employers.',
        skills: [
          { id: 'r1i2s1', name: 'FDA Regulatory Basics', detail: 'Understanding FDA 21 CFR regulations for medical device supply chains is required for compliance coordinator roles.', courses: ['FDA Online Training Center — Free', 'RAPS: Regulatory Foundations Certificate', 'Coursera: Healthcare Regulatory Affairs (4 weeks)'], prep: 'FDA offers free online regulatory training at fda.gov/training. RAPS certificate takes 3–6 months, well-regarded by Michigan medical device employers.' },
          { id: 'r1i2s2', name: 'Cold Chain Logistics', detail: 'Manages temperature-sensitive products including pharmaceuticals, vaccines, and biologics through warehousing and transport.', courses: ['IQCP: Cold Chain Certification — industry standard', 'ASHP: Pharmaceutical Cold Chain Basics — Free', 'LinkedIn Learning: Pharmaceutical Supply Chain'], prep: 'IQCP Cold Chain certification is most recognized by Michigan healthcare logistics employers. ~20 hours of study and a proctored exam.' },
        ],
      },
      {
        id: 'r1i3', name: 'E-Commerce & Fulfillment', acceptance: 67,
        description: 'Amazon, UPS, and regional 3PL providers in Michigan are rapidly scaling fulfillment operations. High demand for coordinators with warehouse operations and WMS experience. Lower barriers than automotive.',
        skills: [
          { id: 'r1i3s1', name: 'Warehouse Mgmt Systems', detail: 'WMS platforms like Manhattan Associates and Oracle WMS manage inventory location, picking, packing, and shipping workflows in fulfillment centers.', courses: ['Manhattan Associates Academy — Free', 'Oracle WMS Cloud Training — Free', 'Michigan Works!: WMS Essentials Workshop'], prep: 'Manhattan Associates and Oracle offer free WMS training portals accessible without employer sponsorship.' },
          { id: 'r1i3s2', name: 'Last-Mile Optimization', detail: 'Improves the final delivery leg using route planning software, carrier management, and real-time tracking to reduce cost-per-delivery.', courses: ['Coursera: Last Mile Delivery & Logistics (3 weeks)', 'Google Certificate: Data Analytics for Logistics', 'FedEx Supply Chain Institute — Free'], prep: 'Google\'s Data Analytics certificate (6 months, $49/month) is widely accepted by Michigan 3PL employers.' },
        ],
      },
    ],
  },
  {
    id: 'r2', title: 'Operations Manager', matchPct: 87,
    salaryRange: '$68,000 – $105,000',
    definition: 'Leads day-to-day operations including production planning, team management, quality oversight, and continuous improvement. Michigan operations managers earn 12% above national average due to manufacturing density.',
    industries: [
      {
        id: 'r2i1', name: 'Advanced Manufacturing', acceptance: 82,
        description: 'Michigan has 14,000+ manufacturing establishments. Advanced manufacturing blends traditional production management with automation, robotics oversight, and digital systems administration.',
        skills: [
          { id: 'r2i1s1', name: 'Lean Six Sigma', detail: 'Combines waste reduction (Lean) with defect elimination (Six Sigma) to systematically improve operational processes. Green Belt is standard for operations manager roles.', courses: ['ASQ: Lean Six Sigma Green Belt — self-paced', 'Coursera: Six Sigma Yellow Belt — Free audit', 'Michigan Works! Lean 101 Workshop — Free'], prep: 'Start with free Yellow Belt (8 hrs). Green Belt prep takes 3–4 months. ASQ exam vouchers available through Michigan Works! partnerships.' },
          { id: 'r2i1s2', name: 'Production Planning', detail: 'Balances capacity, materials, and labor to meet demand using MRP systems and finite capacity scheduling tools.', courses: ['APICS: Production & Inventory Management (CPIM)', 'Coursera: Manufacturing Operations (3 weeks)', 'MIT OpenCourseWare: Operations Management — Free'], prep: 'APICS CPIM is the most recognized credential. Many manufacturers reimburse exam fees for promoted employees.' },
        ],
      },
      {
        id: 'r2i2', name: 'Defense & Aerospace', acceptance: 61,
        description: 'Michigan defense contractors including L3 Technologies, DRS Technologies, and General Dynamics Land Systems need operations managers with precision quality and security clearance eligibility.',
        skills: [
          { id: 'r2i2s1', name: 'AS9100 Quality Standards', detail: 'AS9100 is the aerospace quality management standard. Operations managers in defense manufacturing must understand or lead AS9100 compliance audits.', courses: ['ASQ: AS9100 Overview — Free webinar', 'IAQG: Aerospace Quality Mgmt Certificate', 'LinkedIn Learning: Quality Management Systems'], prep: 'IAQG certificate is preferred by Michigan aerospace employers. Pair with AS9100 internal auditor training (~$400) for maximum hiring impact.' },
          { id: 'r2i2s2', name: 'DoD Contracting Basics', detail: 'Understanding federal acquisition regulations and DoD contract types is valuable for operations managers on government defense contracts.', courses: ['DAU: Introduction to DoD Contracting — Free', 'Coursera: Government Contracting Fundamentals', 'Michigan PTAC: Defense Workshop — Free'], prep: 'DAU offers completely free online courses at dau.edu. Michigan PTAC runs free quarterly workshops for defense contract newcomers.' },
        ],
      },
    ],
  },
  {
    id: 'r3', title: 'Quality Assurance Engineer', matchPct: 84,
    salaryRange: '$58,000 – $88,000',
    definition: 'Develops and maintains quality management systems, conducts inspections and audits, investigates defects, and drives corrective action to ensure products meet specifications and regulatory standards.',
    industries: [
      {
        id: 'r3i1', name: 'Automotive Manufacturing', acceptance: 85,
        description: 'IATF 16949 quality systems are mandatory for Michigan automotive suppliers. QA engineers with production floor experience are preferred by Tier 1 suppliers like Magna, BorgWarner, and Aptiv.',
        skills: [
          { id: 'r3i1s1', name: 'IATF 16949 / APQP', detail: 'Advanced Product Quality Planning is the automotive standard for new product launches. Understanding APQP/PPAP documentation is required for Tier 1 supplier QA roles.', courses: ['AIAG: APQP & PPAP Training — industry standard', 'ASQ: Automotive Quality Certificate', 'Coursera: Quality Mgmt in Manufacturing'], prep: 'AIAG is the definitive training source. Their APQP reference manual ($25) is used on the job. Most employers pay for AIAG training.' },
          { id: 'r3i1s2', name: 'Statistical Process Control', detail: 'Uses control charts and statistical tools to monitor production processes and detect variation before defects occur.', courses: ['ASQ: SPC Fundamentals — Free intro module', 'LinkedIn Learning: SPC for Beginners', 'MIT: Statistics for QC — Free (OCW)'], prep: 'Start with ASQ\'s free SPC intro. Minitab software (free 30-day trial) is the industry standard. Most Michigan automotive QA roles list Minitab as preferred.' },
        ],
      },
      {
        id: 'r3i2', name: 'Food & Beverage', acceptance: 58,
        description: 'Michigan food manufacturers including Kellogg\'s, Post Consumer Brands, and regional co-packers need QA engineers with FDA food safety and HACCP expertise. Battle Creek and Grand Rapids are primary hubs.',
        skills: [
          { id: 'r3i2s1', name: 'HACCP & Food Safety', detail: 'Hazard Analysis Critical Control Points is the FDA-required food safety management system. QA engineers must understand HACCP plan development, validation, and verification.', courses: ['FDA HACCP Training — Free at fda.gov', 'Cornell: HACCP Certificate — online', 'MSU Extension: Food Safety Fundamentals — Free'], prep: 'FDA\'s free online HACCP training is the starting point. Cornell\'s online certificate ($450) is recognized by Michigan food manufacturers (3–4 weeks).' },
        ],
      },
    ],
  },
  {
    id: 'r4', title: 'Logistics Analyst', matchPct: 79,
    salaryRange: '$50,000 – $72,000',
    definition: 'Analyzes transportation, warehouse, and distribution data to identify cost savings and process improvements. Uses data tools to model scenarios and recommend logistics network changes.',
    industries: [
      {
        id: 'r4i1', name: 'Retail & Consumer Goods', acceptance: 63,
        description: 'Michigan retail and CPG companies including Meijer, SpartanNash, and Whirlpool need logistics analysts who can optimize omnichannel distribution networks. Lower experience barriers than automotive.',
        skills: [
          { id: 'r4i1s1', name: 'Power BI / Tableau', detail: 'Data visualization tools used to build logistics dashboards tracking KPIs like on-time delivery, cost per mile, and warehouse utilization.', courses: ['Microsoft Learn: Power BI — Free, self-paced', 'Tableau Public Training — Free', 'Coursera: Data Visualization (4 weeks)'], prep: 'Power BI Desktop is free to download. Microsoft Learn offers an 8-hour fundamentals path. Michigan employers prefer Power BI for supply chain roles.' },
          { id: 'r4i1s2', name: 'Transportation Mgmt', detail: 'TMS platforms manage carrier selection, rate shopping, load planning, and shipment tracking to optimize freight spend across inbound and outbound networks.', courses: ['MercuryGate TMS Training — Free trial', 'Coursera: Transportation & Logistics (3 weeks)', 'CSCMP: Supply Chain Fundamentals'], prep: 'MercuryGate and Oracle TMS offer free sandbox environments. CSCMP Supply Chain Fundamentals certificate ($295) is well-recognized by Michigan logistics employers.' },
        ],
      },
    ],
  },
]

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

export default function CareerPathwayMap({ color = '#1a6bff' }) {
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

  const selectedRoleData = ROLES.find(r => r.id === selectedRole) ?? null
  const selectedIndData  = selectedRoleData?.industries.find(i => i.id === selectedInd) ?? null

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

    ROLES.forEach(role => {
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
  }, [selectedRole, selectedInd, color, selectedRoleData, selectedIndData])

  // ── Center child columns on their parent node, then redraw SVG ───────────
  // Runs after every render so it catches inline expand animations too.
  useLayoutEffect(() => {
    const mapEl = mapRef.current
    if (!mapEl) { drawLines(); return }
    const mr = mapEl.getBoundingClientRect()

    // Step 1: center industries column on the selected role node
    if (selectedRole && indColRef.current && roleRefs.current[selectedRole]) {
      const rr = roleRefs.current[selectedRole].getBoundingClientRect()
      const roleCenter = rr.top - mr.top + rr.height / 2
      const colH = indColRef.current.offsetHeight
      indColRef.current.style.marginTop = `${Math.max(0, roleCenter - colH / 2)}px`
    }

    // Step 2: center skills column on the selected industry node
    // Measured after step 1 so industry node position accounts for the new indCol offset.
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

  // ── Smooth pan: slide map so the newly-revealed column is visible ────────
  useEffect(() => {
    if (!selectedRole) return
    const t = setTimeout(() => {
      const scrollEl = scrollRef.current
      const colEl    = indColRef.current
      if (!scrollEl || !colEl) return
      // Place industries column so it starts at ~40% from left (role visible on left)
      const targetLeft = colEl.offsetLeft - scrollEl.clientWidth * 0.4
      scrollEl.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
    }, 80)
    return () => clearTimeout(t)
  }, [selectedRole])

  useEffect(() => {
    if (!selectedInd) return
    const t = setTimeout(() => {
      const scrollEl = scrollRef.current
      const colEl    = skillColRef.current
      if (!scrollEl || !colEl) return
      // Place skills column so it starts at ~40% from left
      const targetLeft = colEl.offsetLeft - scrollEl.clientWidth * 0.4
      scrollEl.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
    }, 80)
    return () => clearTimeout(t)
  }, [selectedInd])

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
            <div className="cpm-node-count">{USER_SKILLS.length} skills · click to expand</div>
            {skillsOpen && (
              <button className="cpm-x" onClick={e => { e.stopPropagation(); setSkillsOpen(false) }}>×</button>
            )}

            <ExpandSection open={skillsOpen}>
              <div className="cpm-divider" />
              <div className="cpm-tag-grid">
                {USER_SKILLS.map((s, i) => (
                  <span key={i} className="cpm-tag">{s}</span>
                ))}
              </div>
            </ExpandSection>
          </div>
        </div>

        {/* ── Col 2: Career Pathways hub ── */}
        <div className="cpm-col">
          <ColHeader step="2" label="AI Match" />
          <div className="cpm-node cpm-node-hub" ref={hubRef}>
            <div className="cpm-hub-pulse" />
            <div className="cpm-hub-pulse cpm-hub-pulse-2" />
            <div className="cpm-node-title">Career Pathways</div>
            <div className="cpm-node-sub">AI‑Matched</div>
          </div>
        </div>

        {/* ── Col 3: Roles ── */}
        <div className="cpm-col cpm-col-roles">
          <ColHeader step="3" label="Job Roles" />
          {ROLES.map(role => {
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
            {selectedIndData.skills.map(sk => {
              const isOpen = expandedSkill === sk.id
              return (
                <div key={sk.id}
                  ref={el => { skillRefs.current[sk.id] = el }}
                  className={`cpm-node cpm-node-skill${isOpen ? ' cpm-selected' : ''}`}
                  onClick={() => onSkillClick(sk)}
                >
                  <div className="cpm-skill-label">Required Skill</div>
                  <div className="cpm-node-title">{sk.name}</div>
                  {!isOpen && <div className="cpm-skill-cta">Click to see courses →</div>}
                  {isOpen && (
                    <button className="cpm-x" onClick={e => { e.stopPropagation(); setExpandedSkill(null) }}>×</button>
                  )}

                  <ExpandSection open={isOpen}>
                    <div className="cpm-divider" />
                    <p className="cpm-expand-text">{sk.detail}</p>
                    <div className="cpm-courses-label">Top Courses & Resources</div>
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
