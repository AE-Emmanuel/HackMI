import { useNavigate } from 'react-router-dom'
import DnaLetterI from './DnaLetterI'
import { useTheme } from '../context/ThemeContext'
import './SkilldnaLogo.css'

export default function SkilldnaLogo() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const dnaColor = theme === 'dark' ? '#4d8fff' : '#1a6bff'

  return (
    <button className="skilldna-logo-btn" onClick={() => navigate('/')} title="Home">
      <span className="skilldna-logo-letters">SK</span>
      <span className="skilldna-logo-i">
        <DnaLetterI height={27} color={dnaColor} />
      </span>
      <span className="skilldna-logo-letters">LLDNA</span>
    </button>
  )
}
