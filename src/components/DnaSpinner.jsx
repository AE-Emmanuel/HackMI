import { useEffect, useRef } from 'react'

// Horizontal DNA loader — used on loading screens
export default function DnaSpinner({ width = 260, height = 60, color = '#1a6bff', speed = 1 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const amplitude = height * 0.30
    const cy = height / 2
    const frequency = 0.022
    const step = 5
    let frame = 0
    let animId

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      const rungs = []
      for (let x = 0; x < width; x += step) {
        const phase = x * frequency - frame * 0.028 * speed
        const y1 = cy + Math.sin(phase) * amplitude
        const y2 = cy + Math.sin(phase + Math.PI) * amplitude
        rungs.push({ x, y1, y2, phase })
      }

      // Rungs
      rungs.forEach(({ x, y1, y2, phase }) => {
        const interval = Math.PI / 3
        const mod = ((phase % interval) + interval) % interval
        if (mod < 0.2) {
          const alpha = 1 - mod / 0.2
          ctx.beginPath()
          ctx.moveTo(x, y1)
          ctx.lineTo(x, y2)
          ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${alpha * 0.38})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      })

      // Strand 1
      ctx.beginPath()
      rungs.forEach(({ x, y1 }, i) => {
        i === 0 ? ctx.moveTo(x, y1) : ctx.lineTo(x, y1)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()

      // Strand 2
      ctx.beginPath()
      rungs.forEach(({ x, y2 }, i) => {
        i === 0 ? ctx.moveTo(x, y2) : ctx.lineTo(x, y2)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 2.4
      ctx.stroke()

      // Nodes strand 1
      rungs.forEach(({ x, y1, phase }) => {
        const interval = Math.PI / 2
        const mod = ((phase % interval) + interval) % interval
        if (mod < 0.22) {
          ctx.beginPath()
          ctx.arc(x, y1, 3.2, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }
      })

      // Nodes strand 2
      rungs.forEach(({ x, y2, phase }) => {
        const interval = Math.PI / 2
        const mod = (((phase + Math.PI) % interval) + interval) % interval
        if (mod < 0.22) {
          ctx.beginPath()
          ctx.arc(x, y2, 3.2, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }
      })

      frame++
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [width, height, color, speed])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block' }}
    />
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
