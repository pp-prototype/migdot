import { constellationText } from './text'
import { useState } from 'react'
import AutumnPlushBox from './AutumnPlushBox'

const stars = [
  { x: 50, y: 42 },
  { x: 60, y: 31 },
  { x: 71, y: 42 },
  { x: 65, y: 56 },
  { x: 50, y: 71 },
  { x: 35, y: 56 },
  { x: 29, y: 42 },
  { x: 40, y: 31 },
]

export default function AutumnConstellation({ collected, onComplete }: { collected: boolean; onComplete: () => void }) {
  const [path, setPath] = useState<number[]>([])
  if (collected && !path.length) return null

  function connect(index: number) {
    if (collected || path.includes(index)) return
    const previous = path.at(-1)
    if (previous !== undefined) {
      const distance = Math.abs(previous - index)
      if (distance !== 1 && distance !== stars.length - 1) return
    }
    const next = [...path, index]
    setPath(next)
    if (next.length === stars.length) onComplete()
  }

  return <div className="autumn-constellation">
    <canvas className="autumn-constellation-lines" width={1000} height={1000} aria-hidden="true" ref={canvas => {
      const ctx = canvas?.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, 1000, 1000)
      ctx.beginPath()
      path.forEach((index, position) => {
        const { x, y } = stars[index]
        if (position === 0) ctx.moveTo(x * 10, y * 10)
        else ctx.lineTo(x * 10, y * 10)
      })
      if (path.length === stars.length) ctx.closePath()
      ctx.lineWidth = 4
      ctx.strokeStyle = '#c8e8ff'
      ctx.stroke()
    }} />
    {stars.map(({ x, y }, index) => <button type="button" key={index} className="autumn-constellation-star"
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={constellationText.star(index + 1)} disabled={path.includes(index) || collected}
      onClick={() => connect(index)}><span style={{ animationDelay: `${index * -.32}s` }} aria-hidden="true">✦</span></button>)}
    {collected && <div className="autumn-constellation-reward" role="img" aria-label={constellationText.reward}>
      <AutumnPlushBox />
    </div>}
  </div>
}
