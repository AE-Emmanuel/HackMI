import { useRef, useState } from 'react'
import SkillSidePanel from './SkillSidePanel'
import './SkillNetworkMap.css'

// ── SVG coordinate system ──────────────────────────────────────────────────
const VW   = 1000
const VH   = 580
const LX   = 195   // left-column node x
const CX   = 500   // centre (eval) node x
const RX   = 805   // right-column node x
const NR   = 10    // skill node radius
const CNR  = 22    // eval-node radius
const PW   = 155   // pill width
const PH   = 28    // pill height

const trunc = (s, n = 17) => (s.length > n ? s.slice(0, n) + '…' : s)

function colY(count, idx, topPad = 50, botPad = 50) {
  const span = VH - topPad - botPad
  return count === 1 ? VH / 2 : topPad + (idx / (count - 1)) * span
}

// Smooth S-curve between two points
function sCurve(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`
}

export default function SkillNetworkMap({ userSkills, suggestedSkills, color = '#1a6bff' }) {
  const svgRef  = useRef(null)
  const [panel, setPanel] = useState(null)   // { skill, screenY }
  const [hoverSkill, setHoverSkill] = useState(null)

  // Pre-compute node positions
  const leftNodes  = userSkills.map((s, i) => ({
    ...s, x: LX, y: colY(userSkills.length, i, 45, 45),
  }))
  const rightNodes = suggestedSkills.map((s, i) => ({
    ...s, x: RX, y: colY(suggestedSkills.length, i, 35, 35),
  }))
  const evalNode = { x: CX, y: VH / 2 }

  const openPanel = (skill, svgY) => {
    if (!svgRef.current) return
    const rect  = svgRef.current.getBoundingClientRect()
    const scale = rect.height / VH
    const screenY = rect.top + window.scrollY + svgY * scale
    setPanel({ skill, screenY, containerRight: rect.right })
  }

  const rgb = hexToRgb(color)

  return (
    <>
      <div className="snm-container">
        {/* Column labels */}
        <div className="snm-label snm-label-left">Your Skills</div>
        <div className="snm-label snm-label-center">Skill DNA<br/>Evaluator</div>
        <div className="snm-label snm-label-right">Suggested Skills</div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          className="snm-svg"
        >
          <defs>
            {/* Animated gradient for lines */}
            <linearGradient id="line-grad-l" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity={0.25}/>
              <stop offset="100%" stopColor={color} stopOpacity={0.65}/>
            </linearGradient>
            <linearGradient id="line-grad-r" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity={0.65}/>
              <stop offset="100%" stopColor={color} stopOpacity={0.2}/>
            </linearGradient>
            <filter id="node-glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="eval-glow">
              <feGaussianBlur stdDeviation="6" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* ── Left → Eval lines ── */}
          {leftNodes.map((n, i) => (
            <path key={`ll-${i}`}
              d={sCurve(n.x + NR, n.y, CX - CNR, evalNode.y)}
              stroke="url(#line-grad-l)"
              strokeWidth={hoverSkill === n.id ? 2 : 1.2}
              fill="none"
              className="snm-line snm-line-left"
              strokeOpacity={hoverSkill && hoverSkill !== n.id ? 0.2 : 1}
            />
          ))}

          {/* ── Eval → Right lines ── */}
          {rightNodes.map((n, i) => (
            <path key={`rl-${i}`}
              d={sCurve(CX + CNR, evalNode.y, n.x - NR, n.y)}
              stroke="url(#line-grad-r)"
              strokeWidth={hoverSkill === n.id ? 2.2 : 1.2}
              fill="none"
              className="snm-line snm-line-right"
              strokeOpacity={hoverSkill && hoverSkill !== n.id ? 0.15 : 1}
            />
          ))}

          {/* ── Left (user) nodes ── */}
          {leftNodes.map((n) => (
            <g key={n.id} className="snm-node"
              onMouseEnter={() => setHoverSkill(n.id)}
              onMouseLeave={() => setHoverSkill(null)}
            >
              {/* Pill label LEFT of node */}
              <rect x={n.x - NR - 10 - PW} y={n.y - PH / 2}
                width={PW} height={PH} rx={PH / 2}
                fill={color} fillOpacity={0.08}
                stroke={color} strokeOpacity={0.45} strokeWidth={1.2} />
              <text x={n.x - NR - 10 - PW / 2} y={n.y + 4.5}
                textAnchor="middle" fontSize={11} fontWeight={600}
                fill={color} fontFamily="Inter,sans-serif">
                {trunc(n.name)}
              </text>
              {/* Glow */}
              <circle cx={n.x} cy={n.y} r={NR + 6} fill={color} fillOpacity={0.1}/>
              {/* Node */}
              <circle cx={n.x} cy={n.y} r={NR} fill={color}
                filter="url(#node-glow)" className="snm-node-circle"/>
              <circle cx={n.x} cy={n.y} r={NR - 3.5} fill="white" fillOpacity={0.3}/>
            </g>
          ))}

          {/* ── Eval node (centre) ── */}
          <g className="snm-eval-node">
            <circle cx={CX} cy={evalNode.y} r={CNR + 12}
              fill={color} fillOpacity={0.08} className="snm-eval-pulse"/>
            <circle cx={CX} cy={evalNode.y} r={CNR + 6}
              fill={color} fillOpacity={0.12}/>
            <circle cx={CX} cy={evalNode.y} r={CNR}
              fill={color} filter="url(#eval-glow)"/>
            <circle cx={CX} cy={evalNode.y} r={CNR - 7}
              fill="white" fillOpacity={0.38}/>
            <text x={CX} y={evalNode.y + 4.5}
              textAnchor="middle" fontSize={9} fontWeight={800}
              fill={color} fontFamily="Inter,sans-serif" letterSpacing={0.5}>
              AI
            </text>
          </g>

          {/* ── Right (suggested) nodes — clickable ── */}
          {rightNodes.map((n) => (
            <g key={n.id} className="snm-node snm-node-right"
              onClick={() => openPanel(n, n.y)}
              onMouseEnter={() => setHoverSkill(n.id)}
              onMouseLeave={() => setHoverSkill(null)}
            >
              <circle cx={n.x} cy={n.y} r={NR + 6} fill={color} fillOpacity={0.08}/>
              <circle cx={n.x} cy={n.y} r={NR} fill={color} fillOpacity={0.72}
                filter="url(#node-glow)" className="snm-node-circle"/>
              <circle cx={n.x} cy={n.y} r={NR - 3.5} fill="white" fillOpacity={0.22}/>
              {/* Pill label RIGHT of node */}
              <rect x={n.x + NR + 10} y={n.y - PH / 2}
                width={PW} height={PH} rx={PH / 2}
                fill={color} fillOpacity={0.07}
                stroke={color} strokeOpacity={0.38} strokeWidth={1.2}/>
              <text x={n.x + NR + 10 + PW / 2} y={n.y + 4.5}
                textAnchor="middle" fontSize={11} fontWeight={600}
                fill={color} fillOpacity={0.88} fontFamily="Inter,sans-serif">
                {trunc(n.name)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {panel && (
        <SkillSidePanel
          skill={panel.skill}
          screenY={panel.screenY}
          onClose={() => setPanel(null)}
        />
      )}
    </>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
