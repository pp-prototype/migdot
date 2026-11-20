import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSoundEffect } from './useSoundEffect'
import barkSound from './audio/bgm-dog-bark.mp3'
import { sceneHeight, sceneWidth } from './scene'

function animateDogWalk(canvas: HTMLCanvasElement, fetching: boolean) {
  const context = canvas.getContext('2d')
  if (!context) return
  const ctx = context
  ctx.setTransform(2, 0, 0, 2, 0, 0)

  function paint(color: string, shape: Path2D) {
    ctx.fillStyle = color
    ctx.fill(shape)
  }

  const fur = new Path2D('M-14 8 L-19 2 L-17 -6 L-20 -10 L-13 -14 L-10 -22 L-3 -20 L4 -24 L12 -20 L18 -15 L16 -8 L20 -4 L18 4 L21 9 L15 12 L12 18 L5 15 L-1 18 L-7 15 L-14 17 Z')
  const spitzHead = new Path2D('M-12 -14 L-13 -31 L-4 -24 Q3 -27 9 -26 L17 -35 L17 -18 Q15 -10 6 -7 Q-5 -7 -12 -14 Z')
  const corgiBody = new Path2D('M-18 -15 Q-9 -21 7 -20 Q17 -19 21 -11 L24 5 Q24 15 13 18 Q6 21 1 15 Q-6 20 -17 15 Q-22 10 -21 3 Z')
  const corgiHead = new Path2D('M-12 -16 L-17 -33 Q-18 -40 -13 -39 L-3 -30 Q4 -33 12 -30 L22 -38 Q27 -41 24 -33 L21 -16 Q14 -12 3 -12 Z')
  const spitzTail = new Path2D('M-1 10 Q-15 11 -17 2 Q-23 -9 -14 -15 Q-4 -20 1 -11 Q-8 -12 -8 -7 Q-8 -1 3 3 Z')
  const corgiTail = new Path2D('M8 9 Q22 5 23 -9 Q28 -13 29 -8 Q30 4 19 13 L10 15 Z')
  const glove = new Path2D('M-21 25 L-17 9 Q-17 1 -10 -2 L2 -7 Q9 -11 17 -8 Q21 -3 15 2 L10 5 Q16 8 12 13 L7 17 Q10 20 4 25 Z')
  const capCrown = new Path2D('M-11 4 Q-11 -8 -3 -10 Q7 -12 10 -1 L10 5 Z')
  const capBrim = new Path2D('M-5 4 Q7 2 17 5 Q21 8 12 10 Q3 12 -5 7 Z')
  const spitzFace = new Path2D('M-17 -17 L-18 -31 Q-17 -34 -14 -30 L-8 -25 Q0 -29 8 -25 L15 -32 Q17 -34 18 -30 L17 -17 L21 -13 L17 -10 L15 -6 Q0 1 -15 -6 L-18 -10 L-21 -13 Z')
  const corgiFace = new Path2D('M-16 -21 L-20 -33 Q-22 -42 -17 -40 Q-12 -38 -7 -28 Q0 -31 7 -28 Q12 -38 17 -40 Q22 -42 20 -33 L16 -21 Q21 -14 15 -9 Q9 -5 0 -6 Q-9 -5 -15 -9 Q-21 -14 -16 -21 Z')
  const corgiBlaze = new Path2D('M-3 -29 Q-1 -26 0 -24 Q2 -27 3 -29 L6 -20 Q14 -17 13 -11 Q7 -6 0 -7 Q-7 -6 -13 -11 Q-14 -17 -6 -20 Z')
  const nose = new Path2D('M-3.3 -16 Q0 -18 3.3 -16 Q3.8 -14 0 -12.7 Q-3.8 -14 -3.3 -16 Z')

  function ellipse(color: string, x: number, y: number, rx: number, ry: number) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawLeash(fromX: number, fromY: number, toX: number, toY: number, color: string) {
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.quadraticCurveTo((fromX + toX) / 2 + 8, (fromY + toY) / 2 - 2, toX, toY)
    ctx.lineWidth = 2.7
    ctx.strokeStyle = '#191820'
    ctx.stroke()
    ctx.lineWidth = 1.25
    ctx.strokeStyle = color
    ctx.stroke()
  }

  function dog(x: number, y: number, size: number, step: number, isSpitz: boolean, facing: boolean, carrying: boolean, barking: boolean) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(size, size)
    ellipse('#39282e91', 0, 24, isSpitz ? 19 : 24, 6)
    for (const side of [-1, 1]) {
      const stride = Math.sin(step + (side === 1 ? Math.PI : 0))
      ellipse(isSpitz ? '#aaa7ad' : '#764b3c', side * 10, -4 - stride * 3, 4.5, 8)
      ellipse(isSpitz ? '#dfd9d1' : '#d2a37a', side * 11, 16 + stride * 5, isSpitz ? 4.4 : 5.5, isSpitz ? 8 : 7)
      ellipse(isSpitz ? '#f0e9dc' : '#f1d7b3', side * 11.5, 20 + stride * 5, isSpitz ? 4.1 : 5.2, 3)
    }
    if (isSpitz) {
      if (!facing) {
        paint('#eee5d7', spitzHead)
        ellipse('#a59ba0', -9, -24, 2.2, 4.3)
        ellipse('#a59ba0', 14, -28, 2.1, 4.2)
      }
      paint('#d7cdd3', fur)
      ellipse('#faf0dc', 0, -1, 15, 14)
      ellipse('#e9dfd8', 5, 9, 11, 7)
      ellipse('#6b737f', 2, -13, 13, 3)
    } else {
      if (!facing) {
        paint('#c08256', corgiHead)
        ellipse('#724637', -11, -32, 3.4, 6)
        ellipse('#724637', 20, -32, 3.2, 6)
      }
      paint('#a36345', corgiBody)
      ellipse('#c58754', -2, 3, 18, 11)
      ellipse('#ebcfaf', 0, -12, 17, 5)
      ellipse('#ba6255', 1, -14, 15, 2.5)
    }
    ctx.save()
    ctx.rotate(Math.sin(step * .48) * .15)
    paint(isSpitz ? '#f8ebd7' : '#96543a', isSpitz ? spitzTail : corgiTail)
    ctx.restore()
    if (facing) {
      paint(isSpitz ? '#ded6d5' : '#a96d49', isSpitz ? spitzFace : corgiFace)
      for (const side of [-1, 1]) {
        ellipse(isSpitz ? '#a28c97' : '#83524a', side * 15, isSpitz ? -25 : -32, 2.6, isSpitz ? 3.5 : 5)
        ellipse(isSpitz ? '#f3ebde' : '#cc9667', side * 10, -17, 8, 7)
      }
      if (!isSpitz) paint('#f2dcc2', corgiBlaze)
      ellipse(isSpitz ? '#e8d6c9' : '#e2c19e', 0, -13, 9, 5)
      ellipse(isSpitz ? '#fff3e5' : '#f6e0c6', 0, -15, 7, 3.5)
      for (const side of [-1, 1]) {
        ellipse(isSpitz ? '#c5a9a4' : '#96644b', side * 8, -23.5, 2.4, 1)
        ellipse('#30252c', side * 7.4, -20.5, 2, 1.85)
        ellipse('#fff2d8', side * 7.4 - .55, -21.1, .6, .55)
      }
      paint('#3c2d35', nose)
      ellipse('#a8908e', -.8, -15.8, 1, .43)
      ellipse('#50343a', 0, barking ? -9.2 : -10.6, barking ? 4.4 : 3.4, barking ? 2.8 : .85)
      if (barking) ellipse('#b9797a', 0, -8.3, 2.1, 1)
      if (carrying) {
        ctx.save()
        ctx.translate(4, -10)
        ctx.rotate(-.16)
        paint('#2e68b7', capCrown)
        paint('#173d79', capBrim)
        ctx.fillStyle = '#eef6ff'
        ctx.font = 'bold 6px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('NBA', 0, 1)
        ctx.restore()
      }
    }
    ctx.restore()
  }

  function frame(time: number) {
    ctx.clearRect(0, 0, sceneWidth, sceneHeight)
    const step = time / 138
    const pace = Math.sin(time / 1000) * 5
    const small = { x: 196 + Math.sin(time / 560) * 3, y: 177 - pace + Math.sin(step * 2) * 1.4 }
    const large = { x: 282 + Math.sin(time / 620) * 4, y: 188 - pace + Math.sin(step * 2 + .8) * 1.7 }
    const handY = 231 + Math.sin(step) * 1.8
    const facing = fetching && time >= 240 && time < 2670
    const approach = fetching
      ? Math.max(0, Math.min(1, (time - 350) / 1250, (3200 - time) / 950))
      : 0
    small.x += approach * 10
    small.y += approach * 14
    large.x -= approach * 24
    large.y += approach * 30

    const barking = fetching && time >= 730 && time < 1220 && (time - 730) % 160 < 75
    dog(small.x, small.y, .78 + approach * .1, step, true, facing, false, barking)
    dog(large.x, large.y, 1.12 + approach * .16, step + .75, false, facing, fetching && time >= 720 && time < 2250, false)
    drawLeash(228, handY, small.x, small.y - 10, '#9db2a6')
    drawLeash(238, handY + 2, large.x, large.y - 15, '#bf7967')

    ctx.save()
    ctx.translate(227, handY)
    paint('#342d37', glove)
    ellipse('#b48a72', 2, 1, 15, 5)
    ellipse('#d0a88c', 3, -1, 13, 3)
    ellipse('#5b4145', 10, 4, 5, 2)
    ctx.restore()
  }

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let animation = 0
  let startedAt: number | undefined
  function tick(now: number) {
    startedAt ??= now
    frame(now - startedAt)
    animation = requestAnimationFrame(tick)
  }
  function syncMotion() {
    cancelAnimationFrame(animation)
    startedAt = undefined
    frame(motion.matches && fetching ? 1600 : 0)
    if (!motion.matches) animation = requestAnimationFrame(tick)
  }
  syncMotion()
  motion.addEventListener('change', syncMotion)
  return () => {
    cancelAnimationFrame(animation)
    motion.removeEventListener('change', syncMotion)
  }
}

