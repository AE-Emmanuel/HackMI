// src/components/DnaHelix.jsx
import { useEffect, useRef } from 'react'

export default function DnaHelix({
  width = 1800,
  height = 72,
  color = '#4d8fff',
  speed = 0.22,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let rafId
    const rgb = hexToRgb(color)

    const draw = (ts) => {
      const t = ts * 0.001
      ctx.clearRect(0, 0, width, height)

      const topPad = 10
      const bottomPad = 10
      const drawableH = height - topPad - bottomPad

      const cy = topPad + drawableH * 0.5
      const amp = drawableH * 0.5

      const freq = 0.012
      const step = 4
      const startX = -90
      const endX = width + 90

      const top = []
      const bot = []

      for (let x = startX; x <= endX; x += step) {
        const phase = x * freq - t * (0.9 * speed)
        const yTop = cy + Math.sin(phase) * amp
        const yBot = cy - Math.sin(phase) * amp
        top.push({ x, y: yTop, phase })
        bot.push({ x, y: yBot, phase })
      }

      ctx.strokeStyle = `rgba(${rgb}, 0.18)`
      ctx.lineWidth = 1
      for (let i = 0; i < top.length; i++) {
        ctx.beginPath()
        ctx.moveTo(top[i].x, top[i].y)
        ctx.lineTo(bot[i].x, bot[i].y)
        ctx.stroke()
      }

      ctx.strokeStyle = color
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      top.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()

      ctx.beginPath()
      bot.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()

      for (let i = 0; i < top.length; i++) {
        if (Math.abs(Math.sin(top[i].phase)) < 0.05) {
          ctx.beginPath()
          ctx.arc(top[i].x, cy, 3.2, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }
      }

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [width, height, color, speed])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'block',
        width: '100%',
        height: `${height}px`,
        pointerEvents: 'none',
      }}
    />
  )
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}
