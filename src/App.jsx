import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import LandingPage from './pages/LandingPage'
import LoadingScreen from './pages/LoadingScreen'
import ResumePage from './pages/ResumePage'
import ResultsPage from './pages/ResultsPage'

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/loading" element={<LoadingScreen />} />
        <Route path="/resume" element={<ResumePage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </ThemeProvider>
  )
}
