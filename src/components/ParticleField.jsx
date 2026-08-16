import React, { useEffect, useRef } from 'react'

/**
 * 背景粒子特效：星光 / 樱花 / 金尘
 * 纯 Canvas 绘制，轻量不卡界面
 */
export default function ParticleField({ type = 'none', density = 60 }) {
  const ref = useRef(null)

  useEffect(() => {
    if (type === 'none') return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf = null
    let particles = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = {
      stars: ['#ffffff', '#ffe9b0', '#cfe0ff'],
      sakura: ['#ffb7d5', '#ff8fbf', '#ffd1e5', '#ff9ec7'],
      ember: ['#ffd27f', '#ffb347', '#ff944d', '#ffe9b0'],
    }
    const palette = colors[type] || colors.stars
    const count = density

    // 粒子：x y 速度 大小 透明度 相位
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: type === 'sakura' ? 0.4 + Math.random() * 0.6 : (Math.random() - 0.5) * 0.25,
        size: type === 'sakura' ? 2.5 + Math.random() * 3 : 0.8 + Math.random() * 1.8,
        alpha: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: type === 'stars' ? 0.01 : 0.02 + Math.random() * 0.02,
        color: palette[Math.floor(Math.random() * palette.length)],
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.02,
      })
    }

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const t = Date.now() / 1000
      particles.forEach((p) => {
        p.phase += p.speed
        if (type === 'stars') {
          // 星光：原地闪烁 + 极慢漂移
          p.x += p.vx * 0.3
          p.y += p.vy * 0.3
          if (p.x < 0) p.x = canvas.width
          if (p.x > canvas.width) p.x = 0
          if (p.y < 0) p.y = canvas.height
          if (p.y > canvas.height) p.y = 0
          const a = p.alpha * (0.6 + 0.4 * Math.sin(p.phase * 2))
          ctx.globalAlpha = a
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // 樱花/金尘：飘落或上浮 + 旋转
          p.x += p.vx + Math.sin(p.phase) * 0.3
          p.y += p.vy
          p.rot += p.rotV
          if (p.y > canvas.height + 10) {
            p.y = -10
            p.x = Math.random() * canvas.width
          }
          if (p.y < -10 && type === 'ember') {
            p.y = canvas.height + 10
            p.x = Math.random() * canvas.width
          }
          if (p.x < -10) p.x = canvas.width + 10
          if (p.x > canvas.width + 10) p.x = -10
          ctx.globalAlpha = p.alpha * (0.7 + 0.3 * Math.sin(p.phase))
          ctx.fillStyle = p.color
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          if (type === 'sakura') {
            // 花瓣：小椭圆
            ctx.beginPath()
            ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2)
            ctx.fill()
          } else {
            ctx.beginPath()
            ctx.arc(0, 0, p.size, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()
        }
      })
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [type, density])

  if (type === 'none') return null
  return <canvas ref={ref} className="particle-field" />
}
