// src/components/MichiganMapAnimation.jsx
// Props:
//   theme — "light" | "dark"  (pass from LandingPage via useTheme)

export default function MichiganMapAnimation({ theme = 'dark', style, className }) {
  const dark = theme === 'dark'

  // ── Map palette ─────────────────────────────────────────────────────────────
  const bg         = dark ? '#0c1c2e' : '#e8f0f8'
  const gridStroke = dark ? '#15304d' : '#c2d4e8'
  const stateFill  = dark ? '#1b3b5d' : '#c8daf0'
  const stateEdge  = dark ? '#3d6d9a' : '#7aaad4'
  const vigStop0   = dark ? '#0c1c2e' : '#e8f0f8'

// ── Michigan palette — amber (dark) / electric blue (light) ─────────────────
const miFill      = dark ? '#c58a2a' : '#1f6fff'   // MI body
const miStroke    = dark ? '#e8b24a' : '#8bc4ff'   // MI border
const ringColor   = dark ? '#c08a2f' : '#4aa3ff'   // radar rings
const glowInner   = dark ? '#d39a35' : '#2f6ff6'   // inner glow
const glowOuter   = dark ? '#b87416' : '#7dc3ff'   // outer glow
const cursorFill  = dark ? '#07111e' : '#c8daf0'
const cursorEdge  = dark ? '#ffffff'  : '#1a3a5c'


  const miX = 657
  const miY = 186

  const css = `
    @keyframes radarPulse {
      0%   { transform: scale(0.04); opacity: 0.85; }
      100% { transform: scale(1);    opacity: 0;    }
    }
    @keyframes miGlow {
      0%, 100% {
        filter: drop-shadow(0 0 6px ${glowInner}) drop-shadow(0 0 12px ${glowInner});
      }
      50% {
        filter: drop-shadow(0 0 18px ${glowOuter}) drop-shadow(0 0 36px ${glowInner})
                drop-shadow(0 0 55px ${glowInner});
      }
    }
    @keyframes cursorFloat {
      0%, 100% { transform: translate(0, 0);     }
      50%       { transform: translate(2px, 3px); }
    }
    @keyframes gridShimmer {
      0%, 100% { opacity: 0.45; }
      50%       { opacity: 0.65; }
    }

    .mi-shape    { animation: miGlow      2s   ease-in-out infinite; }
    .ring-1      { animation: radarPulse  2.4s ease-out    infinite;       transform-origin: ${miX}px ${miY}px; }
    .ring-2      { animation: radarPulse  2.4s ease-out    0.62s infinite; transform-origin: ${miX}px ${miY}px; }
    .ring-3      { animation: radarPulse  2.4s ease-out    1.24s infinite; transform-origin: ${miX}px ${miY}px; }
    .cursor-icon { animation: cursorFloat 2s   ease-in-out infinite; }
    .map-grid    { animation: gridShimmer 4s   ease-in-out infinite; }
  `

  return (
    <div
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, ...style }}
    >
      <style>{css}</style>

      <svg
        viewBox="0 0 960 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <radialGradient id="sonarFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={dark ? '#0c1c2e' : '#e8f0f8'} stopOpacity="0.55" />
            <stop offset="100%" stopColor={dark ? '#0c1c2e' : '#e8f0f8'} stopOpacity="0"    />
          </radialGradient>
          <radialGradient id="bgVignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%"   stopColor={vigStop0} stopOpacity="0"    />
            <stop offset="100%" stopColor={vigStop0} stopOpacity="0.72" />
          </radialGradient>
        </defs>

        {/* ── Background ── */}
        <rect width="960" height="600" fill={bg} />

        {/* ── Grid ── */}
        <g className="map-grid" stroke={gridStroke} strokeWidth="0.55">
          {Array.from({ length: 25 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 25} x2="960" y2={i * 25} />
          ))}
          {Array.from({ length: 39 }, (_, i) => (
            <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="600" />
          ))}
        </g>

        {/* ── US States ── */}
        <g fill={stateFill} stroke={stateEdge} strokeWidth="0.8" strokeLinejoin="round">
          {/* Pacific */}
          <polygon points="80,70  170,70  170,132 110,132 92,114  80,114"  />
          <polygon points="80,132 170,132 174,218 80,218"                  />
          <polygon points="80,218 174,218 180,250 168,296 150,352 138,396 80,380" />
          {/* Mountain */}
          <polygon points="174,70  252,70  252,202 174,218 174,132"        />
          <polygon points="252,70  422,70  422,158 252,158"                />
          <polygon points="252,158 402,158 402,232 252,232"                />
          <polygon points="174,218 252,202 252,342 174,342"                />
          <polygon points="252,202 296,202 296,340 252,342"                />
          <polygon points="296,232 402,232 402,308 296,308"                />
          <polygon points="174,342 252,342 252,436 174,436"                />
          <polygon points="296,308 402,308 402,442 296,442"                />
          {/* Plains */}
          <polygon points="362,70  502,70  502,142 362,142"                />
          <polygon points="362,142 502,142 502,212 362,212"                />
          <polygon points="372,212 500,212 500,272 372,272"                />
          <polygon points="372,272 502,272 502,328 372,328"                />
          <polygon points="372,328 522,328 522,382 372,382"                />
          <polygon points="296,382 532,382 532,492 340,492 308,456 294,424" />
          {/* Midwest */}
          <polygon points="468,70  602,70  602,188 538,188 468,174"        />
          <polygon points="470,210 602,210 602,272 470,272"                />
          <polygon points="472,272 612,272 612,342 472,342"                />
          <polygon points="474,342 598,342 598,402 474,402"                />
          <polygon points="462,402 598,402 596,470 462,470"                />
          {/* Great Lakes */}
          <polygon points="540,122 640,118 640,210 540,210"                />
          <polygon points="548,210 618,210 618,322 548,322"                />
          <polygon points="618,208 652,205 652,308 618,308"                />
          <polygon points="652,182 722,180 722,288 652,288"                />
          {/* South */}
          <polygon points="548,322 718,322 718,362 548,362"                />
          <polygon points="532,362 714,362 714,408 532,408"                />
          <polygon points="532,408 598,408 598,474 532,474"                />
          <polygon points="598,408 646,408 646,478 598,478"                />
          <polygon points="646,378 720,378 720,474 646,474"                />
          <polygon points="638,474 762,474 762,550 638,550"                />
          {/* Mid-Atlantic / Southeast */}
          <polygon points="670,345 752,345 752,380 670,380"                />
          <polygon points="654,295 792,292 792,348 715,348 654,325"        />
          <polygon points="716,252 810,248 810,300 716,302"                />
          <polygon points="660,248 716,248 716,298 660,298"                />
          {/* Northeast */}
          <polygon points="716,196 826,194 826,252 716,252"                />
          <polygon points="802,228 840,225 840,268 802,268"                />
          <polygon points="806,255 830,255 830,278 806,278"                />
          <polygon points="740,255 806,255 806,282 740,282"                />
          <polygon points="726,145 882,142 882,200 726,200"                />
          <polygon points="840,175 865,132 895,132 898,178 840,182"        />
          <polygon points="828,185 895,182 895,215 828,215"                />
          <polygon points="870,215 898,215 898,230 870,230"                />
          <polygon points="843,215 872,215 872,232 843,232"                />
          <polygon points="858,98  920,98  920,178 858,178"                />
        </g>

        {/* ── Michigan — electric blue (dark) / amber (light) ── */}
        <g className="mi-shape">
          <polygon
            points="578,108 682,108 680,140 618,145 580,135"
            fill={miFill} stroke={miStroke} strokeWidth="1.5"
          />
          <polygon
            points="618,145 650,142 660,150 676,162 694,154 702,160 702,174 685,176 686,196 688,220 680,228 658,230 636,220 618,200 616,175"
            fill={miFill} stroke={miStroke} strokeWidth="1.5"
          />
        </g>

        {/* ── Radar rings ── */}
        <circle className="ring-1" cx={miX} cy={miY} r="148" fill="none" stroke={ringColor} strokeWidth="2.5" />
        <circle className="ring-2" cx={miX} cy={miY} r="148" fill="none" stroke={ringColor} strokeWidth="2"   />
        <circle className="ring-3" cx={miX} cy={miY} r="148" fill="none" stroke={ringColor} strokeWidth="1.5" />

        {/* ── Sonar bloom ── */}
        <circle cx={miX} cy={miY} r="85" fill="url(#sonarFade)" />

        {/* ── Floating cursor ── */}
        <g className="cursor-icon" transform={`translate(${miX + 20}, ${miY + 14})`}>
          <path
            d="M 0 0 L 0 26 L 7 20 L 12 30 L 15.5 28.5 L 10.5 18.5 L 19 18.5 Z"
            fill={cursorFill} stroke={cursorEdge} strokeWidth="1.5" strokeLinejoin="round"
          />
        </g>

        {/* ── Edge vignette ── */}
        <rect width="960" height="600" fill="url(#bgVignette)" />
      </svg>
    </div>
  )
}
