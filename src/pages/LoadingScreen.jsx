import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DnaSpinner from '../components/DnaSpinner'
import '../styles/loading.css'

export default function LoadingScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/resume')
    }, 900)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="loading-root">
      <DnaSpinner width={220} height={52} color="#1a6bff" speed={1} />
    </div>
  )
}
