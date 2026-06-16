import { useEffect, useRef } from 'react'

const COLORS = ['#d946ef', '#22c55e', '#818cf8', '#ffffff', '#f59e0b', '#38bdf8']

export default function Confetti({ trigger }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)

  useEffect(() => {
    if (!trigger) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 130 }, () => ({
      x:       Math.random() * canvas.width,
      y:       -20 - Math.random() * 120,
      w:       6  + Math.random() * 8,
      h:       4  + Math.random() * 6,
      color:   COLORS[Math.floor(Math.random() * COLORS.length)],
      vx:      (Math.random() - 0.5) * 5,
      vy:      2  + Math.random() * 5,
      angle:   Math.random() * Math.PI * 2,
      spin:    (Math.random() - 0.5) * 0.25,
      opacity: 1,
    }))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false

      for (const p of particles) {
        p.x     += p.vx
        p.y     += p.vy
        p.vy    += 0.1
        p.angle += p.spin
        if (p.y > canvas.height * 0.65) p.opacity -= 0.025
        if (p.opacity > 0) alive = true

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.fillStyle   = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }

      if (alive) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(animate)

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [trigger])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  )
}
