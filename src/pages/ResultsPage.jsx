import { useNavigate } from 'react-router-dom'
import SkilldnaLogo from '../components/SkilldnaLogo'
import ThemeToggle from '../components/ThemeToggle'
import CareerPathwayMap from '../components/CareerPathwayMap'
import ChatBar from '../components/ChatBar'
import { useTheme } from '../context/ThemeContext'
import '../styles/results.css'

export default function ResultsPage() {
  const navigate  = useNavigate()
  const { theme } = useTheme()
  const dnaColor  = theme === 'dark' ? '#4d8fff' : '#1a6bff'

  return (
    <div className="results-root">

      {/* Top bar */}
      <div className="results-topbar">
        <SkilldnaLogo />
        <div className="results-topbar-right">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Heading */}
      <div className="results-heading">
        <h1 className="results-title">Your Career Pathway Map</h1>
        <p className="results-subtitle">
          Start from your skills → select a role → explore Michigan industries → discover what to learn next.
        </p>
      </div>

      {/* Career pathway tree — 3/4 of remaining height */}
      <div className="results-map-section">
        <CareerPathwayMap color={dnaColor} />
      </div>

      {/* Chat bar — 1/4 of remaining height */}
      <div className="results-chat-section">
        <ChatBar />
      </div>

    </div>
  )
}