export default function AutumnDogWalk({ hatAcquired, treatStyle, onFetchHat }: {
  hatAcquired: boolean
  treatStyle: CSSProperties
  onFetchHat: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pendingBarks = useRef<number[]>([])
  const fetchTimers = useRef<number[]>([])
  const [fetching, setFetching] = useState(false)
  const { audioRef, play } = useSoundEffect(400)

  useEffect(() => {
    const timers = pendingBarks.current
    const delivery = fetchTimers.current
    return () => [...timers, ...delivery].forEach(timer => window.clearTimeout(timer))
  }, [])

  function bark(count: number, interval: number, rate: number) {
    const timers = pendingBarks.current
    timers.forEach(timer => window.clearTimeout(timer))
    timers.length = 0
    if (audioRef.current) audioRef.current.playbackRate = rate
    play()
    for (let index = 1; index < count; index++) {
      timers.push(window.setTimeout(play, index * interval))
    }
  }
  useEffect(() => {
    if (canvas.current) return animateDogWalk(canvas.current, fetching)
  }, [fetching])

  function fetchHat() {
    if (fetching || hatAcquired) return
    setFetching(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    fetchTimers.current.push(
      window.setTimeout(() => bark(3, 160, 1.5), reduced ? 80 : 730),
      window.setTimeout(onFetchHat, reduced ? 1250 : 2250),
      window.setTimeout(() => setFetching(false), reduced ? 1450 : 3200),
    )
  }

  return <>
    <canvas className="autumn-dog-walk" width={sceneWidth * 2} height={sceneHeight * 2}
      ref={canvas} role="img" aria-label="두 리드줄 앞에서 걷는 작은 흰 스피츠와 큰 갈색 웰시코기" />
    <audio ref={audioRef} src={barkSound} preload="auto" />
    <button className="autumn-dog-touch autumn-dog-spitz" type="button" aria-label="작은 흰 스피츠"
      onClick={() => bark(4, 330, 1.24)} />
    <button className="autumn-dog-touch autumn-dog-corgi" type="button" aria-label="큰 갈색 웰시코기"
      onClick={() => bark(3, 530, 1)} />
    {!hatAcquired && !fetching && <button type="button" className="autumn-dog-treat" style={treatStyle}
      aria-label="떨어지는 뼈 모양 강아지 간식 잡기" onClick={fetchHat}>
      <span aria-hidden="true"><i /><i /></span>
    </button>}
  </>
}
