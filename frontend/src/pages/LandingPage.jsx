// src/pages/LandingPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DnaLetterI from '../components/DnaLetterI'
import DnaHelix from '../components/DnaHelix'
import ThemeToggle from '../components/ThemeToggle'
import MichiganMapAnimation from '../components/MichiganMapAnimation'
import { useTheme } from '../context/ThemeContext'
import { fetchTrending, fetchMissedOpportunities } from '../api/client'
import '../styles/landing.css'

// Static fallback if the backend hasn't started yet.
const FALLBACK_SKILLS = [
  'Forklift Operation', 'Quality Control', 'Assembly Line Management',
  'Inventory Tracking', 'CNC Machine Operation', 'Logistics Coordination',
  'Safety Compliance', 'Team Leadership',
]

const FALLBACK_INSIGHTS = [
  'Workers in Michigan often overlook adjacent supply-chain analytics roles despite a strong baseline match.',
  'EV battery + grid-integration roles are surging across Southeast Michigan.',
]

// Refresh trending feed every 6 minutes, missed-opportunities every 2.
const TRENDING_REFRESH_MS = 6 * 60 * 1000
const INSIGHTS_REFRESH_MS = 2 * 60 * 1000

export default function LandingPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0)
  const [fade, setFade] = useState(true)

  const [skills, setSkills] = useState(FALLBACK_SKILLS)
  const [insights, setInsights] = useState(FALLBACK_INSIGHTS)
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0)
  const insightTimerRef = useRef(null)

  const dnaColor = theme === 'dark' ? '#4d8fff' : '#9fd6ff'

  // --- Cycle through the trending-skills line ---
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setCurrentSkillIndex((i) => (i + 1) % skills.length)
        setFade(true)
      }, 350)
    }, 2200)
    return () => clearInterval(interval)
  }, [skills])

  // --- Fetch trending skills from the API + refresh periodically ---
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchTrending(12)
        if (cancelled) return
        const list = (data?.rising ?? []).map((r) => r.skill).filter(Boolean)
        if (list.length) {
          setSkills(list)
          setCurrentSkillIndex(0)
        }
      } catch {
        // Keep fallback list if the backend is down.
      }
    }
    load()
    const t = setInterval(load, TRENDING_REFRESH_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // --- Fetch missed-opportunities insights + cycle them ---
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchMissedOpportunities(4)
        if (cancelled) return
        const list = (data?.insights ?? [])
          .map((i) => i.sentence)
          .filter(Boolean)
        if (list.length) {
          setInsights(list)
          setCurrentInsightIndex(0)
        }
      } catch {
        // Keep fallback insights if the backend is down.
      }
    }
    load()
    const refresh = setInterval(load, INSIGHTS_REFRESH_MS)

    // Rotate through the current insights every 7 seconds so a single load
    // gives the user multiple lines.
    insightTimerRef.current = setInterval(() => {
      setCurrentInsightIndex((i) => (i + 1) % Math.max(insights.length, 1))
    }, 7000)
    return () => {
      cancelled = true
      clearInterval(refresh)
      if (insightTimerRef.current) clearInterval(insightTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insights.length])

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
              {skills[currentSkillIndex]}
            </span>
          </div>
          <span className="skill-cycler-label">that transfer directly into future industries.</span>
        </div>

        <button className="try-me-btn" onClick={() => navigate('/resume')}>
          Try Me
          <span className="try-me-arrow">→</span>
        </button>

        {/* Subtle "what workers overlook" rotator under the CTA */}
        {insights.length > 0 && (
          <div className="landing-insight-wrap">
            <span className="landing-insight-label">
              ☼ While you&apos;re here:
            </span>
            <p key={currentInsightIndex} className="landing-insight-text">
              {insights[currentInsightIndex]}
            </p>
          </div>
        )}
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
