import { useEffect, useRef } from 'react'

export default function DnaLetterI({ height = 90, color = '#1a6bff' }) {
  const canvasRef = useRef(null)
  const width = height * 0.55

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame = 0
    let animId

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const cx = canvas.width / 2
      const topY = canvas.height * 0.06
      const botY = canvas.height * 0.94
      const amplitude = canvas.width * 0.38
      const frequency = 0.072
      const step = 3
      const points = []

      for (let y = topY; y <= botY; y += step) {
        const phase = y * frequency - frame * 0.03
        const x1 = cx + Math.sin(phase) * amplitude
        const x2 = cx + Math.sin(phase + Math.PI) * amplitude
        points.push({ y, x1, x2, phase })
      }

      // Rungs
      points.forEach(({ y, x1, x2, phase }) => {
        const interval = Math.PI / 3
        const mod = ((phase % interval) + interval) % interval
        if (mod < 0.2) {
          const alpha = 1 - mod / 0.2
          ctx.beginPath()
          ctx.moveTo(x1, y)
          ctx.lineTo(x2, y)
          ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${alpha * 0.4})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      })

      // Strand 1
      ctx.beginPath()
      points.forEach(({ y, x1 }, i) => {
        i === 0 ? ctx.moveTo(x1, y) : ctx.lineTo(x1, y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 2.8
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()

      // Strand 2
      ctx.beginPath()
      points.forEach(({ y, x2 }, i) => {
        i === 0 ? ctx.moveTo(x2, y) : ctx.lineTo(x2, y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 2.8
      ctx.stroke()

      // Top & bottom caps (horizontal bar of the I)
      const capWidth = canvas.width * 0.72
      const capX = (canvas.width - capWidth) / 2
      ctx.beginPath()
      ctx.moveTo(capX, topY)
      ctx.lineTo(capX + capWidth, topY)
      ctx.strokeStyle = color
      ctx.lineWidth = 3.5
      ctx.lineCap = 'round'
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(capX, botY)
      ctx.lineTo(capX + capWidth, botY)
      ctx.stroke()

      // Nodes on strand 1
      points.forEach(({ y, x1, phase }) => {
        const interval = Math.PI / 2
        const mod = ((phase % interval) + interval) % interval
        if (mod < 0.22) {
          ctx.beginPath()
          ctx.arc(x1, y, 3, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }
      })

      // Nodes on strand 2
      points.forEach(({ y, x2, phase }) => {
        const interval = Math.PI / 2
        const mod = (((phase + Math.PI) % interval) + interval) % interval
        if (mod < 0.22) {
          ctx.beginPath()
          ctx.arc(x2, y, 3, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }
      })

      frame++
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [color, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'inline-block', verticalAlign: 'middle', marginBottom: '6px' }}
    />
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
