import { useState } from 'react'
import SkillDetailModal from './SkillDetailModal'
import './DnaSkillMap.css'

const PERIOD   = 220   // px between skill columns
const AMP      = 82    // amplitude from center
const CY       = 195   // center y
const H        = 440   // SVG height
const PAD      = 110   // left / right padding
const NODE_R   = 9
const PILL_W   = 148
const PILL_H   = 27

function buildStrand(totalW, flip) {
  const pts = []
  for (let x = 0; x <= totalW; x += 3) {
    const phase = (2 * Math.PI * (x - PAD)) / PERIOD
    const y = CY + (flip ? 1 : -1) * AMP * Math.cos(phase)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return `M ${pts.join(' L ')}`
}

const trunc = (s, n = 15) => (s.length > n ? s.slice(0, n) + '…' : s)

export default function DnaSkillMap({ userSkills, suggestedSkills, color = '#1a6bff' }) {
  const [selected, setSelected] = useState(null)

  const count      = Math.max(userSkills.length, suggestedSkills.length)
  const totalW     = PAD + count * PERIOD + PAD
  const topY       = CY - AMP   // top nodes sit here
  const botY       = CY + AMP   // bottom nodes sit here

  const d1 = buildStrand(totalW, false)
  const d2 = buildStrand(totalW, true)
  const nodeX = (i) => PAD + i * PERIOD

  return (
    <>
      <div className="dna-map-scroll">
        <svg width={totalW} height={H} style={{ overflow: 'visible' }}>

          {/* ── Section labels (left edge) ── */}
          <text x={8} y={topY - NODE_R - 18} fontSize={10} fontWeight={700}
            letterSpacing={1} fill={color} opacity={0.55} fontFamily="Inter,sans-serif">
            YOUR SKILLS
          </text>
          <text x={8} y={botY + NODE_R + 28} fontSize={10} fontWeight={700}
            letterSpacing={1} fill={color} opacity={0.45} fontFamily="Inter,sans-serif">
            SUGGESTED
          </text>

          {/* ── Base-pair rungs ── */}
          {Array.from({ length: count }).map((_, i) => (
            <line key={`rung-${i}`}
              x1={nodeX(i)} y1={topY}
              x2={nodeX(i)} y2={botY}
              stroke={color} strokeWidth={1}
              strokeOpacity={0.14} strokeDasharray="5 4" />
          ))}

          {/* ── Strand 1 ── */}
          <path d={d1} className="dna-strand strand-a"
            stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round"
            strokeDasharray="10 6" />

          {/* ── Strand 2 ── */}
          <path d={d2} className="dna-strand strand-b"
            stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round"
            strokeDasharray="10 6" />

          {/* ── User skill nodes (top) ── */}
          {userSkills.map((skill, i) => {
            const x = nodeX(i)
            return (
              <g key={skill.id} className="skill-node"
                onClick={() => setSelected({ ...skill, kind: 'user' })}>
                {/* glow ring */}
                <circle cx={x} cy={topY} r={NODE_R + 7} fill={color} opacity={0.1} className="node-glow" />
                {/* main dot */}
                <circle cx={x} cy={topY} r={NODE_R} fill={color} className="node-main" />
                <circle cx={x} cy={topY} r={NODE_R - 3.5} fill="white" opacity={0.32} />
                {/* pill label ABOVE */}
                <rect x={x - PILL_W / 2} y={topY - NODE_R - PILL_H - 12}
                  width={PILL_W} height={PILL_H} rx={PILL_H / 2}
                  fill={color} opacity={0.1}
                  stroke={color} strokeWidth={1.2} strokeOpacity={0.5} />
                <text x={x} y={topY - NODE_R - PILL_H - 12 + PILL_H / 2 + 4.5}
                  textAnchor="middle" fontSize={11} fontWeight={600}
                  fill={color} fontFamily="Inter,sans-serif">
                  {trunc(skill.name)}
                </text>
              </g>
            )
          })}

          {/* ── Suggested skill nodes (bottom) ── */}
          {suggestedSkills.map((skill, i) => {
            const x = nodeX(i)
            return (
              <g key={skill.id} className="skill-node"
                onClick={() => setSelected({ ...skill, kind: 'suggested' })}>
                <circle cx={x} cy={botY} r={NODE_R + 7} fill={color} opacity={0.08} className="node-glow" />
                <circle cx={x} cy={botY} r={NODE_R} fill={color} opacity={0.72} className="node-main" />
                <circle cx={x} cy={botY} r={NODE_R - 3.5} fill="white" opacity={0.22} />
                {/* pill label BELOW */}
                <rect x={x - PILL_W / 2} y={botY + NODE_R + 12}
                  width={PILL_W} height={PILL_H} rx={PILL_H / 2}
                  fill={color} opacity={0.07}
                  stroke={color} strokeWidth={1.2} strokeOpacity={0.38} />
                <text x={x} y={botY + NODE_R + 12 + PILL_H / 2 + 4.5}
                  textAnchor="middle" fontSize={11} fontWeight={600}
                  fill={color} opacity={0.88} fontFamily="Inter,sans-serif">
                  {trunc(skill.name)}
                </text>
              </g>
            )
          })}

        </svg>
      </div>

      {selected && (
        <SkillDetailModal skill={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
