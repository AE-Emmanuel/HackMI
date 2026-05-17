// src/pages/LandingPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DnaLetterI from '../components/DnaLetterI'
import DnaHelix from '../components/DnaHelix'
import ThemeToggle from '../components/ThemeToggle'
import MichiganMapAnimation from '../components/MichiganMapAnimation'
import { useTheme } from '../context/ThemeContext'
import '../styles/landing.css'

const SKILLS = [
  'Forklift Operation',
  'Quality Control',
  'Assembly Line Management',
  'Inventory Tracking',
  'CNC Machine Operation',
  'Logistics Coordination',
  'Safety Compliance',
  'Team Leadership',
  'Process Optimization',
  'Data Entry & Reporting',
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0)
  const [fade, setFade] = useState(true)

  const dnaColor = theme === 'dark' ? '#4d8fff' : '#9fd6ff'

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setCurrentSkillIndex((i) => (i + 1) % SKILLS.length)
        setFade(true)
      }, 350)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="landing-root">
      {/* Map fills the full screen behind everything */}
      <div className="map-layer">
        <MichiganMapAnimation theme={theme} />
      </div>

      <div className="landing-topbar">
        <div className="landing-topbar-spacer" />
        <ThemeToggle />
      </div>

      <main className="landing-main">
        <div className="landing-title-wrap">
          <h1 className="landing-title">
            <span className="title-letters">SK</span>
            <span className="title-i-wrap">
              <DnaLetterI height={82} color={dnaColor} />
            </span>
            <span className="title-letters">LLDNA</span>
          </h1>
        </div>

        <div className="landing-tagline-wrap">
          <p className="landing-tagline">
            Your skills already open more doors than you think.
          </p>
          <p className="landing-sub">
            AI-powered workforce intelligence for Michigan&apos;s evolving economy.
          </p>
        </div>

        <div className="skill-cycler-wrap">
          <span className="skill-cycler-label">Workers in Michigan already have skills like</span>
          <div className="skill-cycler-badge">
            <span className={`skill-cycler-text ${fade ? 'fade-in' : 'fade-out'}`}>
              {SKILLS[currentSkillIndex]}
            </span>
          </div>
          <span className="skill-cycler-label">that transfer directly into future industries.</span>
        </div>

        <button className="try-me-btn" onClick={() => navigate('/loading')}>
          Try Me
          <span className="try-me-arrow">→</span>
        </button>
      </main>

      {/* DNA strip pinned to the very bottom of the viewport, sits below the map */}
      <div
        className="landing-dna-strip"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          background: 'transparent',
          pointerEvents: 'none',
        }}
      >
        <DnaHelix width={1800} height={72} color={dnaColor} speed={0.22} />
      </div>
    </div>
  )
}
