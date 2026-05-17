import { useEffect, useRef } from 'react'

export default function DnaHelix({ width = 800, height = 80, color = '#1a6bff', speed = 1 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame = 0
    let animId

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const amplitude = canvas.height * 0.32
      const cy = canvas.height / 2
      const frequency = 0.018
      const step = 6
      const rungs = []

      // Collect rung data first for layering
      for (let x = 0; x < canvas.width; x += step) {
        const phase = x * frequency - frame * 0.024 * speed
        const y1 = cy + Math.sin(phase) * amplitude
        const y2 = cy + Math.sin(phase + Math.PI) * amplitude
        rungs.push({ x, y1, y2, phase })
      }

      // Draw rungs (cross-links) behind strands
      rungs.forEach(({ x, y1, y2, phase }) => {
        const interval = Math.PI / 3
        const mod = ((phase % interval) + interval) % interval
        if (mod < 0.18) {
          const alpha = 1 - mod / 0.18
          ctx.beginPath()
          ctx.moveTo(x, y1)
          ctx.lineTo(x, y2)
          ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${alpha * 0.35})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      })

      // Draw strand 1 (front)
      ctx.beginPath()
      rungs.forEach(({ x, y1 }, i) => {
        i === 0 ? ctx.moveTo(x, y1) : ctx.lineTo(x, y1)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()

      // Draw strand 2
      ctx.beginPath()
      rungs.forEach(({ x, y2 }, i) => {
        i === 0 ? ctx.moveTo(x, y2) : ctx.lineTo(x, y2)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Draw nodes on strand 1
      rungs.forEach(({ x, y1, phase }) => {
        const interval = Math.PI / 2
        const mod = ((phase % interval) + interval) % interval
        if (mod < 0.22) {
          ctx.beginPath()
          ctx.arc(x, y1, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }
      })

      // Draw nodes on strand 2
      rungs.forEach(({ x, y2, phase }) => {
        const interval = Math.PI / 2
        const mod = (((phase + Math.PI) % interval) + interval) % interval
        if (mod < 0.22) {
          ctx.beginPath()
          ctx.arc(x, y2, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }
      })

      frame++
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [color, speed])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', width: '100%', height: `${height}px` }}
    />
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
